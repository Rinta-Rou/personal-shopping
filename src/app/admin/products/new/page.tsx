import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProductAction } from "../actions";

export const metadata = { title: "商品を追加 | 管理者" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        商品一覧に戻る
      </Link>

      <h2 className="mb-6 text-xl font-semibold">商品を追加</h2>

      <ProductForm action={createProductAction} />
    </div>
  );
}
