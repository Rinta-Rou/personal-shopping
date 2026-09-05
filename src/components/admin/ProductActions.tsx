"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteProductAction, toggleSoldOutAction } from "@/app/admin/products/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "cn";

type Props = {
  id: string;
  title: string;
  isSoldOut: boolean;
};

export function ProductActions({ id, title, isSoldOut }: Props) {
  const [, deleteAction, deletepending] = useActionState(deleteProductAction, null);
  const [, toggleAction, togglePending] = useActionState(toggleSoldOutAction, null);

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm(`「${title}」を削除してもよいですか？`)) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* 売り切れ切り替え */}
      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="is_sold_out" value={String(isSoldOut)} />
        <Button type="submit" variant="outline" size="sm" disabled={togglePending}>
          {togglePending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : isSoldOut ? (
            "販売中に戻す"
          ) : (
            "売り切れにする"
          )}
        </Button>
      </form>

      {/* 編集 */}
      <Link
        href={`/admin/products/${id}/edit`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Pencil className="size-4" />
      </Link>

      {/* 削除 */}
      <form action={deleteAction} onSubmit={handleDelete}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="destructive" size="sm" disabled={deletepending}>
          {deletepending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
