import { randomUUID } from 'crypto';
import { createLogger } from '../../utils/logger';
import { selectTopic } from '../../utils/topicRotation';
import { formatMessage } from '../../utils/messageFormatter';
import { isWeekend, localDateString } from '../../utils/datetime';
import type { PostContext, RestaurantProfile, StoredPost } from '../../types';
import type { PostStore } from '../storage/postStore';
import type { OpenAIService } from '../openai/openaiService';
import type { FacebookService } from '../facebook/facebookService';
import type { WeatherService } from '../context/weatherService';
import type { HolidayService } from '../context/holidayService';
import type { PhotoLibraryService } from '../photos/photoLibraryService';
import { recentlyUsedPhotoIds } from '../photos/photoLibraryService';

const log = createLogger('contentService');

/** Number of days a topic must "rest" before it can be reused. */
const TOPIC_LOOKBACK_DAYS = 30;

export interface ContentServiceDeps {
  profile: RestaurantProfile;
  store: PostStore;
  openai: OpenAIService;
  facebook: FacebookService;
  weather?: WeatherService;
  holiday?: HolidayService;
  timezone: string;
  includeImagePrompt: boolean;
  photoLibrary?: PhotoLibraryService;
}

/**
 * Orchestrates the full content lifecycle: choose a topic, gather context,
 * generate copy, persist it, and (optionally) publish to Facebook.
 */
export class ContentService {
  constructor(private readonly deps: ContentServiceDeps) {}

  /** Generates and stores one post as a draft. Returns the stored record. */
  async generatePost(): Promise<StoredPost> {
    const { profile, store, openai, timezone, includeImagePrompt } = this.deps;

    const usedRecently = await store.topicsUsedWithin(TOPIC_LOOKBACK_DAYS);
    const topic = selectTopic({ allTopics: profile.topics, usedRecently, timezone });
    log.info(`Selected topic "${topic}" (avoiding ${usedRecently.size} recent topics).`);

    const context = await this.buildContext();

    const content = await openai.generateContent({
      profile,
      topic,
      context,
      includeImagePrompt,
    });

    const message = formatMessage(content);
    const post: StoredPost = {
      id: randomUUID(),
      topic,
      caption: content.caption,
      callToAction: content.callToAction,
      hashtags: content.hashtags,
      message,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      context,
      ...(content.imagePrompt ? { imagePrompt: content.imagePrompt } : {}),
    };

    const withPhoto = await this.attachPhoto(post);
    await store.add(withPhoto);
    log.info(`Stored draft post ${withPhoto.id}.`);
    return withPhoto;
  }

  /** Publishes an existing stored post by id. */
  async publishPost(id: string): Promise<StoredPost> {
    const { store, facebook } = this.deps;
    const post = await store.findById(id);
    if (!post) {
      throw new Error(`Post ${id} not found.`);
    }
    if (post.status === 'published') {
      log.warn(`Post ${id} is already published; skipping.`);
      return post;
    }

    const ready = post.imageUrl ? post : await this.attachPhoto(post);
    if (!post.imageUrl && ready.imageUrl) {
      await store.update(id, {
        imageUrl: ready.imageUrl,
        facebookPhotoId: ready.facebookPhotoId,
      });
    }

    try {
      const result = ready.imageUrl
        ? await facebook.publishPhoto(ready.message, ready.imageUrl)
        : await facebook.publishMessage(ready.message);

      const updated = await store.update(id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        facebookPostId: result.facebookPostId,
        error: undefined,
      });
      log.info(
        `Post ${id} published as ${result.facebookPostId}${ready.imageUrl ? ' (with photo)' : ''}.`,
      );
      return updated ?? post;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to publish post ${id}: ${message}`);
      const updated = await store.update(id, { status: 'failed', error: message });
      return updated ?? post;
    }
  }

  /** Convenience for the scheduler: generate then publish in one step. */
  async generateAndPublish(): Promise<StoredPost> {
    const draft = await this.generatePost();
    return this.publishPost(draft.id);
  }

  private async buildContext(): Promise<PostContext> {
    const { timezone, weather, holiday } = this.deps;
    const localDate = localDateString(timezone);

    const context: PostContext = {
      isWeekend: isWeekend(timezone),
      localDate,
    };

    if (weather) {
      const current = await weather.getCurrent();
      if (current) {
        context.weather = current;
      }
    }
    if (holiday) {
      const today = await holiday.getHolidayFor(localDate);
      if (today) {
        context.holiday = today;
      }
    }

    return context;
  }

  /** Syncs the Page photo library and attaches the best match for the topic. */
  private async attachPhoto(post: StoredPost): Promise<StoredPost> {
    const { photoLibrary, store } = this.deps;
    if (!photoLibrary) {
      return post;
    }

    try {
      await photoLibrary.prepareLibrary();
      const history = await store.readAll();
      const usedIds = recentlyUsedPhotoIds(history);
      const pick = await photoLibrary.pickPhotoForTopic(post.topic, usedIds);

      if (!pick) {
        log.warn(`No photo matched topic "${post.topic}"; posting will be text-only.`);
        return post;
      }

      log.info(`Attached photo ${pick.photo.id} to post (${pick.reason}).`);
      return {
        ...post,
        imageUrl: pick.photo.imageUrl,
        facebookPhotoId: pick.photo.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Photo matching failed, continuing text-only: ${message}`);
      return post;
    }
  }
}
