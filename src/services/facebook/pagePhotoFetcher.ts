import axios, { AxiosError } from 'axios';
import { createLogger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import type { FacebookConfig } from './facebookService';

const log = createLogger('pagePhotoFetcher');

export interface FetchedPagePhoto {
  id: string;
  imageUrl: string;
  permalink?: string;
  createdTime?: string;
}

interface GraphImageSize {
  source?: string;
  width?: number;
  height?: number;
}

interface GraphPhotoNode {
  id?: string;
  images?: GraphImageSize[];
  link?: string;
  created_time?: string;
}

interface GraphPhotosResponse {
  data?: GraphPhotoNode[];
  paging?: {
    next?: string;
  };
}

interface GraphErrorBody {
  error?: {
    message?: string;
  };
}

/** Fetches uploaded photos from a Facebook Page via the Graph API. */
export class PagePhotoFetcher {
  private readonly baseUrl: string;

  constructor(private readonly config: FacebookConfig) {
    this.baseUrl = `https://graph.facebook.com/${config.graphVersion}`;
  }

  /**
   * Returns photos uploaded by the Page, newest first.
   * Stops after `limit` photos or when pagination ends.
   */
  async fetchUploadedPhotos(limit = 50): Promise<FetchedPagePhoto[]> {
    const photos: FetchedPagePhoto[] = [];
    let url: string | null =
      `${this.baseUrl}/${this.config.pageId}/photos?type=uploaded&fields=id,images,link,created_time&limit=25&access_token=${encodeURIComponent(this.config.accessToken)}`;

    while (url && photos.length < limit) {
      const page = await this.fetchPage(url);
      for (const node of page.nodes) {
        if (photos.length >= limit) {
          break;
        }
        const parsed = parsePhotoNode(node);
        if (parsed) {
          photos.push(parsed);
        }
      }
      url = page.nextUrl;
    }

    log.info(`Fetched ${photos.length} photos from Facebook Page.`);
    return photos;
  }

  private async fetchPage(
    url: string,
  ): Promise<{ nodes: GraphPhotoNode[]; nextUrl: string | null }> {
    const response = await withRetry(
      async () => {
        try {
          return await axios.get<GraphPhotosResponse>(url, { timeout: 20000 });
        } catch (error) {
          throw normalizeGraphError(error);
        }
      },
      { retries: 3, label: 'facebook:fetchPagePhotos' },
    );

    return {
      nodes: response.data.data ?? [],
      nextUrl: response.data.paging?.next ?? null,
    };
  }
}

function parsePhotoNode(node: GraphPhotoNode): FetchedPagePhoto | null {
  const id = node.id;
  const imageUrl = pickLargestImageUrl(node.images);
  if (!id || !imageUrl) {
    return null;
  }

  return {
    id,
    imageUrl,
    ...(node.link ? { permalink: node.link } : {}),
    ...(node.created_time ? { createdTime: node.created_time } : {}),
  };
}

function pickLargestImageUrl(images: GraphImageSize[] | undefined): string | null {
  if (!images || images.length === 0) {
    return null;
  }
  const sorted = images
    .filter((img) => typeof img.source === 'string')
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.source ?? null;
}

function normalizeGraphError(error: unknown): Error {
  if (error instanceof AxiosError) {
    const body = error.response?.data as GraphErrorBody | undefined;
    const graphMessage = body?.error?.message;
    if (graphMessage) {
      return new Error(`Graph API error: ${graphMessage}`);
    }
    return new Error(`Graph API request failed: ${error.message}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}
