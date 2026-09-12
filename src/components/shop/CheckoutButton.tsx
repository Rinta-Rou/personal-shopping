"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import type { CheckoutCartItem } from "@/app/api/checkout/route";

type Props = {
  items: CheckoutCartItem[];
  disabled?: boolean;
};

export function CheckoutButton({ items, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました。");
        return;
      }

      // Stripe Checkout ページへリダイレクト
      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={handleCheckout}
        disabled={loading || disabled}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            処理中…
          </>
        ) : (
          <>
            <CreditCard className="mr-2 size-4" />
            購入手続きへ進む
          </>
        )}
      </Button>
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
