import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import type Stripe from "stripe";

// Next.js の body パース無効化（Stripe 署名検証に生のバイト列が必要）
export const dynamic = "force-dynamic";

type CartMetaItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名がありません。" }, { status: 400 });
  }

  // ① 署名検証
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook 署名検証失敗:", err);
    return NextResponse.json({ error: "署名検証失敗" }, { status: 400 });
  }

  // ② checkout.session.completed のみ処理
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { userId, userEmail, cartItems: cartItemsJson } = session.metadata ?? {};

  if (!userId || !cartItemsJson) {
    console.error("Webhook: metadata 不足", session.metadata);
    return NextResponse.json({ error: "metadata 不足" }, { status: 400 });
  }

  const cartItems: CartMetaItem[] = JSON.parse(cartItemsJson);
  const supabase = createAdminClient();

  // ③ orders テーブルに保存
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "jpy",
      status: "completed",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("orders INSERT 失敗:", orderError);
    return NextResponse.json({ error: "注文保存失敗" }, { status: 500 });
  }

  // ④ order_items テーブルに保存
  const orderItems = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("order_items INSERT 失敗:", itemsError);
    // order_items の失敗は注文自体を無効にしない（継続）
  }

  // ⑤ 購入商品の is_sold_out を true に更新
  const productIds = cartItems.map((i) => i.productId);
  await supabase
    .from("products")
    .update({ is_sold_out: true })
    .in("id", productIds);

  // ⑥ ユーザーのカートをクリア
  await supabase.from("carts").delete().eq("user_id", userId);

  // ⑦ Resend で購入者へ完了メール
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey !== "re_..." && userEmail) {
    try {
      const resend = new Resend(resendKey);
      const totalLabel =
        session.currency === "jpy"
          ? `¥${(session.amount_total ?? 0).toLocaleString()}`
          : `${session.currency?.toUpperCase()} ${session.amount_total}`;

      await resend.emails.send({
        from: "noreply@resend.dev",
        to: userEmail,
        subject: "【購入完了】ご注文を受け付けました",
        html: `
          <h2>ご購入ありがとうございました！</h2>
          <p>以下の内容でご注文を受け付けました。</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr>
              <td style="padding:4px 16px 4px 0;color:#666;">注文ID</td>
              <td><strong>${order.id}</strong></td>
            </tr>
            <tr>
              <td style="padding:4px 16px 4px 0;color:#666;">合計金額</td>
              <td><strong>${totalLabel}</strong></td>
            </tr>
          </table>
          <p style="color:#999;font-size:12px;margin-top:24px;">
            このメールは自動送信です。返信はできません。
          </p>
        `,
      });
    } catch (mailErr) {
      // メール失敗は注文処理の失敗扱いにしない
      console.error("購入完了メール送信失敗:", mailErr);
    }
  }

  return NextResponse.json({ received: true });
}
