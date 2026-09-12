import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/ChatRoom";

type Props = {
  params: Promise<{ chatRoomId: string }>;
};

export const metadata = { title: "チャット | C2C Shop" };

/** UUID 先頭8文字で表示名生成（メール非公開） */
function shortId(id: string) {
  return `ユーザー#${id.slice(0, 8)}`;
}

export default async function ChatRoomPage({ params }: Props) {
  const { chatRoomId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/messages/${chatRoomId}`);

  // RLS で自分が参加者かチェック（参加者以外は null が返る）
  const { data: chatRoom } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      buyer_id,
      seller_id,
      products ( id, title, image_urls )
    `)
    .eq("id", chatRoomId)
    .single();

  if (!chatRoom) notFound();

  // 初期メッセージ取得
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("chat_room_id", chatRoomId)
    .order("created_at", { ascending: true });

  const product = (
    Array.isArray(chatRoom.products)
      ? chatRoom.products[0]
      : chatRoom.products
  ) as { id: string; title: string; image_urls: string[] } | null;

  const otherId =
    chatRoom.buyer_id === user.id ? chatRoom.seller_id : chatRoom.buyer_id;

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-2xl flex-col">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Link
          href="/messages"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>

        {product?.image_urls?.[0] && (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
            <Image
              src={product.image_urls[0]}
              alt={product.title}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {product?.title ?? "（商品削除済み）"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {shortId(otherId)}
          </p>
        </div>

        {product && (
          <Link
            href={`/products/${product.id}`}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            商品を見る
          </Link>
        )}
      </div>

      {/* チャット本体 */}
      <ChatRoom
        chatRoomId={chatRoomId}
        initialMessages={messages ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
