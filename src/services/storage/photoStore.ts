import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger';
import type { PagePhotoRecord } from '../../types';

const log = createLogger('photoStore');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'pagePhotos.json');

/** File-backed cache of Facebook Page photos and their Vision tags. */
export class PhotoStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    if (!fsSync.existsSync(DATA_DIR)) {
      fsSync.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(DATA_FILE)) {
      fsSync.writeFileSync(DATA_FILE, '[]', 'utf-8');
    }
  }

  async readAll(): Promise<PagePhotoRecord[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as PagePhotoRecord[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to read pagePhotos.json: ${message}`);
      return [];
    }
  }

  async upsertMany(photos: PagePhotoRecord[]): Promise<void> {
    await this.enqueueWrite(async () => {
      const existing = await this.readAll();
      const byId = new Map(existing.map((p) => [p.id, p]));

      for (const photo of photos) {
        const current = byId.get(photo.id);
        byId.set(photo.id, current ? { ...current, ...photo } : photo);
      }

      await this.persist([...byId.values()]);
    });
  }

  async update(id: string, patch: Partial<PagePhotoRecord>): Promise<PagePhotoRecord | null> {
    let updated: PagePhotoRecord | null = null;
    await this.enqueueWrite(async () => {
      const photos = await this.readAll();
      const index = photos.findIndex((p) => p.id === id);
      if (index === -1) {
        return;
      }
      updated = { ...photos[index], ...patch } as PagePhotoRecord;
      photos[index] = updated;
      await this.persist(photos);
    });
    return updated;
  }

  async findUntagged(): Promise<PagePhotoRecord[]> {
    const photos = await this.readAll();
    return photos.filter((p) => !p.taggedAt || p.tags.length === 0);
  }

  private async persist(photos: PagePhotoRecord[]): Promise<void> {
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(photos, null, 2), 'utf-8');
    await fs.rename(tmp, DATA_FILE);
  }

  private enqueueWrite(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task, task);
    return this.writeChain;
  }
}
