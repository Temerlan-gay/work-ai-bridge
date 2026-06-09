import { z } from "zod";

export const AiFeatureSchema = z.enum([
  "freelancer_matching",
  "project_feed",
  "natural_language_search",
  "project_generator",
  "profile_advisor",
  "resume_assistant",
  "chat_assistant",
  "price_estimator",
  "reputation_system",
  "scam_detection",
  "confirmation",
]);

export type AiFeature = z.infer<typeof AiFeatureSchema>;

export const ProjectDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requirements: z.array(z.string()).default([]),
  timeline: z.string().default(""),
  budgetEstimate: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currency: z.string().default("USD"),
  }),
  skills: z.array(z.string()).default([]),
});

export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;

export const SearchFiltersSchema = z.object({
  query: z.string().default(""),
  category: z.string().optional(),
  skills: z.array(z.string()).default([]),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  timeline: z.string().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const ConfirmationDecisionSchema = z.enum(["accepted", "rejected", "manual_edit"]);
