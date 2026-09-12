"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavoriteAction(
  _prev: null,
  formData: FormData
): Promise<null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const productId = formData.get("product_id") as string;
  const isFavorite = formData.get("is_favorite") === "true";

  if (isFavorite) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
  } else {
    await supabase
      .from("favorites")
      .insert({ user_id: user.id, product_id: productId });
  }

  revalidatePath("/");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/wishlist");
  return null;
}
