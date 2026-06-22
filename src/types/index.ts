/**
 * Shared domain types for the restaurant Facebook auto-post application.
 */

/** Caption language: english | taglish | tagalog (set via POST_LANGUAGE in .env). */
export type PostLanguage = 'english' | 'taglish' | 'tagalog';

/** A single menu item the restaurant actually sells. */
export interface MenuItem {
  name: string;
  description: string;
}

/** Brand voice configuration used to steer the AI. */
export interface BrandVoice {
  tone: string[];
  audience: string[];
  /** Hard rules the AI must never break (e.g. never invent discounts). */
  guardrails: string[];
}

/** Full restaurant profile that drives content generation. */
export interface RestaurantProfile {
  name: string;
  tagline: string;
  menu: MenuItem[];
  brandVoice: BrandVoice;
  /** Topic categories that are rotated daily. */
  topics: string[];
}

/** Optional contextual signals that enrich a post. */
export interface PostContext {
  weather?: WeatherContext;
  holiday?: HolidayContext;
  isWeekend: boolean;
  /** Local date string (YYYY-MM-DD) in the configured timezone. */
  localDate: string;
}

export interface WeatherContext {
  description: string;
  temperatureC: number;
  isRaining: boolean;
}

export interface HolidayContext {
  name: string;
  localName: string;
  date: string;
}

/** The structured content returned by the AI generator. */
export interface GeneratedContent {
  caption: string;
  callToAction: string;
  hashtags: string[];
  /** Optional AI-generated prompt that could be fed to an image model. */
  imagePrompt?: string;
}

/** A photo from the restaurant's Facebook Page, tagged once by Vision AI. */
export interface PagePhotoRecord {
  id: string;
  imageUrl: string;
  permalink?: string;
  createdTime?: string;
  /** Short plain description of what's in the photo. */
  description: string;
  /** Keywords for matching (e.g. wings, pasta, restaurant interior). */
  tags: string[];
  /** Menu items visible in the photo, if any. */
  menuItems: string[];
  taggedAt?: string;
  fetchedAt: string;
}

export type PostStatus = 'draft' | 'published' | 'failed';

/** A post persisted to data/posts.json. */
export interface StoredPost {
  id: string;
  topic: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
  imagePrompt?: string;
  /** Public URL of the Facebook Page photo attached to this post. */
  imageUrl?: string;
  /** Facebook photo id from the Page library. */
  facebookPhotoId?: string;
  /** Final text actually sent to Facebook (caption + CTA + hashtags). */
  message: string;
  status: PostStatus;
  /** ISO timestamp the post was generated. */
  generatedAt: string;
  /** ISO timestamp the post was published (if it was). */
  publishedAt?: string;
  /** Facebook post id once published. */
  facebookPostId?: string;
  /** Error message if publishing failed. */
  error?: string;
  context?: PostContext;
}

/** Aggregated analytics for a single month. */
export interface MonthlyAnalytics {
  month: string;
  totalGenerated: number;
  totalPublished: number;
  totalFailed: number;
  topicBreakdown: Record<string, number>;
  successRate: number;
}
