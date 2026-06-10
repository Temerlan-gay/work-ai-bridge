export type AiMatchBotId =
  | "tech_lead"
  | "budget_guard"
  | "startup_speed"
  | "quality_first"
  | "mentor_match"
  | "enterprise_risk";

export interface AiMatchBot {
  id: AiMatchBotId;
  name: string;
  role: string;
  quality: string;
  prompt: string;
}

export const AI_MATCH_BOTS: AiMatchBot[] = [
  {
    id: "tech_lead",
    name: "Tech Lead Bot",
    role: "Strict technical matcher",
    quality: "Checks stack fit, seniority, and delivery realism.",
    prompt: "Prioritize exact technical skill overlap, proven delivery, and realistic timelines.",
  },
  {
    id: "budget_guard",
    name: "Budget Guard Bot",
    role: "Cost-aware recruiter",
    quality: "Finds the best fit inside a practical budget.",
    prompt: "Prioritize candidates or projects where budget, rate, and scope are aligned.",
  },
  {
    id: "startup_speed",
    name: "Startup Speed Bot",
    role: "Fast launch matcher",
    quality: "Looks for availability, speed, and broad practical skills.",
    prompt: "Prioritize availability, recent activity, broad full-stack skills, and fast delivery.",
  },
  {
    id: "quality_first",
    name: "Quality First Bot",
    role: "Premium quality matcher",
    quality: "Ranks by reviews, portfolio strength, and completion history.",
    prompt: "Prioritize ratings, completed work, review quality, portfolio relevance, and low risk.",
  },
  {
    id: "mentor_match",
    name: "Mentor Match Bot",
    role: "Growth-friendly advisor",
    quality: "Good for juniors, learning projects, and flexible clients.",
    prompt: "Prioritize adjacent skills, growth potential, clear communication, and flexible requirements.",
  },
  {
    id: "enterprise_risk",
    name: "Enterprise Risk Bot",
    role: "Risk and reliability matcher",
    quality: "Looks for stability, professionalism, and suspicious-signal avoidance.",
    prompt: "Prioritize reliability, low scam risk, clear requirements, professional history, and stable activity.",
  },
];

export function getAiMatchBot(id: string | undefined): AiMatchBot {
  return AI_MATCH_BOTS.find((bot) => bot.id === id) ?? AI_MATCH_BOTS[0];
}
