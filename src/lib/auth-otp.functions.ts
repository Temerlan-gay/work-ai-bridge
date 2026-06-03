import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, timingSafeEqual } from "crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

const SignupSchema = z.object({
  email: EmailSchema,
  password: z.string().min(6).max(72),
  fullName: z.string().trim().min(1).max(120),
});

const VerifySchema = z.object({
  email: EmailSchema,
  code: z.string().regex(/^\d{6}$/),
});

const ResendSchema = z.object({ email: EmailSchema });

function hashCode(code: string, email: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

async function sendCodeEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "WorkBridge <onboarding@resend.dev>",
      to: [email],
      subject: `${code} is your WorkBridge verification code`,
      html: `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#f5f5f5;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:32px;">
    <h1 style="margin:0 0 8px;font-size:22px;">Your verification code</h1>
    <p style="color:#a3a3a3;margin:0 0 24px;">Enter this 6-digit code in WorkBridge to finish signing up.</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;padding:20px 0;">${code}</div>
    <p style="color:#737373;font-size:12px;margin-top:24px;">The code expires in 15 minutes. If you didn't request it, ignore this email.</p>
  </div>
</body></html>`,
      text: `Your WorkBridge verification code: ${code}\nIt expires in 15 minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

async function issueCode(email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Invalidate previous active codes for this email
  await supabaseAdmin
    .from("email_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .is("consumed_at", null)
    .eq("email", email);

  const { error } = await supabaseAdmin.from("email_verification_codes").insert({
    email,
    code_hash: hashCode(code, email),
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  await sendCodeEmail(email, code);
}

export const startSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupSchema.parse(input))
  .handler(async ({ data }) => {
    // Check if email already used and confirmed
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );

    if (existing) {
      if (existing.email_confirmed_at) {
        // Do not disclose that the account exists — return uniform success.
        return { ok: true };
      }
      // Re-use existing unconfirmed user: update password + metadata
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
        user_metadata: { full_name: data.fullName },
      });
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false,
        user_metadata: { full_name: data.fullName },
      });
      if (createErr) throw new Error(createErr.message);
    }

    await issueCode(data.email);
    return { ok: true };
  });

export const resendSignupCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResendSchema.parse(input))
  .handler(async ({ data }) => {
    await issueCode(data.email);
    return { ok: true };
  });

export const verifySignupCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VerifySchema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("email_verification_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("email", data.email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);

    const row = rows?.[0];
    if (!row) throw new Error("No active code. Request a new one.");
    if (row.attempts >= 5) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      throw new Error("Too many attempts. Request a new code.");
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Code expired. Request a new one.");
    }

    const expected = row.code_hash;
    const provided = hashCode(data.code, data.email);
    if (!safeEqual(expected, provided)) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Invalid code");
    }

    await supabaseAdmin
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // Mark user email as confirmed
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);
    const user = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );
    if (!user) throw new Error("Account not found");
    if (!user.email_confirmed_at) {
      const { error: confErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      if (confErr) throw new Error(confErr.message);
    }

    return { ok: true };
  });