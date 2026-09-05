"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { loginAction, signUpAction } from "./actions";

// ----------------------------------------------------------------
// ログインフォーム
// ----------------------------------------------------------------
function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="login-email">メールアドレス</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-password">パスワード</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            ログイン中…
          </>
        ) : (
          "ログイン"
        )}
      </Button>
    </form>
  );
}

// ----------------------------------------------------------------
// 会員登録フォーム（メール + パスワード）
// ----------------------------------------------------------------
function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">パスワード</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          placeholder="8文字以上"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            登録中…
          </>
        ) : (
          "会員登録"
        )}
      </Button>
    </form>
  );
}

// ----------------------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------------------
export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  return (
    <div className="w-full max-w-md">
      {/* ロゴ・タイトル */}
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <ShoppingBag className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          C2C グローバルショップ
        </h1>
        <p className="text-sm text-muted-foreground">
          世界中の出品物をあなたのもとへ
        </p>
      </div>

      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">ログイン</TabsTrigger>
          <TabsTrigger value="signup">新規会員登録</TabsTrigger>
        </TabsList>

        {/* ログインタブ */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>ログイン</CardTitle>
              <CardDescription>
                登録済みのメールアドレスとパスワードでログインしてください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm next={next} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 会員登録タブ */}
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>新規会員登録</CardTitle>
              <CardDescription>
                メールアドレスとパスワードを入力してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm next={next} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
