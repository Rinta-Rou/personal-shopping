"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Languages } from "lucide-react";
import { cn } from "cn";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type TranslationState = {
  loading: boolean;
  text: string | null;
  show: boolean;
};

type Props = {
  chatRoomId: string;
  initialMessages: Message[];
  currentUserId: string;
};

export function ChatRoom({ chatRoomId, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Supabase Realtime 購読
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat_room:${chatRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  // 新着メッセージにスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ送信
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      chat_room_id: chatRoomId,
      sender_id: currentUserId,
      content: text,
    });

    if (error) {
      console.error("メッセージ送信失敗:", error.message);
      setInput(text);
    }
    setSending(false);
  }

  // 翻訳トグル（日本語 → 英語、その他 → 日本語 を自動判定）
  async function handleTranslate(msgId: string, content: string) {
    const current = translations[msgId];

    // 翻訳済みならトグル
    if (current?.text) {
      setTranslations((prev) => ({
        ...prev,
        [msgId]: { ...prev[msgId], show: !prev[msgId].show },
      }));
      return;
    }

    setTranslations((prev) => ({
      ...prev,
      [msgId]: { loading: true, text: null, show: false },
    }));

    try {
      const targetLanguage = /[\u3040-\u9fff]/.test(content) ? "英語" : "日本語";
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, targetLanguage }),
      });
      const data = await res.json();
      setTranslations((prev) => ({
        ...prev,
        [msgId]: { loading: false, text: data.translated ?? null, show: true },
      }));
    } catch {
      setTranslations((prev) => ({
        ...prev,
        [msgId]: { loading: false, text: null, show: false },
      }));
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* メッセージ一覧 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            まだメッセージがありません。最初のメッセージを送りましょう。
          </p>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          const trans = translations[msg.id];

          return (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}
            >
              {/* バブル */}
              <div
                className={cn(
                  "max-w-xs rounded-2xl px-4 py-2 text-sm leading-relaxed lg:max-w-md",
                  isMine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-white text-foreground shadow-sm"
                )}
              >
                {msg.content}
              </div>

              {/* 翻訳結果 */}
              {trans?.show && trans.text && (
                <div
                  className={cn(
                    "max-w-xs rounded-xl px-3 py-1.5 text-xs text-muted-foreground lg:max-w-md",
                    isMine ? "bg-primary/10" : "bg-neutral-100"
                  )}
                >
                  {trans.text}
                </div>
              )}

              {/* 翻訳ボタン */}
              <button
                type="button"
                onClick={() => handleTranslate(msg.id, msg.content)}
                disabled={trans?.loading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {trans?.loading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Languages className="size-3" />
                )}
                {trans?.show ? "原文を表示" : "翻訳"}
              </button>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 送信フォーム */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t bg-white p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="メッセージを入力..."
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={sending}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending}>
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
