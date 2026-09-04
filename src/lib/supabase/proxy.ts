import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * proxy.ts（ミドルウェア）専用 Supabase クライアント。
 * セッショントークンのリフレッシュを request/response 双方に書き戻す。
 */
export async function updateSession(request: NextRequest) {
  // レスポンスを先に作っておき、Set-Cookie を書き込めるようにする
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // リクエストにも書き込んでおくと、後続の Server Component が参照できる
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // レスポンスに Set-Cookie を追加
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションを検証（ここで必要に応じてトークンリフレッシュが走る）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
