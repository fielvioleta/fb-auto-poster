import OpenAI from 'openai';
import { createLogger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import type { PagePhotoRecord } from '../../types';
import type { PagePhotoFetcher } from '../facebook/pagePhotoFetcher';
import type { PhotoStore } from '../storage/photoStore';
import type { PhotoVisionService } from './photoVisionService';

const log = createLogger('photoLibraryService');

/** Days before the same Page photo can be reused on a post. */
const PHOTO_REUSE_LOOKBACK_DAYS = 14;

export interface PhotoPickResult {
  photo: PagePhotoRecord;
  reason: string;
}

export interface PhotoLibraryDeps {
  fetcher: PagePhotoFetcher;
  store: PhotoStore;
  vision: PhotoVisionService;
  openaiApiKey: string;
  openaiModel: string;
  menuNames: string[];
  maxPhotosToFetch: number;
}

/**
 * Syncs photos from the Facebook Page, tags new ones with Vision once,
 * and uses AI to pick the best match for a post topic.
 */
export class PhotoLibraryService {
  private readonly pickerClient: OpenAI;

  constructor(private readonly deps: PhotoLibraryDeps) {
    this.pickerClient = new OpenAI({ apiKey: deps.openaiApiKey });
  }

  /** Fetches latest photos from Facebook and merges into the local cache. */
  async syncFromFacebook(): Promise<number> {
    const fetched = await this.deps.fetcher.fetchUploadedPhotos(this.deps.maxPhotosToFetch);
    const now = new Date().toISOString();

    const records: PagePhotoRecord[] = fetched.map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      description: '',
      tags: [],
      menuItems: [],
      fetchedAt: now,
      ...(photo.permalink ? { permalink: photo.permalink } : {}),
      ...(photo.createdTime ? { createdTime: photo.createdTime } : {}),
    }));

    await this.deps.store.upsertMany(records);
    log.info(`Synced ${records.length} photos into local cache.`);
    return records.length;
  }

  /** Vision-tags any photos in the cache that are not yet tagged. */
  async tagUntaggedPhotos(): Promise<number> {
    const untagged = await this.deps.store.findUntagged();
    if (untagged.length === 0) {
      return 0;
    }

    let tagged = 0;
    for (const photo of untagged) {
      try {
        const result = await this.deps.vision.tagPhoto(
          photo.id,
          photo.imageUrl,
          this.deps.menuNames,
        );
        await this.deps.store.update(photo.id, {
          description: result.description,
          tags: result.tags,
          menuItems: result.menuItems,
          taggedAt: new Date().toISOString(),
        });
        tagged += 1;
        log.info(`Tagged photo ${photo.id}: ${result.description}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn(`Failed to tag photo ${photo.id}: ${message}`);
      }
    }

    return tagged;
  }

  /** Returns cached photos without syncing Facebook. */
  async listCached(): Promise<PagePhotoRecord[]> {
    return this.deps.store.readAll();
  }

  /** Full sync + tag pipeline. Safe to call before each publish. */
  async prepareLibrary(): Promise<PagePhotoRecord[]> {
    await this.syncFromFacebook();
    await this.tagUntaggedPhotos();
    return this.deps.store.readAll();
  }

  /**
   * Picks the best photo for a topic, excluding recently used photo ids.
   * Returns null if no suitable photo exists (caller falls back to text-only).
   */
  async pickPhotoForTopic(
    topic: string,
    recentlyUsedPhotoIds: Set<string>,
  ): Promise<PhotoPickResult | null> {
    const all = await this.deps.store.readAll();
    const tagged = all.filter((p) => p.taggedAt && p.description);
    const candidates = tagged.filter((p) => !recentlyUsedPhotoIds.has(p.id));

    if (candidates.length === 0) {
      log.warn('No tagged photos available for matching.');
      return null;
    }

    const picked = await this.pickWithAi(topic, candidates);
    if (picked) {
      return picked;
    }

    return pickByKeyword(topic, candidates);
  }

  private async pickWithAi(
    topic: string,
    candidates: PagePhotoRecord[],
  ): Promise<PhotoPickResult | null> {
    const list = candidates
      .map(
        (p, i) =>
          `${i + 1}. id=${p.id} | ${p.description} | tags: ${p.tags.join(', ')} | menu: ${p.menuItems.join(', ') || 'none'}`,
      )
      .join('\n');

    try {
      const completion = await withRetry(
        () =>
          this.pickerClient.chat.completions.create({
            model: this.deps.openaiModel,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'Pick the single best Facebook photo for a restaurant post topic. Respond with STRICT JSON: {"photoId": string, "reason": string}.',
              },
              {
                role: 'user',
                content: `Post topic: "${topic}"\n\nPhotos:\n${list}\n\nPick the best match. Prefer photos that clearly show the food or vibe related to the topic.`,
              },
            ],
          }),
        { retries: 2, label: 'openai:pickPhoto' },
      );

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        return null;
      }

      const parsed = JSON.parse(text) as { photoId?: unknown; reason?: unknown };
      const photoId = typeof parsed.photoId === 'string' ? parsed.photoId : '';
      const reason = typeof parsed.reason === 'string' ? parsed.reason : 'AI selected best match';
      const photo = candidates.find((p) => p.id === photoId);
      if (!photo) {
        return null;
      }

      log.info(`AI picked photo ${photo.id} for topic "${topic}": ${reason}`);
      return { photo, reason };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`AI photo pick failed, using keyword fallback: ${message}`);
      return null;
    }
  }
}

/** Simple keyword overlap fallback when the AI picker fails. */
function pickByKeyword(topic: string, candidates: PagePhotoRecord[]): PhotoPickResult | null {
  const topicWords = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  let best: { photo: PagePhotoRecord; score: number } | null = null;
  for (const photo of candidates) {
    const haystack = [photo.description, ...photo.tags, ...photo.menuItems].join(' ').toLowerCase();

    let score = 0;
    for (const word of topicWords) {
      if (haystack.includes(word)) {
        score += 2;
      }
    }
    for (const item of photo.menuItems) {
      if (topic.toLowerCase().includes(item.toLowerCase())) {
        score += 5;
      }
    }

    if (!best || score > best.score) {
      best = { photo, score };
    }
  }

  if (!best || best.score === 0) {
    const fallback = candidates[0];
    if (!fallback) {
      return null;
    }
    return { photo: fallback, reason: 'No strong match; used most recent available photo.' };
  }

  return { photo: best.photo, reason: `Keyword match (score ${best.score}).` };
}

/** Builds a set of photo ids used within the lookback window from post history. */
export function recentlyUsedPhotoIds(
  posts: Array<{ facebookPhotoId?: string; generatedAt: string }>,
  lookbackDays = PHOTO_REUSE_LOOKBACK_DAYS,
): Set<string> {
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const used = new Set<string>();
  for (const post of posts) {
    if (!post.facebookPhotoId) {
      continue;
    }
    if (new Date(post.generatedAt).getTime() >= cutoff) {
      used.add(post.facebookPhotoId);
    }
  }
  return used;
}
