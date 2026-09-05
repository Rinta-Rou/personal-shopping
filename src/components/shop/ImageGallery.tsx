"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";

type Props = {
  imageUrls: string[];
  title: string;
};

export function ImageGallery({ imageUrls, title }: Props) {
  const [selected, setSelected] = useState(0);

  if (!imageUrls.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-neutral-100 text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* メイン画像 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={imageUrls[selected]}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      {/* サムネイル一覧 */}
      {imageUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                selected === i
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={url}
                alt={`${title} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
