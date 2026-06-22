import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createLogger } from '../../utils/logger';
import { buildMessages } from './promptBuilder';
import { CAPTION_MAX_WORDS, CAPTION_MIN_WORDS } from './contentLimits';
import type { GeneratedContent, PostContext, PostLanguage, RestaurantProfile } from '../../types';

const log = createLogger('openaiService');

/**
 * Total generation attempts. Each failed attempt re-prompts the model with the
 * validation error so it can self-correct (e.g. expand a too-short caption).
 */
const MAX_ATTEMPTS = 5;

export interface GenerateInput {
  profile: RestaurantProfile;
  topic: string;
  context: PostContext;
  includeImagePrompt: boolean;
}

interface RawAiContent {
  caption?: unknown;
  callToAction?: unknown;
  hashtags?: unknown;
  imagePrompt?: unknown;
}

/** Wraps the OpenAI SDK to produce validated, structured post content. */
export class OpenAIService {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly postLanguage: PostLanguage,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates one post's content. On each failed attempt the validation error
   * is fed back to the model as corrective feedback so it can fix issues such
   * as a caption that is too short, retrying up to MAX_ATTEMPTS times.
   */
  async generateContent(input: GenerateInput): Promise<GeneratedContent> {
    const { system, user } = buildMessages({
      profile: input.profile,
      topic: input.topic,
      context: input.context,
      includeImagePrompt: input.includeImagePrompt,
      postLanguage: this.postLanguage,
    });

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.85,
          response_format: { type: 'json_object' },
          messages,
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
          throw new Error('OpenAI returned an empty response.');
        }

        return this.parseAndValidate(text, input.includeImagePrompt);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        log.warn(`generateContent attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`);

        if (attempt < MAX_ATTEMPTS) {
          messages.push({
            role: 'user',
            content: buildRetryPrompt(message),
          });
        }
      }
    }

    log.error(`All ${MAX_ATTEMPTS} generateContent attempts failed.`);
    throw lastError instanceof Error ? lastError : new Error('OpenAI content generation failed.');
  }

  private parseAndValidate(text: string, includeImagePrompt: boolean): GeneratedContent {
    let parsed: RawAiContent;
    try {
      parsed = JSON.parse(text) as RawAiContent;
    } catch {
      throw new Error('OpenAI response was not valid JSON.');
    }

    const caption = typeof parsed.caption === 'string' ? parsed.caption.trim() : '';
    const callToAction = typeof parsed.callToAction === 'string' ? parsed.callToAction.trim() : '';
    const hashtags = normalizeHashtags(parsed.hashtags);

    if (!caption) {
      throw new Error('Generated content is missing a caption.');
    }
    if (!callToAction) {
      throw new Error('Generated content is missing a call-to-action.');
    }
    if (hashtags.length !== 5) {
      throw new Error(`Expected 5 hashtags but received ${hashtags.length}.`);
    }

    const wordCount = countWords(caption);
    if (wordCount < CAPTION_MIN_WORDS || wordCount > CAPTION_MAX_WORDS) {
      throw new Error(
        `Caption length ${wordCount} words is outside the ${CAPTION_MIN_WORDS}-${CAPTION_MAX_WORDS} range.`,
      );
    }

    const result: GeneratedContent = { caption, callToAction, hashtags };
    if (includeImagePrompt && typeof parsed.imagePrompt === 'string' && parsed.imagePrompt.trim()) {
      result.imagePrompt = parsed.imagePrompt.trim();
    }

    log.debug(`Generated caption with ${wordCount} words.`);
    return result;
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Gives the model a specific fix instruction based on what failed validation. */
function buildRetryPrompt(errorMessage: string): string {
  const lengthMatch = /Caption length (\d+) words/.exec(errorMessage);
  const wordCount = lengthMatch ? Number(lengthMatch[1]) : 0;

  if (wordCount > 0 && wordCount < CAPTION_MIN_WORDS) {
    const needed = CAPTION_MIN_WORDS - wordCount;
    return [
      `Too short — only ${wordCount} words. Add about ${needed} more words, casually.`,
      'Expand with real details: kitchen moment, staff story, customer regular, or why you love the dish.',
      'Stay Taglish and human. No marketing words. Exactly 5 hashtags. STRICT JSON only.',
    ].join(' ');
  }

  if (wordCount > CAPTION_MAX_WORDS) {
    return [
      `Too long — ${wordCount} words. Trim to under ${CAPTION_MAX_WORDS}.`,
      'Keep the casual owner voice. Cut filler, not personality. Exactly 5 hashtags. STRICT JSON only.',
    ].join(' ');
  }

  return [
    `Rejected: ${errorMessage}.`,
    `Rewrite as the restaurant owner — casual Taglish, not marketing copy.`,
    `Caption ${CAPTION_MIN_WORDS}-${CAPTION_MAX_WORDS} words, exactly 5 hashtags. STRICT JSON only.`,
  ].join(' ');
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((h): h is string => typeof h === 'string')
    .map((h) => {
      const cleaned = h.trim().replace(/\s+/g, '');
      return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    })
    .filter((h) => h.length > 1)
    .slice(0, 5);
}
