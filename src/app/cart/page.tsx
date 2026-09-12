import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { RemoveFromCartButton } from "@/components/shop/RemoveFromCartButton";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { cn } from "cn";

export const metadata = { title: "カート | C2C Shop" };

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/cart");

  const { data: cartItems } = await supabase
    .from("carts")
    .select("id, quantity, products(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 合計金額（同一通貨のみ集計）
  type ProductRow = {
    id: string;
    title: string;
    price: number;
    currency: string;
    image_urls: string[];
    is_sold_out: boolean;
  };

  const items =
    cartItems?.map((item) => ({
      id: item.id,
      quantity: item.quantity as number,
      product: (Array.isArray(item.products)
        ? item.products[0]
        : item.products) as ProductRow | null,
    })) ?? [];

  // 通貨ごとに小計をまとめる
  const totals = items.reduce<Record<string, number>>((acc, item) => {
    if (!item.product) return acc;
    const cur = item.product.currency;
    acc[cur] = (acc[cur] ?? 0) + Number(item.product.price) * item.quantity;
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <ShoppingCart className="size-5" />
        <h1 className="text-xl font-semibold">カート</h1>
        <span className="text-sm text-muted-foreground">
          ({items.length} 件)
        </span>
      </div>

      {/* カートが空 */}
      {!items.length && (
        <div className="rounded-lg border border-dashed py-24 text-center">
          <p className="mb-4 text-muted-foreground">
            カートに商品が入っていません。
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            商品を探す
          </Link>
        </div>
      )}

      {/* カートアイテム一覧 */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map(({ id, product }) => {
            if (!product) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm"
              >
                {/* サムネイル */}
                <Link href={`/products/${product.id}`}>
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {product.image_urls?.[0] ? (
                      <Image
                        src={product.image_urls[0]}
                        alt={product.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                </Link>

                {/* 商品情報 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${product.id}`}>
                      <p className="truncate font-medium hover:underline">
                        {product.title}
                      </p>
                    </Link>
                    {product.is_sold_out && (
                      <Badge variant="secondary" className="shrink-0">
                        売り切れ
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {product.currency === "JPY"
                      ? `¥${Number(product.price).toLocaleString()}`
                      : `${product.currency} ${product.price}`}
                  </p>
                </div>

                {/* 削除ボタン */}
                <RemoveFromCartButton cartItemId={id} />
              </div>
            );
          })}

          {/* 合計 */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">合計</h2>
            {Object.entries(totals).map(([currency, total]) => (
              <div key={currency} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currency}</span>
                <span className="font-semibold">
                  {currency === "JPY"
                    ? `¥${total.toLocaleString()}`
                    : `${currency} ${total.toLocaleString()}`}
                </span>
              </div>
            ))}

            {/* Stripe決済ボタン（Step4で実装） */}
            <div className="mt-4">
              <div
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full cursor-not-allowed opacity-60"
                )}
                title="決済機能はStep4で実装予定"
              >
                購入手続きへ（Step4で実装）
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
