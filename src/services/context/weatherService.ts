import axios from 'axios';
import { createLogger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import type { WeatherContext } from '../../types';

const log = createLogger('weatherService');

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
}

/**
 * Fetches current weather from Open-Meteo (free, no API key) so captions can be
 * weather-aware (e.g. "Rainy day = hot coffee weather").
 */
export class WeatherService {
  constructor(
    private readonly lat: number,
    private readonly lon: number,
  ) {}

  /** Returns current weather, or undefined if the lookup fails (never throws). */
  async getCurrent(): Promise<WeatherContext | undefined> {
    try {
      const response = await withRetry(
        () =>
          axios.get<OpenMeteoResponse>('https://api.open-meteo.com/v1/forecast', {
            params: {
              latitude: this.lat,
              longitude: this.lon,
              current: 'temperature_2m,weather_code',
            },
            timeout: 8000,
          }),
        { retries: 2, label: 'open-meteo:current' },
      );

      const current = response.data.current;
      if (!current || typeof current.temperature_2m !== 'number') {
        return undefined;
      }

      const code = current.weather_code ?? 0;
      return {
        temperatureC: current.temperature_2m,
        description: describeWeatherCode(code),
        isRaining: isRainCode(code),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Weather lookup failed, continuing without it: ${message}`);
      return undefined;
    }
  }
}

/** Maps WMO weather codes to short human descriptions. */
function describeWeatherCode(code: number): string {
  if (code === 0) return 'clear skies';
  if (code <= 3) return 'partly cloudy';
  if (code <= 48) return 'foggy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowy';
  if (code <= 82) return 'rain showers';
  if (code <= 99) return 'thunderstorms';
  return 'mixed weather';
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
}
