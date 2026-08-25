type AuthLikeError = {
  code?: string;
  message?: string;
};

export function getFriendlyAuthError(error: AuthLikeError | unknown): string {
  const authError = error && typeof error === "object" ? (error as AuthLikeError) : {};
  const code = authError.code ?? "";
  const message = authError.message ?? "Authentication failed. Please try again.";
  const lower = message.toLowerCase();

  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "Извините, но пароль не верный.";
  }

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Почта еще не подтверждена. Проверьте письмо или попробуйте зарегистрироваться заново.";
  }

  if (
    code === "user_already_exists" ||
    lower.includes("already registered") ||
    lower.includes("user already registered") ||
    lower.includes("already exists")
  ) {
    return "Простите, но этот аккаунт уже зарегистрирован. Попробуйте войти.";
  }

  if (lower.includes("missing oauth secret") || lower.includes("unsupported provider")) {
    return "Google login is not configured in Supabase yet. Enable the Google provider and add its Client ID and Client Secret in Supabase Auth settings.";
  }

  return message;
}
