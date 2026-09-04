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
// 新規会員登録（メール + パスワードのみ）
// ----------------------------------------------------------------
export async function signUpAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: toJaMessage(error.message) };
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
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "リクエストが多すぎます。しばらく待ってからお試しください。";
  return msg;
}
