import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）用 Supabase クライアント。
 * コンポーネントごとに呼び出して使う。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
