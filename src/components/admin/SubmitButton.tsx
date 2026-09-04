"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";

type Props = Omit<ComponentProps<typeof Button>, "type"> & {
  pendingLabel?: string;
};

/**
 * フォーム送信中にローディング表示するボタン。
 * confirm ダイアログが必要な場合は、親フォームの onSubmit で処理してください。
 */
export function SubmitButton({ children, pendingLabel, ...props }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="mr-1 size-3 animate-spin" />
          {pendingLabel ?? "処理中…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
