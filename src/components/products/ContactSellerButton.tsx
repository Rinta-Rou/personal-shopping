"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startChatAction } from "@/app/actions/chat";

type Props = {
  productId: string;
  sellerId: string;
  isLoggedIn: boolean;
  isSelf: boolean;
};

export function ContactSellerButton({
  productId,
  sellerId,
  isLoggedIn,
  isSelf,
}: Props) {
  const router = useRouter();
  const [, action, pending] = useActionState(startChatAction, null);

  // 自分の出品物には表示しない
  if (isSelf) return null;

  // 未ログイン
  if (!isLoggedIn) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push(`/login?next=/products/${productId}`)}
      >
        <MessageCircle className="mr-2 size-4" />
        ログインして問い合わせる
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="seller_id" value={sellerId} />
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            移動中…
          </>
        ) : (
          <>
            <MessageCircle className="mr-2 size-4" />
            出品者に問い合わせる
          </>
        )}
      </Button>
    </form>
  );
}
