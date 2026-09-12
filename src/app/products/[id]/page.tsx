import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImageGallery } from "@/components/shop/ImageGallery";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { ContactSellerButton } from "@/components/products/ContactSellerButton";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("title")
    .eq("id", id)
    .single();
  return { title: data?.title ?? "商品詳細" };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // お気に入り状態
  let isFavorite = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .single();
    isFavorite = !!fav;
  }

  // 出品者（admin）のIDを取得
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();
  const sellerId = adminProfile?.id ?? "";

  const priceLabel =
    product.currency === "JPY"
      ? `¥${Number(product.price).toLocaleString()}`
      : `${product.currency} ${product.price}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* パンくず */}
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        商品一覧に戻る
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* 画像ギャラリー */}
        <ImageGallery
          imageUrls={product.image_urls ?? []}
          title={product.title}
        />

        {/* 商品情報 */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold leading-snug">{product.title}</h1>
              <FavoriteButton
                productId={product.id}
                isFavorite={isFavorite}
                isLoggedIn={!!user}
              />
            </div>

            {product.is_sold_out && (
              <Badge variant="secondary" className="mt-2">
                売り切れ
              </Badge>
            )}
          </div>

          {/* 価格 */}
          <p className="text-3xl font-semibold">{priceLabel}</p>

          {/* 説明 */}
          <div className="rounded-lg bg-neutral-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              商品説明
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* 出品日 */}
          <p className="text-xs text-muted-foreground">
            出品日:{" "}
            {new Date(product.created_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {/* カートに追加 */}
          <AddToCartButton
            productId={product.id}
            isSoldOut={product.is_sold_out}
            isLoggedIn={!!user}
          />

          {/* 出品者に問い合わせる */}
          {sellerId && (
            <ContactSellerButton
              productId={product.id}
              sellerId={sellerId}
              isLoggedIn={!!user}
              isSelf={user?.id === sellerId}
            />
          )}
        </div>
      </div>
    </main>
  );
}
