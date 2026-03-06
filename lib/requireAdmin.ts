import { supabaseAdmin } from "./supabase";
import { getUserFromRequest } from "./authServer";

export async function requireAdmin(req: Request) {
  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) {
    return { ok: false as const, status: 401, error: authError || "No autenticado" };
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) {
    return { ok: false as const, status: 403, error: "Perfil no encontrado" };
  }

  if (profile.role !== "admin") {
    return { ok: false as const, status: 403, error: "No autorizado (admin requerido)" };
  }

  return { ok: true as const, user };
}