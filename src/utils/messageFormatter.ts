import type { GeneratedContent } from '../types';

/**
 * Combines the AI's caption, call-to-action, and hashtags into the final string
 * posted to Facebook.
 */
export function formatMessage(content: GeneratedContent): string {
  const parts = [content.caption.trim(), content.callToAction.trim(), content.hashtags.join(' ')];
  return parts.filter((p) => p.length > 0).join('\n\n');
}
