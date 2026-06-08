type AuthLikeError = {
  code?: string;
  message?: string;
};

export function getFriendlyAuthError(error: AuthLikeError): string {
  const code = error.code ?? "";
  const message = error.message ?? "Authentication failed. Please try again.";
  const lower = message.toLowerCase();

  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check that this account belongs to the current Supabase project.";
  }

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please confirm your email before logging in. Check your inbox or sign up again to request a new link.";
  }

  if (code === "user_already_exists" || lower.includes("already registered")) {
    return "An account with this email already exists. Log in or reset the password.";
  }

  if (lower.includes("missing oauth secret") || lower.includes("unsupported provider")) {
    return "Google login is not configured in Supabase yet. Enable the Google provider and add its Client ID and Client Secret in Supabase Auth settings.";
  }

  return message;
}
