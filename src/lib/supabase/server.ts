import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component / Server Actions / Route Handler 用 Supabase クライアント。
 * リクエストごとに必ず新しいインスタンスを生成する。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Server Component からは Set-Cookie できないケースがあるが、
        // proxy.ts（ミドルウェア）でセッション更新を担保するため省略は許容。
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 内では Set-Cookie が無効な場合がある。
            // proxy.ts でセッション更新を行っていれば問題なし。
          }
        },
      },
    }
  );
}
