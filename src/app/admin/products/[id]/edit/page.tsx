import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProductAction } from "../../actions";

export const metadata = { title: "商品を編集 | 管理者" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price, currency, image_urls")
    .eq("id", id)
    .single();

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        商品一覧に戻る
      </Link>

      <h2 className="mb-6 text-xl font-semibold">商品を編集</h2>

      <ProductForm
        action={updateProductAction}
        initialData={{
          id: product.id,
          title: product.title,
          description: product.description,
          price: Number(product.price),
          currency: product.currency,
          image_urls: product.image_urls ?? [],
        }}
      />
    </div>
  );
}
