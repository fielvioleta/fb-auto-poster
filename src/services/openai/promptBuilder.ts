import type { PostContext, PostLanguage, RestaurantProfile } from '../../types';
import { getLanguageStyle } from '../../config/postLanguage';
import { CAPTION_MAX_WORDS, CAPTION_MIN_WORDS } from './contentLimits';

export interface PromptBuildInput {
  profile: RestaurantProfile;
  topic: string;
  context: PostContext;
  includeImagePrompt: boolean;
  postLanguage: PostLanguage;
}

/**
 * Builds the system + user messages for content generation. The persona is the
 * restaurant owner typing a quick FB post on their phone — not a copywriter.
 */
export function buildMessages(input: PromptBuildInput): {
  system: string;
  user: string;
} {
  const { profile, topic, context, includeImagePrompt, postLanguage } = input;
  const lang = getLanguageStyle(postLanguage);

  const menuList = profile.menu.map((m) => `- ${m.name}: ${m.description}`).join('\n');
  const guardrails = profile.brandVoice.guardrails.map((g) => `- ${g}`).join('\n');

  const system = [
    `You ARE the owner of "${profile.name}", a small local restaurant in Dasmariñas.`,
    `You're posting on your Facebook Page from your phone — quick, real, casual.`,
    `Tagline (for context only, don't quote it verbatim): ${profile.tagline}`,
    '',
    `LANGUAGE (${lang.label}) — follow strictly:`,
    ...lang.voiceLines,
    '- Sound tired-but-happy, proud of your food, grateful to customers.',
    '',
    'Audience:',
    profile.brandVoice.audience.join(', '),
    '',
    'Menu (ONLY promote these):',
    menuList,
    '',
    'Hard rules — never break:',
    guardrails,
    '',
    'How to write (this is the most important part):',
    `- Caption: ${CAPTION_MIN_WORDS}–${CAPTION_MAX_WORDS} words. Short FB post — like a quick update from your phone.`,
    '- Often 30–70 words is enough. Say what you need, then stop. No need to pad.',
    '- Start with something real — a thought, a scene in the kitchen, what you ate today, a customer moment, the weather.',
    '- Use imperfect, human phrasing. Fragments OK. Not every sentence needs perfect grammar.',
    '- Be specific and grounded, not poetic or corporate.',
    "- 1–3 emojis max, placed naturally. Don't sprinkle them on every line.",
    `- callToAction: one short casual line. Examples: ${lang.ctaExamples.join(' or ')} — NOT formal marketing copy.`,
    '- Exactly 5 hashtags, simple and local (e.g. #DailyWings #DasmarinasFood). No hashtag spam in the caption itself.',
    '',
    'NEVER write like this (AI / marketing red flags):',
    '- "Craving something delicious?" / "Look no further!" / "Whether you\'re... or..."',
    '- "Indulge", "elevate", "crafted", "culinary", "perfect blend", "game changer", "nestled"',
    '- "We are thrilled to announce", "Experience the taste of", "Your taste buds will thank you"',
    '- Overly poetic food descriptions, bullet-point lists, or essay-style paragraphs',
    '- Sounding too polished, symmetrical, or like a press release',
    '',
    `GOOD example vibe for ${lang.label} (do NOT copy verbatim, just match the energy):`,
    lang.example,
    '',
    'Respond with STRICT JSON only:',
    '{',
    '  "caption": string,',
    '  "callToAction": string,',
    '  "hashtags": string[5],',
    includeImagePrompt ? '  "imagePrompt": string' : '  "imagePrompt": null',
    '}',
  ].join('\n');

  const contextLines: string[] = [
    `Topic for today's post: ${topic}`,
    `Date: ${context.localDate}`,
    `Language: ${lang.label}`,
    '',
    'Write one FB post as the owner. Make it feel human — like you typed it yourself in 2 minutes.',
  ];

  if (context.isWeekend) {
    contextLines.push("It's the weekend — barkada/family vibes, relaxed energy.");
  }
  if (context.weather) {
    contextLines.push(
      `Weather now: ${context.weather.description}, ~${Math.round(context.weather.temperatureC)}°C${
        context.weather.isRaining ? ', raining' : ''
      }. Mention it casually if it fits (e.g. ${lang.weatherExample}).`,
    );
  }
  if (context.holiday) {
    contextLines.push(
      `Holiday today: ${context.holiday.localName}. Greet customers naturally, don't make it a speech.`,
    );
  }
  if (includeImagePrompt) {
    contextLines.push(
      'Include "imagePrompt": a simple realistic photo description (food on a plate, restaurant setting) — not artistic or stock-photo language.',
    );
  }

  return { system, user: contextLines.join('\n') };
}
