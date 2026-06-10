import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailSchema = z.object({
  email: z.string().email().max(320),
});

const VerifyEmailSchema = EmailSchema.extend({
  code: z.string().regex(/^\d{6}$/),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

async function ensureEmailIsAvailable(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;
    const exists = data.users.some((user) => user.email?.toLowerCase() === email);
    if (exists) {
      throw new Error("ACCOUNT_ALREADY_REGISTERED");
    }
    if (data.users.length < perPage) return;
    page += 1;
  }
}

export const sendEmailVerificationCode = createServerFn({ method: "POST" })
  .inputValidator(EmailSchema)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    await ensureEmailIsAvailable(email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await createCode();
    const codeHash = await sha256(`${email}:${code}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("email", email)
      .is("consumed_at", null);

    const { error } = await supabaseAdmin.from("email_verification_codes").insert({
      email,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) throw error;

    await sendEmail(email, code);
    return { ok: true, expiresAt };
  });

export const verifyEmailCode = createServerFn({ method: "POST" })
  .inputValidator(VerifyEmailSchema)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("email_verification_codes")
      .select("id,code_hash,expires_at,attempts,consumed_at")
      .eq("email", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!row) return { ok: false, reason: "missing" as const };

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      return { ok: false, reason: "expired" as const };
    }

    if (row.attempts >= 5) {
      return { ok: false, reason: "too_many_attempts" as const };
    }

    const submittedHash = await sha256(`${email}:${data.code}`);
    if (submittedHash !== row.code_hash) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false, reason: "invalid" as const };
    }

    await supabaseAdmin
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true };
  });
