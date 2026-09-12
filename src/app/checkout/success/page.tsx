import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const metadata = { title: "ご購入ありがとうございました | C2C Shop" };

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-green-50">
        <CheckCircle className="size-10 text-green-500" />
      </div>

      <h1 className="mb-3 text-2xl font-bold">ご購入ありがとうございました！</h1>
      <p className="mb-2 text-muted-foreground">
        決済が正常に完了しました。
      </p>
      <p className="mb-8 text-sm text-muted-foreground">
        ご登録のメールアドレスに購入確定メールをお送りしています。
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          トップページに戻る
        </Link>
      </div>
    </main>
  );
}
