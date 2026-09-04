"use client";

import { useActionState, useEffect, useState } from "react";
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
import { loginAction, signUpAction, verifyOtpAction } from "./actions";

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
// 会員登録フォーム（メール + パスワード + SMS OTP の2ステップ）
// ----------------------------------------------------------------
function SignUpForm({ next }: { next: string }) {
  const [signUpState, signUpAction_, signUpPending] = useActionState(
    signUpAction,
    null
  );
  const [otpState, otpAction_, otpPending] = useActionState(
    verifyOtpAction,
    null
  );

  // phone は OTP 検証ステップでも使うため state で保持
  const [phone, setPhone] = useState("");

  // signUpAction が otp ステップを返したら step を切り替える
  const isOtpStep =
    signUpState?.step === "otp" && !signUpState.error;

  // OTP 検証エラーを表示するためにまとめる
  const currentError = isOtpStep
    ? otpState?.error
    : signUpState?.error;

  useEffect(() => {
    // signUp 成功後、phone の値を OTP フォームに引き継ぐ
  }, [signUpState]);

  if (isOtpStep) {
    return (
      <form action={otpAction_} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="phone" value={phone} />

        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{phone}</span>{" "}
          に認証コードをSMSで送信しました。受け取ったコードを入力してください。
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="otp-token">認証コード（6桁）</Label>
          <Input
            id="otp-token"
            name="token"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            required
            autoComplete="one-time-code"
          />
        </div>

        {currentError && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{currentError}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={otpPending}>
          {otpPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              確認中…
            </>
          ) : (
            "認証コードを確認する"
          )}
        </Button>
      </form>
    );
  }

  return (
    <form action={signUpAction_} className="space-y-4">
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

      <div className="space-y-1.5">
        <Label htmlFor="signup-phone">
          電話番号{" "}
          <span className="text-xs text-muted-foreground">
            （SMS認証用・国際形式 例: +819012345678）
          </span>
        </Label>
        <Input
          id="signup-phone"
          name="phone"
          type="tel"
          placeholder="+819012345678"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      {currentError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{currentError}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={signUpPending}>
        {signUpPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            送信中…
          </>
        ) : (
          "会員登録してSMSコードを受け取る"
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
                メールアドレス・パスワード・電話番号を登録してください。
                SMS認証で本人確認を行います。
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
