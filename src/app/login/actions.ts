"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// ログイン
// ----------------------------------------------------------------
export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: toJaMessage(error.message) };
  }

  const next = formData.get("next") as string | null;
  redirect(next && next.startsWith("/") ? next : "/");
}

// ----------------------------------------------------------------
// 新規会員登録（メール + パスワード + SMS OTP）
// ステップ1: メール・パスワードで新規作成してSMSを送信
// ----------------------------------------------------------------
export async function signUpAction(
  _prevState: { error: string; step: "form" | "otp" } | null,
  formData: FormData
): Promise<{ error: string; step: "form" | "otp" }> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;

  // アカウント作成（メール確認は Supabase ダッシュボードで無効化推奨）
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { phone_number: phone },
    },
  });

  if (signUpError) {
    return { error: toJaMessage(signUpError.message), step: "form" };
  }

  // SMS OTP 送信
  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (otpError) {
    return { error: toJaMessage(otpError.message), step: "form" };
  }

  return { error: "", step: "otp" };
}

// ----------------------------------------------------------------
// 新規会員登録 ステップ2: SMS OTP を検証
// ----------------------------------------------------------------
export async function verifyOtpAction(
  _prevState: { error: string; step: "form" | "otp" } | null,
  formData: FormData
): Promise<{ error: string; step: "form" | "otp" }> {
  const supabase = await createClient();

  const phone = formData.get("phone") as string;
  const token = formData.get("token") as string;

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { error: toJaMessage(error.message), step: "otp" };
  }

  const next = formData.get("next") as string | null;
  redirect(next && next.startsWith("/") ? next : "/");
}

// ----------------------------------------------------------------
// エラーメッセージを日本語化
// ----------------------------------------------------------------
function toJaMessage(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "メールアドレスまたはパスワードが正しくありません。";
  if (msg.includes("Email not confirmed"))
    return "メールアドレスの確認が完了していません。";
  if (msg.includes("User already registered"))
    return "このメールアドレスはすでに登録されています。";
  if (msg.includes("Password should be"))
    return "パスワードは8文字以上で入力してください。";
  if (msg.includes("Unable to validate phone"))
    return "電話番号の形式が正しくありません（例: +819012345678）。";
  if (msg.includes("Token has expired"))
    return "認証コードの有効期限が切れました。もう一度お試しください。";
  if (msg.includes("Invalid token"))
    return "認証コードが正しくありません。";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "リクエストが多すぎます。しばらく待ってからお試しください。";
  return msg;
}
