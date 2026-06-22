import axios, { AxiosError } from 'axios';
import { createLogger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';

const log = createLogger('facebookService');

export interface FacebookConfig {
  pageId: string;
  accessToken: string;
  graphVersion: string;
}

export interface PublishResult {
  facebookPostId: string;
}

interface GraphPostResponse {
  id?: string;
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

/** Thin client around the Meta Graph API for publishing Page feed posts. */
export class FacebookService {
  private readonly baseUrl: string;

  constructor(private readonly config: FacebookConfig) {
    this.baseUrl = `https://graph.facebook.com/${config.graphVersion}`;
  }

  /**
   * Publishes a text message to the Page feed. Retries up to 3 times with
   * exponential backoff. Throws only after all attempts fail.
   */
  async publishMessage(message: string): Promise<PublishResult> {
    const url = `${this.baseUrl}/${this.config.pageId}/feed`;

    return withRetry(
      async () => {
        try {
          const response = await axios.post<GraphPostResponse>(url, null, {
            params: {
              message,
              access_token: this.config.accessToken,
            },
            timeout: 15000,
          });

          const id = response.data.id;
          if (!id) {
            throw new Error('Graph API did not return a post id.');
          }
          log.info(`Published Facebook post ${id}.`);
          return { facebookPostId: id };
        } catch (error) {
          throw normalizeGraphError(error);
        }
      },
      { retries: 3, label: 'facebook:publishMessage' },
    );
  }

  /**
   * Publishes a post with a photo by URL. Useful when pairing with an
   * AI-generated image hosted somewhere public.
   */
  async publishPhoto(message: string, imageUrl: string): Promise<PublishResult> {
    const url = `${this.baseUrl}/${this.config.pageId}/photos`;

    return withRetry(
      async () => {
        try {
          const response = await axios.post<GraphPostResponse>(url, null, {
            params: {
              caption: message,
              url: imageUrl,
              access_token: this.config.accessToken,
            },
            timeout: 20000,
          });
          const id = response.data.id;
          if (!id) {
            throw new Error('Graph API did not return a photo post id.');
          }
          return { facebookPostId: id };
        } catch (error) {
          throw normalizeGraphError(error);
        }
      },
      { retries: 3, label: 'facebook:publishPhoto' },
    );
  }

  /** Verifies the token/page are reachable (used by the health check). */
  async verifyConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/${this.config.pageId}`, {
        params: { fields: 'id,name', access_token: this.config.accessToken },
        timeout: 10000,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Facebook connection check failed: ${message}`);
      return false;
    }
  }
}

/** Converts an Axios/Graph error into a clean Error with a useful message. */
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
