import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { assertExpectedSupabaseProject } from "@/integrations/supabase/config";

const EmailSchema = z.object({
  email: z.string().email().max(320),
});

const VerifyEmailSchema = EmailSchema.extend({
  code: z.string().regex(/^\d{6}$/),
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
  return String(randomInt(100000, 1000000));
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
      subject: "Ваш код подтверждения WorkBridge",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717;">
          <h1 style="font-size:22px;margin:0 0 12px;">Код подтверждения</h1>
          <p style="font-size:14px;color:#525252;margin:0 0 20px;">Введите этот 6-значный код в WorkBridge, чтобы завершить регистрацию.</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f5f5f5;border-radius:12px;padding:18px 20px;text-align:center;">${code}</div>
          <p style="font-size:12px;color:#737373;margin:20px 0 0;">Код действует 10 минут. Если вы не запрашивали регистрацию, просто проигнорируйте письмо.</p>
        </div>
      `,
      text: `Ваш код подтверждения WorkBridge: ${code}. Код действует 10 минут.`,
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

    const { data: result, error } = await (supabase as any).rpc("verify_email_verification_code", {
      p_email: email,
      p_code_hash: submittedHash,
    });

    if (error) throw error;
    if (result === "ok") return { ok: true };
    return {
      ok: false,
      reason: result as "missing" | "expired" | "too_many_attempts" | "invalid",
    };
  });
