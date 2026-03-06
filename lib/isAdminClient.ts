import { supabase } from "@/lib/supabaseClient";

export async function getMyRole() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const user = sessionData.session?.user;

  if (!token || !user) return { token: null, role: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { token, role: profile?.role ?? null };
}