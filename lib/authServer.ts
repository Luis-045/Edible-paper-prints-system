import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAuth = createClient(supabaseUrl, anonKey);

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return { user: null, error: "Falta token" };

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Token inválido" };

  return { user: data.user, error: null };
}