import type { PostLanguage } from '../types';

/** Caption language style definitions for generated Facebook posts. */
export interface LanguageStyle {
  label: string;
  voiceLines: string[];
  example: string;
  ctaExamples: string[];
  weatherExample: string;
}

const STYLES: Record<PostLanguage, LanguageStyle> = {
  english: {
    label: 'Pure English',
    voiceLines: [
      '- Write the entire caption and call-to-action in English only.',
      '- Casual, friendly, like a local restaurant owner posting on Facebook.',
      '- Short sentences. Sound human, not like an ad or press release.',
      '- You can say things like: "hey guys", "just made a fresh batch", "swing by later", "tag your friends".',
    ],
    example:
      '"Hey guys, we just fried a fresh batch of wings in the kitchen 😅 Smells amazing in here. Our wings are still the crowd favorite — crispy outside, juicy inside. Perfect for movie night or after class. Burgers and pasta have their regulars too. If you\'re hungry, come visit. We\'re open!"',
    ctaExamples: ['"Swing by later!"', '"Message us if you want to order."'],
    weatherExample: '"Hot day today — iced coffee hits different."',
  },
  taglish: {
    label: 'Taglish (English + Tagalog mix)',
    voiceLines: [
      '- Mix English and Tagalog naturally (Taglish). This should feel like a normal Pinoy business owner on Facebook.',
      '- Short sentences are fine. Imperfect grammar is OK.',
      '- You can say things like: "uy", "grabe", "sulit", "try niyo", "open na kami", "kain tayo", "tag your barkada".',
      '- Do not force English words where Tagalog flows better, and vice versa.',
    ],
    example:
      '"Uy guys, kanina sa kitchen grabe yung amoy ng wings 😅 Fresh from the fryer pa. Wings talaga bestseller namin — crispy sa labas, juicy sa loob. Perfect pang movie night or after class. Pasta at burgers din may mga regulars na. Kung gutom ka ngayon, punta ka na. Open kami!"',
    ctaExamples: ['"Punta kayo later!"', '"Message us kung gusto niyo mag-order."'],
    weatherExample: '"Mainit today — perfect for iced coffee."',
  },
  tagalog: {
    label: 'Tagalog',
    voiceLines: [
      '- Isulat ang buong caption at call-to-action sa Tagalog.',
      '- Casual at natural — parang may-ari ng restaurant na nagpo-post sa Facebook.',
      '- Maikling pangungusap ay OK. Huwag masyadong pormal o parang advertisement.',
      '- Pwede mong gamitin: "uy", "grabe", "sulit", "try niyo", "bukas na kami", "kain tayo", "i-tag ang barkada niyo".',
      '- Iwasan ang masyadong deep Tagalog na parang textbook. Dapat conversational.',
    ],
    example:
      '"Uy guys, kanina sa kitchen grabe amoy ng wings 😅 Kakaluto lang, may staff pa nga agad kumuha ng Buffalo. Wings pa rin bestseller namin — crispy sa labas, juicy sa loob. Swak sa movie night o after class. May regulars din sa pasta at burgers. Kung gutom ka ngayon, punta ka na. Bukas kami!"',
    ctaExamples: ['"Punta kayo mamaya!"', '"Message lang kung gusto niyo mag-order."'],
    weatherExample: '"Mainit ngayon — swak sa iced coffee."',
  },
};

/** Parses POST_LANGUAGE from env. Defaults to taglish. */
export function parsePostLanguage(value: string | undefined): PostLanguage {
  const normalized = (value ?? 'taglish').trim().toLowerCase();
  if (normalized === 'english' || normalized === 'taglish' || normalized === 'tagalog') {
    return normalized;
  }
  return 'taglish';
}

export function getLanguageStyle(language: PostLanguage): LanguageStyle {
  return STYLES[language];
}
