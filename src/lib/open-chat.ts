import { supabase } from "@/integrations/supabase/client";

/**
 * Open (or create) a 1-on-1 chat between the current user and `otherId`.
 * Returns the chat id, or null if the user isn't authenticated / on self.
 */
export async function openOrCreateChat(currentUserId: string, otherId: string): Promise<string | null> {
  if (!currentUserId || !otherId || currentUserId === otherId) return null;

  const { data: existing } = await supabase
    .from("chats")
    .select("id")
    .or(
      `and(user_a.eq.${currentUserId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${currentUserId})`,
    )
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("chats")
    .insert({ user_a: currentUserId, user_b: otherId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}