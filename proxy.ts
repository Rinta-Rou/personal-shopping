import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 未ログインユーザーをガードするパス
const PROTECTED_PATHS = ["/cart", "/chats", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // セッション更新 & ユーザー取得（トークンリフレッシュも兼ねる）
  const { supabaseResponse, user } = await updateSession(request);

  // 保護ルートへのアクセス判定
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected && !user) {
    // 元のURLを next パラメータとして付与して /login へリダイレクト
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
    return NextResponse.redirect(loginUrl);
  }

  // /admin へのアクセスはさらに role === 'admin' を確認
  // role は profiles テーブルから取得する必要があるため、
  // ここでは認証済みユーザーのみ通過させ、admin ページ側で role チェックを行う。
  // （proxy はリクエストごとに DB アクセスするコストを避けるため）

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除く全リクエストに適用:
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化）
     * - favicon.ico, sitemap.xml, robots.txt
     * - public/ 配下のアセット
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
