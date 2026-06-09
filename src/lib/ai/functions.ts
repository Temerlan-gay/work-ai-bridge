import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AiFeatureSchema,
  ConfirmationDecisionSchema,
  ProjectDraftSchema,
  SearchFiltersSchema,
} from "./schemas";

const JsonRecord = z.record(z.unknown());

const SYSTEM = `You are WorkBridge AI. You may analyze, recommend, rank, and suggest.
Never claim that you modified user data. For all generated edits, return suggestions only.
Return compact, valid JSON only.`;

const rateMemory = new Map<string, number[]>();

function checkRateLimit(userId: string, feature: string) {
  const key = `${userId}:${feature}`;
  const now = Date.now();
  const windowMs = 60_000;
  const hits = (rateMemory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= 20) throw new Error("AI rate limit reached. Please try again in a minute.");
  hits.push(now);
  rateMemory.set(key, hits);
}

async function logAiAction(ctx: any, feature: string, action: string, input: unknown, output: unknown) {
  const { summarizeForLog } = await import("./gemini.server");
  await ctx.supabase.from("ai_action_logs").insert({
    user_id: ctx.userId,
    feature,
    action,
    input_summary: summarizeForLog(input),
    output_summary: summarizeForLog(output),
    metadata: {},
  });
}

async function runAi<T>(ctx: any, feature: string, action: string, prompt: string, fallback: T) {
  checkRateLimit(ctx.userId, feature);
  const { generateJson } = await import("./gemini.server");
  const output = await generateJson<T>(SYSTEM, prompt, fallback);
  await logAiAction(ctx, feature, action, prompt, output);
  return output;
}

export const aiNaturalLanguageSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ query: z.string().min(2).max(500), mode: z.enum(["projects", "freelancers"]).default("projects") }))
  .handler(async ({ data, context }) => {
    const fallback = { query: data.query, category: undefined, skills: [] };
    const result = await runAi(
      context,
      "natural_language_search",
      "parse_filters",
      `Convert this ${data.mode} search into filters: ${data.query}. JSON shape: { "query": string, "category": string|null, "skills": string[], "minBudget": number|null, "maxBudget": number|null, "timeline": string|null }`,
      fallback,
    );
    return SearchFiltersSchema.partial().parse(result);
  });

export const aiGenerateProjectDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ brief: z.string().min(10).max(4000), category: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const fallback = {
      title: "New project",
      description: data.brief,
      requirements: [],
      timeline: "To be discussed",
      budgetEstimate: { min: 100, max: 500, currency: "USD" },
      skills: [],
    };
    const result = await runAi(
      context,
      "project_generator",
      "generate_project_draft",
      `Generate a freelancer marketplace project draft from this brief. Category: ${data.category ?? "unknown"}. Brief: ${data.brief}. JSON shape: {title, description, requirements: string[], timeline, budgetEstimate:{min,max,currency}, skills:string[]}.`,
      fallback,
    );
    return ProjectDraftSchema.parse(result);
  });

export const aiProfileAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ profile: JsonRecord }))
  .handler(async ({ data, context }) => {
    return runAi(context, "profile_advisor", "suggest_profile_improvements", `Analyze this freelancer profile and suggest improvements. Return {betterBio:string, missingSkills:string[], portfolioImprovements:string[], headline:string}. Profile: ${JSON.stringify(data.profile)}`, {
      betterBio: "",
      missingSkills: [],
      portfolioImprovements: [],
      headline: "",
    });
  });

export const aiResumeAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ resumeText: z.string().min(20).max(12000) }))
  .handler(async ({ data, context }) => {
    return runAi(context, "resume_assistant", "analyze_resume", `Analyze this resume text. Return {weaknesses:string[], improvements:string[], rewrittenSummary:string}. Resume: ${data.resumeText}`, {
      weaknesses: [],
      improvements: [],
      rewrittenSummary: "",
    });
  });

