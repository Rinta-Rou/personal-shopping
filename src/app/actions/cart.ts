"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

type CartActionState = { success?: boolean; error?: string } | null;

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const productId = formData.get("product_id") as string;

  // 商品情報取得
  const { data: product } = await supabase
    .from("products")
    .select("id, title, price, currency, is_sold_out")
    .eq("id", productId)
    .single();

  if (!product) return { error: "商品が見つかりません。" };
  if (product.is_sold_out) return { error: "この商品はすでに売り切れです。" };

  // 既にカートに入っているか確認
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .single();

  if (existing) return { success: true }; // 既にある場合はそのままOK

  // カートに追加
  const { error } = await supabase.from("carts").insert({
    user_id: user.id,
    product_id: productId,
    quantity: 1,
  });

  if (error) return { error: error.message };

  // Resend で管理者にメール通知
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (adminEmail && resendKey && resendKey !== "re_...") {
    try {
      const resend = new Resend(resendKey);
      const priceLabel =
        product.currency === "JPY"
          ? `¥${Number(product.price).toLocaleString()}`
          : `${product.currency} ${product.price}`;

      await resend.emails.send({
        from: "noreply@resend.dev",
        to: adminEmail,
        subject: `【カート追加通知】${product.title}`,
        html: `
          <h2>カート追加通知</h2>
          <p>ユーザー <strong>${user.email}</strong> が商品をカートに追加しました。</p>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;color:#666;">商品名</td><td><strong>${product.title}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">価格</td><td>${priceLabel}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">ユーザー</td><td>${user.email}</td></tr>
          </table>
          <p style="color:#999;font-size:12px;margin-top:24px;">※この時点では在庫の確保・削減は行われません。</p>
        `,
      });
    } catch {
      // メール失敗はカート追加の失敗にしない
    }
  }

  revalidatePath("/");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/cart");

  return { success: true };
}

export async function removeFromCartAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const cartItemId = formData.get("cart_item_id") as string;

  const { error } = await supabase
    .from("carts")
    .delete()
    .eq("id", cartItemId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/cart");
  return { success: true };
}
