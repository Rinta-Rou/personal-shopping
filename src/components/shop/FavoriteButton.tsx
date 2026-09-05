"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import { cn } from "cn";

type Props = {
  productId: string;
  isFavorite: boolean;
  isLoggedIn: boolean;
};

export function FavoriteButton({ productId, isFavorite, isLoggedIn }: Props) {
  const router = useRouter();
  const [, action, pending] = useActionState(toggleFavoriteAction, null);

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=/products/${productId}`);
    }
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex size-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
        title="ログインしてお気に入りに追加"
      >
        <Heart className="size-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="is_favorite" value={String(isFavorite)} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors",
          isFavorite
            ? "bg-red-50 hover:bg-red-100"
            : "bg-white/80 hover:bg-white"
        )}
        title={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
      >
        <Heart
          className={cn(
            "size-4 transition-colors",
            isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )}
        />
      </button>
    </form>
  );
}
