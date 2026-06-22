import { createLogger } from '../../utils/logger';
import type { MonthlyAnalytics, StoredPost } from '../../types';
import type { PostStore } from '../storage/postStore';

const log = createLogger('analyticsService');

/** Computes simple monthly analytics from the stored post history. */
export class AnalyticsService {
  constructor(private readonly store: PostStore) {}

  /** Returns analytics grouped by YYYY-MM, newest month first. */
  async monthly(): Promise<MonthlyAnalytics[]> {
    const posts = await this.store.readAll();
    const byMonth = new Map<string, StoredPost[]>();

    for (const post of posts) {
      const month = post.generatedAt.slice(0, 7);
      const bucket = byMonth.get(month) ?? [];
      bucket.push(post);
      byMonth.set(month, bucket);
    }

    const result: MonthlyAnalytics[] = [];
    for (const [month, monthPosts] of byMonth.entries()) {
      result.push(this.summarize(month, monthPosts));
    }

    result.sort((a, b) => b.month.localeCompare(a.month));
    log.debug(`Computed analytics for ${result.length} months.`);
    return result;
  }

  /** Returns analytics for a single month (YYYY-MM). */
  async forMonth(month: string): Promise<MonthlyAnalytics> {
    const posts = await this.store.readAll();
    const monthPosts = posts.filter((p) => p.generatedAt.startsWith(month));
    return this.summarize(month, monthPosts);
  }

  private summarize(month: string, posts: StoredPost[]): MonthlyAnalytics {
    const totalGenerated = posts.length;
    const totalPublished = posts.filter((p) => p.status === 'published').length;
    const totalFailed = posts.filter((p) => p.status === 'failed').length;

    const topicBreakdown: Record<string, number> = {};
    for (const post of posts) {
      topicBreakdown[post.topic] = (topicBreakdown[post.topic] ?? 0) + 1;
    }

    const successRate =
      totalGenerated === 0 ? 0 : Math.round((totalPublished / totalGenerated) * 100);

    return { month, totalGenerated, totalPublished, totalFailed, topicBreakdown, successRate };
  }
}
