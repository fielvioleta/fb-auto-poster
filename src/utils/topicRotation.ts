import { isWeekend } from './datetime';

export interface TopicSelectionInput {
  allTopics: string[];
  usedRecently: Set<string>;
  timezone: string;
  /** Optional date override (mainly for testing). */
  date?: Date;
}

/**
 * Picks the next topic to post about.
 *
 * Rules:
 *  - Never repeat a topic used within the lookback window (caller supplies the set).
 *  - On weekends, prefer "Weekend Specials" if it is still available.
 *  - If every topic has been used recently, fall back to the least-recently set
 *    by simply choosing the first topic not in the used set, or the first topic.
 */
export function selectTopic(input: TopicSelectionInput): string {
  const { allTopics, usedRecently, timezone, date } = input;

  if (allTopics.length === 0) {
    throw new Error('No topics configured.');
  }

  const available = allTopics.filter((t) => !usedRecently.has(t));

  // Weekend preference.
  if (isWeekend(timezone, date)) {
    const weekendTopic = available.find((t) => t.toLowerCase().includes('weekend'));
    if (weekendTopic) {
      return weekendTopic;
    }
  }

  if (available.length > 0) {
    // Deterministic-ish rotation: pick based on day-of-year to spread topics.
    const dayIndex = dayOfYear(date ?? new Date());
    return available[dayIndex % available.length] as string;
  }

  // Everything used recently — degrade gracefully.
  return allTopics[0] as string;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
