import axios from 'axios';
import { withRetry } from './retry';

export interface DownloadedImage {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Downloads an image and returns a base64 data URL for OpenAI Vision.
 * Facebook CDN blocks OpenAI's servers, so we fetch the bytes ourselves.
 */
export async function downloadImageAsDataUrl(
  imageUrl: string,
  accessToken?: string,
): Promise<DownloadedImage> {
  return withRetry(
    async () => {
      const response = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 15 * 1024 * 1024,
        headers: {
          'User-Agent': 'restaurant-fb-autopost/1.0',
          Accept: 'image/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const buffer = Buffer.from(response.data);
      if (buffer.length === 0) {
        throw new Error('Downloaded image was empty.');
      }

      const mimeType = resolveMimeType(
        typeof response.headers['content-type'] === 'string'
          ? response.headers['content-type']
          : undefined,
        buffer,
      );
      const base64 = buffer.toString('base64');
      return {
        dataUrl: `data:${mimeType};base64,${base64}`,
        mimeType,
        sizeBytes: buffer.length,
      };
    },
    { retries: 3, label: 'downloadImage' },
  );
}

function resolveMimeType(contentType: string | undefined, buffer: Buffer): string {
  if (contentType) {
    const mime = contentType.split(';')[0]?.trim().toLowerCase();
    if (mime && mime.startsWith('image/')) {
      return mime;
    }
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49) {
    return 'image/webp';
  }

  return 'image/jpeg';
}
