import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger';
import type { StoredPost } from '../../types';

const log = createLogger('postStore');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'posts.json');

/**
 * File-backed JSON store for generated posts. A simple in-process write lock
 * (promise chaining) keeps concurrent writes from corrupting the file.
 */
export class PostStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    if (!fsSync.existsSync(DATA_DIR)) {
      fsSync.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fsSync.existsSync(DATA_FILE)) {
      fsSync.writeFileSync(DATA_FILE, '[]', 'utf-8');
    }
  }

  /** Reads all stored posts, returning an empty array on a corrupt/empty file. */
  async readAll(): Promise<StoredPost[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        log.warn('posts.json did not contain an array; resetting to empty.');
        return [];
      }
      return parsed as StoredPost[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to read posts.json: ${message}`);
      return [];
    }
  }

  /** Appends a post, serializing writes to avoid races. */
  async add(post: StoredPost): Promise<void> {
    await this.enqueueWrite(async () => {
      const posts = await this.readAll();
      posts.push(post);
      await this.persist(posts);
    });
  }

  /** Updates an existing post in place by id. */
  async update(id: string, patch: Partial<StoredPost>): Promise<StoredPost | null> {
    let updated: StoredPost | null = null;
    await this.enqueueWrite(async () => {
      const posts = await this.readAll();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) {
        return;
      }
      updated = { ...posts[index], ...patch } as StoredPost;
      posts[index] = updated;
      await this.persist(posts);
    });
    return updated;
  }

  /** Finds a single post by id. */
  async findById(id: string): Promise<StoredPost | null> {
    const posts = await this.readAll();
    return posts.find((p) => p.id === id) ?? null;
  }

  /** Returns the most recently generated posts, newest first. */
  async recent(limit = 50): Promise<StoredPost[]> {
    const posts = await this.readAll();
    return posts
      .slice()
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, limit);
  }

  /** Returns topics used within the last `days` days (for rotation/dedup). */
  async topicsUsedWithin(days: number): Promise<Set<string>> {
    const posts = await this.readAll();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const used = new Set<string>();
    for (const post of posts) {
      if (new Date(post.generatedAt).getTime() >= cutoff) {
        used.add(post.topic);
      }
    }
    return used;
  }

  private async persist(posts: StoredPost[]): Promise<void> {
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(posts, null, 2), 'utf-8');
    await fs.rename(tmp, DATA_FILE);
  }

  private enqueueWrite(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task, task);
    return this.writeChain;
  }
}
