"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const StartChatSchema = z.object({
  product_id: z.string().uuid("product_id は UUID 形式である必要があります。"),
  seller_id: z.string().uuid("seller_id は UUID 形式である必要があります。"),
});

/**
 * 商品詳細ページの「出品者に問い合わせる」ボタンから呼び出す。
 * - UUID バリデーション
 * - 自分が出品者のケースを拒否
 * - product_id と seller_id の整合性チェック
 * - 既存 chat_room があればそこへ、なければ新規作成して遷移
 */
export async function startChatAction(
  _prev: null,
  formData: FormData
): Promise<null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawProductId = formData.get("product_id");
  if (!user) {
    redirect(`/login?next=/products/${rawProductId}`);
  }

  // ① Zod バリデーション
  const parsed = StartChatSchema.safeParse({
    product_id: formData.get("product_id"),
    seller_id: formData.get("seller_id"),
  });

  if (!parsed.success) {
    redirect("/");
  }

  const { product_id: productId, seller_id: sellerId } = parsed.data;

  // ② 自分が出品者の場合は拒否
  if (user.id === sellerId) {
    redirect(`/products/${productId}`);
  }

  // ③ product_id と seller_id の整合性チェック
  // products.seller_id が一致するか確認（seller_id が NULL の場合は admin ロールで代替）
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .single();

  if (!product) {
    redirect("/");
  }

  // seller_id カラムがある場合は整合性チェック
  if (product.seller_id && product.seller_id !== sellerId) {
    redirect(`/products/${productId}`);
  }

  // ④ 既存の chat_room を検索
  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId)
    .single();

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  // ⑤ 新規作成（adminClient で RLS バイパス）
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("chat_rooms")
    .insert({
      product_id: productId,
      buyer_id: user.id,
      seller_id: sellerId,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("chat_room 作成失敗:", error?.message);
    redirect(`/products/${productId}`);
  }

  redirect(`/messages/${created.id}`);
}
