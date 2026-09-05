"use client";

import { useActionState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeFromCartAction } from "@/app/actions/cart";

export function RemoveFromCartButton({ cartItemId }: { cartItemId: string }) {
  const [, action, pending] = useActionState(removeFromCartAction, null);

  return (
    <form action={action}>
      <input type="hidden" name="cart_item_id" value={cartItemId} />
      <Button type="submit" variant="ghost" size="icon-sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4 text-muted-foreground" />
        )}
      </Button>
    </form>
  );
}
