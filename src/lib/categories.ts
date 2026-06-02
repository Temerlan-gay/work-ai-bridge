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

export const SPECIALIZATIONS = [
  "Fullstack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Mobile Developer",
  "UI/UX Designer",
  "Graphic Designer",
  "Product Designer",
  "Marketer",
  "SMM Manager",
  "Copywriter",
  "Video Editor",
  "Motion Designer",
  "Translator",
  "Photographer",
  "QA Engineer",
  "DevOps Engineer",
  "Data Analyst",
  "Project Manager",
  "Other",
] as const;