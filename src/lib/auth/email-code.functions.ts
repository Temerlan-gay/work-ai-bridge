import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { assertExpectedSupabaseProject } from "@/integrations/supabase/config";
import type { Database } from "@/integrations/supabase/types";

const EmailSchema = z.object({
  email: z.string().email().max(320),
});

const VerifyEmailSchema = EmailSchema.extend({
  code: z.string().regex(/^[1-9]{6}$/),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createPublicServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase server environment is not configured");
  }

  assertExpectedSupabaseProject(supabaseUrl);

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function sha256(value: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

async function createCode() {
  const { randomInt } = await import("node:crypto");
  return Array.from({ length: 6 }, () => String(randomInt(1, 10))).join("");
}

async function sendEmail(to: string, code: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.RESEND_FROM_EMAIL || "WorkBridge <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your WorkBridge confirmation code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717;">
          <h1 style="font-size:22px;margin:0 0 12px;">Confirmation code</h1>
          <p style="font-size:14px;color:#525252;margin:0 0 20px;">Enter this 6-digit code in WorkBridge to continue.</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f5f5f5;border-radius:12px;padding:18px 20px;text-align:center;">${code}</div>
          <p style="font-size:12px;color:#737373;margin:20px 0 0;">The code is valid for 10 minutes. If you did not request it, ignore this email.</p>
        </div>
      `,
      text: `Your WorkBridge confirmation code: ${code}. The code is valid for 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not send email: ${body}`);
  }
}

export const sendEmailVerificationCode = createServerFn({ method: "POST" })
  .inputValidator(EmailSchema)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const supabase = createPublicServerSupabaseClient();
    const code = await createCode();
    const codeHash = await sha256(`${email}:${code}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await (supabase as any).rpc("request_email_verification_code", {
      p_email: email,
      p_code_hash: codeHash,
      p_expires_at: expiresAt,
    });
    if (error) throw error;

    await sendEmail(email, code);
    return { ok: true, expiresAt };
  });

export const verifyEmailCode = createServerFn({ method: "POST" })
  .inputValidator(VerifyEmailSchema)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const supabase = createPublicServerSupabaseClient();
    const submittedHash = await sha256(`${email}:${data.code}`);

    const { data: result, error } = await (supabase as any).rpc(
      "verify_email_verification_code",
      {
        p_email: email,
        p_code_hash: submittedHash,
      },
    );

    if (error) throw error;
    if (result === "ok") return { ok: true };
    return {
      ok: false,
      reason: result as "missing" | "expired" | "too_many_attempts" | "invalid",
    };
  });
