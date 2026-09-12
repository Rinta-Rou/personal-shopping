import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MessageCircle } from "lucide-react";

export const metadata = { title: "メッセージ | C2C Shop" };

/** UUID の先頭8文字を表示名として使用（メール非公開） */
function shortId(id: string) {
  return `ユーザー#${id.slice(0, 8)}`;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  // 自分が buyer または seller の chat_rooms を取得
  const { data: chatRooms } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      created_at,
      buyer_id,
      seller_id,
      products ( id, title, image_urls )
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // 各 chat_room の最新メッセージを取得
  type RoomRow = {
    id: string;
    created_at: string;
    buyer_id: string;
    seller_id: string;
    product: { id: string; title: string; image_urls: string[] } | null;
    lastMessage: string | null;
    otherDisplayName: string;
  };

  const rows: RoomRow[] = await Promise.all(
    (chatRooms ?? []).map(async (room) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content")
        .eq("chat_room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const product = (
        Array.isArray(room.products) ? room.products[0] : room.products
      ) as { id: string; title: string; image_urls: string[] } | null;

      const otherId =
        room.buyer_id === user.id ? room.seller_id : room.buyer_id;

      return {
        id: room.id,
        created_at: room.created_at,
        buyer_id: room.buyer_id,
        seller_id: room.seller_id,
        product,
        lastMessage: lastMsg?.content ?? null,
        // メールアドレスの代わりに短縮IDで表示
        otherDisplayName: shortId(otherId),
      };
    })
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className="size-5" />
        <h1 className="text-xl font-semibold">メッセージ</h1>
        <span className="text-sm text-muted-foreground">
          ({rows.length} 件)
        </span>
      </div>

      {!rows.length && (
        <div className="rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          メッセージはまだありません。
        </div>
      )}

      <div className="space-y-2">
        {rows.map((room) => (
          <Link
            key={room.id}
            href={`/messages/${room.id}`}
            className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* 商品サムネイル */}
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {room.product?.image_urls?.[0] ? (
                <Image
                  src={room.product.image_urls[0]}
                  alt={room.product.title ?? ""}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            {/* 情報 */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {room.product?.title ?? "（商品削除済み）"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                相手: {room.otherDisplayName}
              </p>
              {room.lastMessage && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {room.lastMessage}
                </p>
              )}
            </div>

            {/* 日時 */}
            <p className="shrink-0 text-xs text-muted-foreground">
              {new Date(room.created_at).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