export const aiChatAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    mode: z.enum(["reply", "translate", "summarize", "grammar"]),
    messages: z.array(z.object({ mine: z.boolean(), body: z.string() })).max(80),
    draft: z.string().max(4000).optional(),
  }))
  .handler(async ({ data, context }) => {
    return runAi(context, "chat_assistant", data.mode, `Mode: ${data.mode}. Messages: ${JSON.stringify(data.messages)}. Draft: ${data.draft ?? ""}. Return {suggestions:string[], summary:string, translation:string, improved:string}.`, {
      suggestions: [],
      summary: "",
      translation: "",
      improved: "",
    });
  });

export const aiPriceEstimator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project: JsonRecord }))
  .handler(async ({ data, context }) => {
    return runAi(context, "price_estimator", "estimate_price_duration", `Estimate price and duration for this project using complexity and market averages. Return {minBudget:number,maxBudget:number,currency:string,minDays:number,maxDays:number,complexity:string,reasoning:string}. Project: ${JSON.stringify(data.project)}`, {
      minBudget: 100,
      maxBudget: 500,
      currency: "USD",
      minDays: 3,
      maxDays: 14,
      complexity: "medium",
      reasoning: "",
    });
  });

export const aiScamDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ contentType: z.enum(["project", "profile", "message"]), content: JsonRecord }))
  .handler(async ({ data, context }) => {
    return runAi(context, "scam_detection", "detect_risk", `Detect spam, suspicious behavior, fake account signals, or scam risk. Never recommend automatic deletion. Return {risk:"low"|"medium"|"high", warnings:string[], safeToProceed:boolean}. Content type: ${data.contentType}. Content: ${JSON.stringify(data.content)}`, {
      risk: "low",
      warnings: [],
      safeToProceed: true,
    });
  });

export const aiReputationScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ profile: JsonRecord, reviews: z.array(JsonRecord).default([]), projects: z.array(JsonRecord).default([]) }))
  .handler(async ({ data, context }) => {
    return runAi(context, "reputation_system", "score_trust", `Create an AI trust score from completion rate, review quality, response time, disputes if present, and activity. Return {score:number, grade:string, reasons:string[], risks:string[]}. Data: ${JSON.stringify(data)}`, {
      score: 70,
      grade: "B",
      reasons: [],
      risks: [],
    });
  });

export const aiFreelancerMatching = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project: JsonRecord, freelancers: z.array(JsonRecord).max(80) }))
  .handler(async ({ data, context }) => {
    return runAi(context, "freelancer_matching", "rank_freelancers", `Rank freelancers by skills, ratings, completed projects, activity, and relevance. Return {rankings:[{id:string,score:number,reasons:string[]}]}. Project: ${JSON.stringify(data.project)} Freelancers: ${JSON.stringify(data.freelancers)}`, {
      rankings: [],
    });
  });

export const aiProjectFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ profile: JsonRecord, projects: z.array(JsonRecord).max(120), behavior: JsonRecord.default({}) }))
  .handler(async ({ data, context }) => {
    return runAi(context, "project_feed", "rank_projects", `Rank projects for a personalized TikTok-like feed using skills, interests, viewed projects, and behavior. Return {rankings:[{id:string,score:number,reasons:string[]}]}. Data: ${JSON.stringify(data)}`, {
      rankings: [],
    });
  });

export const logAiConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    feature: AiFeatureSchema,
    targetTable: z.string().optional(),
    targetId: z.string().optional(),
    originalContent: JsonRecord,
    suggestedContent: JsonRecord,
    decision: ConfirmationDecisionSchema,
    applied: z.boolean().default(false),
  }))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("ai_confirmation_history")
      .insert({
        user_id: context.userId,
        feature: data.feature,
        target_table: data.targetTable ?? null,
        target_id: data.targetId ?? null,
        original_content: data.originalContent,
        suggested_content: data.suggestedContent,
        decision: data.decision,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.applied) {
      await context.supabase.from("ai_audit_trail").insert({
        confirmation_id: inserted.id,
        user_id: context.userId,
        feature: data.feature,
        target_table: data.targetTable ?? null,
        target_id: data.targetId ?? null,
        before_data: data.originalContent,
        after_data: data.suggestedContent,
      });
    }

    await logAiAction(context, "confirmation", data.decision, data.originalContent, data.suggestedContent);
    return { id: inserted.id };
  });
