import { supabaseAdmin } from "@/integrations/supabase/client.server";
export async function canReadPackageContent(
  pkg: { id: string; author_id: string | null; price_credits: number },
  userId: string | null,
): Promise<boolean> {
  if (pkg.price_credits === 0) return true;
  if (!userId) return false;
  if (pkg.author_id === userId) return true;
  const [role, purchase, packs] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
    supabaseAdmin
      .from("package_purchases")
      .select("id")
      .eq("buyer_id", userId)
      .eq("package_id", pkg.id)
      .limit(1),
    supabaseAdmin.from("pack_purchases").select("pack_id").eq("buyer_id", userId),
  ]);
  if (role.data || purchase.data?.length) return true;
  const ids = (packs.data ?? []).map((p) => p.pack_id);
  if (!ids.length) return false;
  const { data } = await supabaseAdmin
    .from("pack_items")
    .select("pack_id")
    .in("pack_id", ids)
    .eq("package_id", pkg.id)
    .limit(1);
  return !!data?.length;
}
