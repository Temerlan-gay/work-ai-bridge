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

/** Predefined skill catalog used as fallback before DB loads. */
export const SKILL_CATALOG = [
  "Web Development",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "UI/UX Design",
  "Graphic Design",
  "Mobile App Development",
  "Python",
  "JavaScript",
  "React",
  "Vue.js",
  "FastAPI",
  "AI Development",
  "Copywriting",
  "Translation",
  "Video Editing",
  "3D Modeling",
  "Game Development",
  "Marketing",
  "SEO",
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "not_available", label: "Not available" },
] as const;