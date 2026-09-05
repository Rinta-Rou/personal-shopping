"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/app/actions/cart";

type Props = {
  productId: string;
  isSoldOut: boolean;
  isLoggedIn: boolean;
};

export function AddToCartButton({ productId, isSoldOut, isLoggedIn }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addToCartAction, null);

  if (isSoldOut) {
    return (
      <Button className="w-full" disabled>
        売り切れ
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        className="w-full"
        onClick={() => router.push(`/login?next=/products/${productId}`)}
      >
        <ShoppingCart className="mr-2 size-4" />
        ログインしてカートに追加
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="product_id" value={productId} />
      {state?.success ? (
        <Button className="w-full" variant="outline" disabled>
          <CheckCircle className="mr-2 size-4 text-green-500" />
          カートに追加しました
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              追加中…
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 size-4" />
              カートに追加
            </>
          )}
        </Button>
      )}
      {state?.error && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
