import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { ProductActions } from "@/components/admin/ProductActions";
import { cn } from "cn";

export const metadata = { title: "管理者ダッシュボード" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, currency, image_urls, is_sold_out, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">商品一覧</h2>
        <Link
          href="/admin/products/new"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <PlusCircle className="mr-2 size-4" />
          商品を追加
        </Link>
      </div>

      {/* 商品がない場合 */}
      {!products?.length && (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          商品がまだありません。「商品を追加」から登録してください。
        </div>
      )}

      {/* 商品一覧 */}
      <div className="space-y-3">
        {products?.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm"
          >
            {/* サムネイル */}
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {product.image_urls?.[0] ? (
                <Image
                  src={product.image_urls[0]}
                  alt={product.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            {/* 商品情報 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{product.title}</p>
                {product.is_sold_out && (
                  <Badge variant="secondary">売り切れ</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {product.currency === "JPY"
                  ? `¥${Number(product.price).toLocaleString()}`
                  : `${product.currency} ${product.price}`}
              </p>
            </div>

            {/* アクション（Client Component） */}
            <ProductActions
              id={product.id}
              title={product.title}
              isSoldOut={product.is_sold_out}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
