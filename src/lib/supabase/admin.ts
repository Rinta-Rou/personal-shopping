import { createClient } from "@supabase/supabase-js";

/**
 * Service Role Key を使う Admin クライアント。
 * RLS をバイパスするため、Webhook など信頼済みサーバー処理のみで使用。
 * ブラウザ側に絶対に渡さないこと。
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
