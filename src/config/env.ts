import dotenv from 'dotenv';
import { parsePostLanguage } from './postLanguage';
import type { PostLanguage } from '../types';

dotenv.config();

/** Reads a required environment variable, throwing if it is missing. */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

/** Reads an optional environment variable with a fallback default. */
function optionalEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function boolEnv(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value.trim().toLowerCase() === 'true';
}

function numberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface AppConfig {
  port: number;
  logLevel: string;
  timezone: string;
  /** Caption language style: english | taglish | tagalog */
  postLanguage: PostLanguage;
  openai: {
    apiKey: string;
    model: string;
  };
  facebook: {
    pageId: string;
    accessToken: string;
    graphVersion: string;
  };
  scheduler: {
    enabled: boolean;
    cronSchedule: string;
    autoPublish: boolean;
  };
  features: {
    weatherEnabled: boolean;
    holidayEnabled: boolean;
    imagePromptEnabled: boolean;
    pagePhotosEnabled: boolean;
    pagePhotosMax: number;
  };
  location: {
    lat: number;
    lon: number;
    holidayCountryCode: string;
  };
}

let cachedConfig: AppConfig | null = null;

/**
 * Loads and validates application configuration from the environment.
 * The result is cached so validation only runs once per process.
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    port: numberEnv('PORT', 3000),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),
    timezone: optionalEnv('TIMEZONE', 'Asia/Manila'),
    postLanguage: parsePostLanguage(process.env.POST_LANGUAGE),
    openai: {
      apiKey: requireEnv('OPENAI_API_KEY'),
      model: optionalEnv('OPENAI_MODEL', 'gpt-4o-mini'),
    },
    facebook: {
      pageId: requireEnv('FACEBOOK_PAGE_ID'),
      accessToken: requireEnv('FACEBOOK_ACCESS_TOKEN'),
      graphVersion: optionalEnv('FACEBOOK_GRAPH_VERSION', 'v21.0'),
    },
    scheduler: {
      enabled: boolEnv('SCHEDULER_ENABLED', true),
      cronSchedule: optionalEnv('CRON_SCHEDULE', '0 11 * * *'),
      autoPublish: boolEnv('AUTO_PUBLISH', true),
    },
    features: {
      weatherEnabled: boolEnv('WEATHER_ENABLED', true),
      holidayEnabled: boolEnv('HOLIDAY_ENABLED', true),
      imagePromptEnabled: boolEnv('IMAGE_PROMPT_ENABLED', true),
      pagePhotosEnabled: boolEnv('PAGE_PHOTOS_ENABLED', true),
      pagePhotosMax: numberEnv('PAGE_PHOTOS_MAX', 50),
    },
    location: {
      lat: numberEnv('RESTAURANT_LAT', 14.5995),
      lon: numberEnv('RESTAURANT_LON', 120.9842),
      holidayCountryCode: optionalEnv('HOLIDAY_COUNTRY_CODE', 'PH'),
    },
  };

  return cachedConfig;
}
