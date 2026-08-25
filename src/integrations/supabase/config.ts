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

  if (!urlProjectId) {
    throw new Error(`Invalid Supabase URL: ${url}. Use https://PROJECT_REF.supabase.co.`);
  }

  if (configuredProjectId && configuredProjectId !== urlProjectId) {
    throw new Error(
      `Supabase project ID mismatch. VITE_SUPABASE_PROJECT_ID is ${configuredProjectId}, but VITE_SUPABASE_URL points to ${urlProjectId}. Update the variables so they use the same project.`,
    );
  }
}
