export const CATEGORIES = [
  "Programming",
  "Design",
  "Marketing",
  "Copywriting",
  "Video editing",
  "Translation",
  "Photography",
  "Music & Audio",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const COUNTRIES = [
  "Russia",
  "Belarus",
  "Ukraine",
  "Kazakhstan",
  "Uzbekistan",
  "Armenia",
  "Azerbaijan",
  "Georgia",
  "Kyrgyzstan",
  "Moldova",
  "Tajikistan",
  "Turkmenistan",
  "Other",
] as const;