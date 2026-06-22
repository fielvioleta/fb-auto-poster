import type { RestaurantProfile } from '../types';

/**
 * The single source of truth for who the restaurant is, what it sells, and how
 * it speaks. Editing this file is all that is required to re-target the bot.
 *
 * NOTE: Replace `name` and `tagline` with the real restaurant details.
 * In a multi-client SaaS setup (see README roadmap), this object would instead
 * be loaded per tenant from a database.
 */
export const restaurantProfile: RestaurantProfile = {
  name: 'Daily Wings & Cafe',
  tagline: 'Wings, pasta, burgers — chill spot sa Dasmariñas.',

  menu: [
    {
      name: 'Chicken Wings',
      description: 'Crispy wings, iba-ibang sauce. Best seller namin to.',
    },
    {
      name: 'Pasta',
      description: 'Masarap na pasta, mabubusog ka talaga.',
    },
    {
      name: 'Burgers',
      description: 'Malaki, juicy, messy pero worth it.',
    },
    {
      name: 'Fries',
      description: 'Crispy fries, perfect side or solo snack.',
    },
    {
      name: 'Coffee',
      description: 'Fresh brew, pang-start ng araw or pang-hapon.',
    },
  ],

  brandVoice: {
    tone: [
      'Casual',
      'Parang kausap mo lang sa FB',
      'Taglish',
      'Warm',
      'Hindi formal',
      'Hindi parang ads',
    ],
    audience: ['Families', 'Students', 'Young professionals', 'Food lovers', 'Barkada'],
    guardrails: [
      'Never invent discounts.',
      'Never invent promos or prices.',
      'Only promote menu items that actually exist (wings, pasta, burgers, fries, coffee).',
      'Do not make claims about awards, ratings, or partnerships.',
      'Never sound like a marketing agency or AI assistant.',
      'No corporate buzzwords (crafted, indulge, elevate, culinary journey, etc.).',
    ],
  },

  // Topics rotated daily. The rotation logic avoids repeating a topic within 30 days.
  topics: [
    'Chicken Wings',
    'Pasta',
    'Burgers',
    'Fries',
    'Coffee',
    'Combo Meals',
    'Customer Reviews',
    'Weekend Specials',
    'Trivia',
    'Food Facts',
    'Behind the Scenes',
    'Staff Appreciation',
    'Promo Ideas',
  ],
};
