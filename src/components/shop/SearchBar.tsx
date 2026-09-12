"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  defaultQ?: string;
  defaultCurrency?: string;
};

const CURRENCIES = [
  { value: "", label: "すべての通貨" },
  { value: "JPY", label: "JPY" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

export function SearchBar({ defaultQ = "", defaultCurrency = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultQ);
  const [currency, setCurrency] = useState(defaultCurrency);

  // ブラウザバック時など defaultQ/defaultCurrency が変わったら state を同期する
  useEffect(() => { setQ(defaultQ); }, [defaultQ]);
  useEffect(() => { setCurrency(defaultCurrency); }, [defaultCurrency]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (currency) params.set("currency", currency);

    startTransition(() => {
      router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          placeholder="商品を検索..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
        />
      </div>

      <select
        name="currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="flex h-8 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {CURRENCIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "検索中…" : "検索"}
      </Button>
    </form>
  );
}
