export const EXPECTED_SUPABASE_PROJECT_ID = "sqvnckkatskkyngbanlh";
export const EXPECTED_SUPABASE_URL = `https://${EXPECTED_SUPABASE_PROJECT_ID}.supabase.co`;

export function getSupabaseProjectId(url: string): string | undefined {
  try {
    const host = new URL(url).hostname;
    const suffix = ".supabase.co";
    return host.endsWith(suffix) ? host.slice(0, -suffix.length) : undefined;
  } catch {
    return undefined;
  }
}

export function assertExpectedSupabaseProject(url: string, projectId?: string): void {
  const urlProjectId = getSupabaseProjectId(url);
  const configuredProjectId = projectId?.trim();

  if (urlProjectId !== EXPECTED_SUPABASE_PROJECT_ID) {
    throw new Error(
      `Supabase URL project mismatch. Expected ${EXPECTED_SUPABASE_URL}, got ${url}. Update SUPABASE_URL and VITE_SUPABASE_URL, then rebuild/redeploy.`,
    );
  }

  if (configuredProjectId && configuredProjectId !== EXPECTED_SUPABASE_PROJECT_ID) {
    throw new Error(
      `Supabase project ID mismatch. Expected ${EXPECTED_SUPABASE_PROJECT_ID}, got ${configuredProjectId}. Update VITE_SUPABASE_PROJECT_ID, then rebuild/redeploy.`,
    );
  }
}
