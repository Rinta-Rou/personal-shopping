import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export type CheckoutCartItem = {
  productId: string;
  title: string;
  price: number;       // 整数（円 or セント）
  currency: string;    // "JPY" | "USD" | "EUR"
  quantity: number;
  imageUrl?: string;
};

export async function POST(request: Request) {
  // 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // リクエストボディ取得
  const { items }: { items: CheckoutCartItem[] } = await request.json();

  if (!items?.length) {
    return NextResponse.json({ error: "カートが空です。" }, { status: 400 });
  }

  // 全アイテムが同一通貨かチェック
  const currencies = new Set(items.map((i) => i.currency.toLowerCase()));
  if (currencies.size > 1) {
    return NextResponse.json(
      { error: "複数の通貨が混在しています。同一通貨の商品のみ購入できます。" },
      { status: 400 }
    );
  }
  const currency = [...currencies][0]; // "jpy" | "usd" | "eur"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Stripe の line_items に変換
  // JPY は最小単位が円（整数）、それ以外はセント（×100）
  const isZeroDecimal = currency === "jpy";

  const lineItems = items.map((item) => ({
    price_data: {
      currency,
      product_data: {
        name: item.title,
        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
      },
      unit_amount: isZeroDecimal
        ? Math.round(item.price)
        : Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  // カートデータをメタデータに保持（Webhook で使用）
  const cartMeta = JSON.stringify(
    items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: isZeroDecimal
        ? Math.round(i.price)
        : Math.round(i.price * 100),
    }))
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cart`,
    metadata: {
      userId: user.id,
      userEmail: user.email ?? "",
      cartItems: cartMeta,
    },
    // Apple Pay / Google Pay は payment_method_types を省略することで自動有効化
    payment_method_types: ["card"],
    locale: "ja",
  });

  return NextResponse.json({ url: session.url });
}
