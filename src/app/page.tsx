import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/shop/SearchBar";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { cn } from "cn";
import type { Product } from "@/types";

export const metadata = { title: "C2C グローバルショップ" };

type SearchParams = Promise<{
  q?: string;
  currency?: string;
}>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, currency } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 商品取得（販売中のみ）
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_sold_out", false)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }
  if (currency) {
    query = query.eq("currency", currency);
  }

  const { data: products } = await query;

  // ログイン済みならお気に入りIDセットを取得
  let favoriteProductIds = new Set<string>();
  if (user) {
    const { data: favorites } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);
    favoriteProductIds = new Set(favorites?.map((f) => f.product_id) ?? []);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* 検索・フィルター */}
      <SearchBar defaultQ={q} defaultCurrency={currency} />

      {/* 件数 */}
      <p className="mb-4 text-sm text-muted-foreground">
        {products?.length ?? 0} 件
      </p>

      {/* 商品なし */}
      {!products?.length && (
        <div className="rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          該当する商品が見つかりませんでした。
        </div>
      )}

      {/* 商品グリッド */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products?.map((product: Product) => (
          <div
            key={product.id}
            className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* サムネイル */}
            <Link href={`/products/${product.id}`}>
              <div className="relative aspect-square overflow-hidden bg-neutral-100">
                {product.image_urls?.[0] ? (
                  <Image
                    src={product.image_urls[0]}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            </Link>

            {/* お気に入りボタン */}
            <div className="absolute right-2 top-2">
              <FavoriteButton
                productId={product.id}
                isFavorite={favoriteProductIds.has(product.id)}
                isLoggedIn={!!user}
              />
            </div>

            {/* 商品情報 */}
            <div className="p-3">
              <Link href={`/products/${product.id}`}>
                <p className="truncate text-sm font-medium hover:underline">
                  {product.title}
                </p>
              </Link>
              <p className="mt-0.5 text-sm font-semibold">
                {product.currency === "JPY"
                  ? `¥${Number(product.price).toLocaleString()}`
                  : `${product.currency} ${product.price}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
