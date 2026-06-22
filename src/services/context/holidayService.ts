import axios from 'axios';
import { createLogger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import type { HolidayContext } from '../../types';

const log = createLogger('holidayService');

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
}

/**
 * Looks up public holidays from date.nager.at (free, no API key) so posts can be
 * holiday-aware (e.g. greet customers on Independence Day).
 */
export class HolidayService {
  private cache: { year: number; holidays: NagerHoliday[] } | null = null;

  constructor(private readonly countryCode: string) {}

  /** Returns today's holiday for the given local date, if any. Never throws. */
  async getHolidayFor(localDate: string): Promise<HolidayContext | undefined> {
    try {
      const year = Number(localDate.slice(0, 4));
      const holidays = await this.getHolidays(year);
      const match = holidays.find((h) => h.date === localDate);
      if (!match) {
        return undefined;
      }
      return {
        name: match.name,
        localName: match.localName,
        date: match.date,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Holiday lookup failed, continuing without it: ${message}`);
      return undefined;
    }
  }

  private async getHolidays(year: number): Promise<NagerHoliday[]> {
    if (this.cache && this.cache.year === year) {
      return this.cache.holidays;
    }

    const response = await withRetry(
      () =>
        axios.get<NagerHoliday[]>(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${this.countryCode}`,
          { timeout: 8000 },
        ),
      { retries: 2, label: 'nager:holidays' },
    );

    const holidays = Array.isArray(response.data) ? response.data : [];
    this.cache = { year, holidays };
    return holidays;
  }
}
