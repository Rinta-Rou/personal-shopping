"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, X, ImagePlus } from "lucide-react";
import Image from "next/image";
import { cn } from "cn";

type ActionState = { error: string } | null;
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type ExistingImage = { url: string; markedForRemoval: boolean };

type Props = {
  action: Action;
  initialData?: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    image_urls: string[];
  };
};

/**
 * 商品追加・編集で共通利用するフォームUI。
 */
export function ProductForm({ action, initialData }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 既存画像の管理（編集時）
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    initialData?.image_urls.map((url) => ({ url, markedForRemoval: false })) ??
      []
  );

  // 新規追加ファイルのプレビュー
  const [previews, setPreviews] = useState<string[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...urls]);
  }

  function removeExisting(index: number) {
    setExistingImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, markedForRemoval: true } : img
      )
    );
  }

  function removePreview(index: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    // ファイル入力をリセット（簡易的にinput valueをクリア）
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const keepImages = existingImages.filter((img) => !img.markedForRemoval);

  return (
    <form action={formAction} className="space-y-6">
      {/* 編集時はidを hidden で送る */}
      {initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}

      {/* 削除せずに残す既存画像URLをhiddenで送信 */}
      {keepImages.map((img) => (
        <input
          key={img.url}
          type="hidden"
          name="existing_image_urls"
          value={img.url}
        />
      ))}

      {/* タイトル */}
      <div className="space-y-1.5">
        <Label htmlFor="title">商品タイトル</Label>
        <Input
          id="title"
          name="title"
          placeholder="例: ヴィンテージデニムジャケット"
          required
          defaultValue={initialData?.title}
        />
      </div>

      {/* 説明 */}
      <div className="space-y-1.5">
        <Label htmlFor="description">商品説明</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="状態・サイズ・素材など詳しく記入してください"
          rows={5}
          required
          defaultValue={initialData?.description}
        />
      </div>

      {/* 価格 / 通貨 */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="price">価格</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="1"
            placeholder="3000"
            required
            defaultValue={initialData?.price}
          />
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="currency">通貨</Label>
          <select
            id="currency"
            name="currency"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            defaultValue={initialData?.currency ?? "JPY"}
          >
            <option value="JPY">JPY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      {/* 画像 */}
      <div className="space-y-2">
        <Label>商品画像</Label>

        {/* 既存画像プレビュー（編集時） */}
        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingImages.map((img, i) =>
              img.markedForRemoval ? null : (
                <div key={img.url} className="relative size-20">
                  <Image
                    src={img.url}
                    alt={`既存画像 ${i + 1}`}
                    fill
                    sizes="80px"
                    className="rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExisting(i)}
                    className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* 新規追加プレビュー */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((url, i) => (
              <div key={url} className="relative size-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`プレビュー ${i + 1}`}
                  className="size-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePreview(i)}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ファイル選択 */}
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-neutral-50">
          <ImagePlus className="size-4" />
          画像を選択（複数可）
          <input
            ref={fileInputRef}
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* エラー表示 */}
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* 送信 */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中…
            </>
          ) : initialData ? (
            "変更を保存"
          ) : (
            "商品を登録"
          )}
        </Button>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
