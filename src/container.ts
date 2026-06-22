import { loadConfig, type AppConfig } from './config/env';
import { restaurantProfile } from './config/restaurant';
import { PostStore } from './services/storage/postStore';
import { PhotoStore } from './services/storage/photoStore';
import { OpenAIService } from './services/openai/openaiService';
import { FacebookService } from './services/facebook/facebookService';
import { PagePhotoFetcher } from './services/facebook/pagePhotoFetcher';
import { WeatherService } from './services/context/weatherService';
import { HolidayService } from './services/context/holidayService';
import { PhotoVisionService } from './services/photos/photoVisionService';
import { PhotoLibraryService } from './services/photos/photoLibraryService';
import { ContentService } from './services/content/contentService';
import { AnalyticsService } from './services/analytics/analyticsService';

/**
 * Application composition root. Builds and wires all services once, then hands
 * out shared instances. This keeps construction in a single place (DIP-friendly).
 */
export interface Container {
  config: AppConfig;
  store: PostStore;
  facebook: FacebookService;
  content: ContentService;
  analytics: AnalyticsService;
  photoLibrary?: PhotoLibraryService;
}

let container: Container | null = null;

export function getContainer(): Container {
  if (container) {
    return container;
  }

  const config = loadConfig();
  const store = new PostStore();
  const openai = new OpenAIService(config.openai.apiKey, config.openai.model, config.postLanguage);
  const facebook = new FacebookService({
    pageId: config.facebook.pageId,
    accessToken: config.facebook.accessToken,
    graphVersion: config.facebook.graphVersion,
  });

  let photoLibrary: PhotoLibraryService | undefined;
  if (config.features.pagePhotosEnabled) {
    const photoStore = new PhotoStore();
    const photoFetcher = new PagePhotoFetcher({
      pageId: config.facebook.pageId,
      accessToken: config.facebook.accessToken,
      graphVersion: config.facebook.graphVersion,
    });
    const photoVision = new PhotoVisionService(
      config.openai.apiKey,
      config.openai.model,
      config.facebook.accessToken,
      config.facebook.graphVersion,
    );
    photoLibrary = new PhotoLibraryService({
      fetcher: photoFetcher,
      store: photoStore,
      vision: photoVision,
      openaiApiKey: config.openai.apiKey,
      openaiModel: config.openai.model,
      menuNames: restaurantProfile.menu.map((m) => m.name),
      maxPhotosToFetch: config.features.pagePhotosMax,
    });
  }

  const weather = config.features.weatherEnabled
    ? new WeatherService(config.location.lat, config.location.lon)
    : undefined;
  const holiday = config.features.holidayEnabled
    ? new HolidayService(config.location.holidayCountryCode)
    : undefined;

  const content = new ContentService({
    profile: restaurantProfile,
    store,
    openai,
    facebook,
    weather,
    holiday,
    timezone: config.timezone,
    includeImagePrompt: config.features.imagePromptEnabled,
    photoLibrary,
  });

  const analytics = new AnalyticsService(store);

  container = { config, store, facebook, content, analytics, photoLibrary };
  return container;
}
