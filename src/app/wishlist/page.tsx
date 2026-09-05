import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { cn } from "cn";

export const metadata = { title: "お気に入り | C2C Shop" };

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/wishlist");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("id, product_id, products(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Heart className="size-5 fill-red-500 text-red-500" />
        <h1 className="text-xl font-semibold">お気に入り</h1>
        <span className="text-sm text-muted-foreground">
          ({favorites?.length ?? 0} 件)
        </span>
      </div>

      {!favorites?.length && (
        <div className="rounded-lg border border-dashed py-24 text-center">
          <p className="mb-4 text-muted-foreground">
            お気に入りに追加した商品がありません。
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            商品を探す
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {favorites?.map((fav) => {
          const product = (Array.isArray(fav.products)
            ? fav.products[0]
            : fav.products) as {
            id: string;
            title: string;
            price: number;
            currency: string;
            image_urls: string[];
            is_sold_out: boolean;
          } | null;

          if (!product) return null;

          return (
            <div
              key={fav.id}
              className="group relative overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              {/* サムネイル */}
              <Link href={`/products/${product.id}`}>
                <div className="relative aspect-square overflow-hidden bg-neutral-100">
                  {product.image_urls?.[0] ? (
                    <Image
                      src={product.image_urls[0]}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                  {product.is_sold_out && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Badge variant="secondary">売り切れ</Badge>
                    </div>
                  )}
                </div>
              </Link>

              {/* お気に入り解除ボタン */}
              <div className="absolute right-2 top-2">
                <FavoriteButton
                  productId={product.id}
                  isFavorite={true}
                  isLoggedIn={true}
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
          );
        })}
      </div>
    </main>
  );
}
