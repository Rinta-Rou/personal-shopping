import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// targetLanguage ホワイトリスト
const ALLOWED_LANGUAGES = ["英語", "日本語", "中国語", "韓国語", "フランス語", "スペイン語"] as const;
type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

function isAllowedLanguage(v: unknown): v is AllowedLanguage {
  return ALLOWED_LANGUAGES.includes(v as AllowedLanguage);
}

export async function POST(request: Request) {
  // ① 認証チェック（未ログインは401）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ② 入力バリデーション
  const body = await request.json().catch(() => null);
  const { text, targetLanguage } = body ?? {};

  if (
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.length > 2000
  ) {
    return NextResponse.json(
      { error: "text は1〜2000文字で入力してください。" },
      { status: 400 }
    );
  }

  if (!isAllowedLanguage(targetLanguage)) {
    return NextResponse.json(
      { error: `targetLanguage は ${ALLOWED_LANGUAGES.join(" / ")} のいずれかを指定してください。` },
      { status: 400 }
    );
  }

  // ③ OpenAI API キー確認
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-...") {
    return NextResponse.json(
      { error: "翻訳機能は現在利用できません。" },
      { status: 503 }
    );
  }

  // ④ 翻訳実行
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `あなたは高精度な翻訳アシスタントです。
入力されたテキストを${targetLanguage}に翻訳してください。
翻訳文のみを返してください。説明や注釈は不要です。
文脈を理解し、自然な表現で翻訳してください。`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const translated = response.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ translated });
}
