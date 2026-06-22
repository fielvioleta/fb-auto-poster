import OpenAI from 'openai';
import axios from 'axios';
import { createLogger } from '../../utils/logger';
import { downloadImageAsDataUrl } from '../../utils/imageDownload';
import { withRetry } from '../../utils/retry';

const log = createLogger('photoVisionService');

export interface PhotoTagResult {
  description: string;
  tags: string[];
  menuItems: string[];
}

interface RawTagResponse {
  description?: unknown;
  tags?: unknown;
  menuItems?: unknown;
}

interface GraphImageSize {
  source?: string;
  width?: number;
}

interface GraphPhotoResponse {
  images?: GraphImageSize[];
}

/**
 * Uses OpenAI Vision to describe and tag a Facebook Page photo once.
 * Images are downloaded locally first because Facebook CDN blocks OpenAI.
 */
export class PhotoVisionService {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly facebookAccessToken: string,
    private readonly graphVersion: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async tagPhoto(photoId: string, imageUrl: string, menuNames: string[]): Promise<PhotoTagResult> {
    const menuList = menuNames.join(', ');
    const image = await this.loadImage(photoId, imageUrl);
    log.debug(`Loaded image for tagging (${image.sizeBytes} bytes).`);

    return withRetry(
      async () => {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: [
                    'You are labeling photos for a restaurant Facebook Page.',
                    `Restaurant menu: ${menuList}.`,
                    'Look at this photo and respond with STRICT JSON:',
                    '{',
                    '  "description": "1 short sentence of what is in the photo",',
                    '  "tags": ["5-8 lowercase keywords about the photo"],',
                    '  "menuItems": ["menu item names visible, from the list only, or empty array"]',
                    '}',
                    'Be factual. Only list menu items you can clearly see.',
                  ].join('\n'),
                },
                {
                  type: 'image_url',
                  image_url: { url: image.dataUrl, detail: 'low' },
                },
              ],
            },
          ],
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
          throw new Error('Vision API returned empty content.');
        }

        return parseTagResponse(text, menuNames);
      },
      { retries: 2, label: 'openai:tagPhoto' },
    );
  }

  /** Tries the CDN URL first, then refreshes via the Graph API if needed. */
  private async loadImage(
    photoId: string,
    imageUrl: string,
  ): Promise<{ dataUrl: string; sizeBytes: number }> {
    try {
      return await downloadImageAsDataUrl(imageUrl, this.facebookAccessToken);
    } catch (firstError) {
      const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
      log.warn(`CDN download failed for ${photoId}, trying Graph API: ${firstMessage}`);

      const freshUrl = await this.fetchFreshImageUrl(photoId);
      if (!freshUrl) {
        throw firstError;
      }

      return downloadImageAsDataUrl(freshUrl, this.facebookAccessToken);
    }
  }

  private async fetchFreshImageUrl(photoId: string): Promise<string | null> {
    const url = `https://graph.facebook.com/${this.graphVersion}/${photoId}`;
    const response = await axios.get<GraphPhotoResponse>(url, {
      params: { fields: 'images', access_token: this.facebookAccessToken },
      timeout: 15000,
    });

    const images = response.data.images ?? [];
    const sorted = images
      .filter((img) => typeof img.source === 'string')
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

    return sorted[0]?.source ?? null;
  }
}

function parseTagResponse(text: string, menuNames: string[]): PhotoTagResult {
  let parsed: RawTagResponse;
  try {
    parsed = JSON.parse(text) as RawTagResponse;
  } catch {
    throw new Error('Vision response was not valid JSON.');
  }

  const description =
    typeof parsed.description === 'string' ? parsed.description.trim() : 'Restaurant photo';
  const tags = normalizeStringArray(parsed.tags, 8);
  const menuItems = normalizeMenuItems(parsed.menuItems, menuNames);

  log.debug(`Tagged photo: ${description} [${tags.join(', ')}]`);
  return { description, tags, menuItems };
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
    .slice(0, max);
}

function normalizeMenuItems(value: unknown, menuNames: string[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set(menuNames.map((n) => n.toLowerCase()));
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => allowed.has(item.toLowerCase()));
}
