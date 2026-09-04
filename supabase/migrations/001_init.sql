-- ============================================================
-- C2C グローバルECサイト 初期スキーマ & RLSポリシー
-- Supabase SQL Editor でそのまま実行してください
-- ============================================================

-- ----------------------------------------------------------------
-- 1. profiles（auth.users と 1:1 連動）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  phone_number TEXT,
  role         TEXT        NOT NULL DEFAULT 'buyer'
                           CHECK (role IN ('admin', 'buyer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. products（1点もの前提：売り切れフラグ管理）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  price       NUMERIC     NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'JPY',
  image_urls  TEXT[]      NOT NULL DEFAULT '{}',
  is_sold_out BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. favorites（お気に入り）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ----------------------------------------------------------------
-- 4. carts（カート情報）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. orders（注文履歴）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT        UNIQUE,
  total_amount      NUMERIC     NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 6. order_items（注文明細）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID    NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price      NUMERIC NOT NULL
);

-- ----------------------------------------------------------------
-- 7. chat_rooms（商品ごとのDMスレッド）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_purchased_at   TIMESTAMPTZ,                      -- 購入完了日時（NULL = 未購入）
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, buyer_id)
);

-- ----------------------------------------------------------------
-- 8. messages（メッセージ詳細）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID        NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- トリガー: 新規ユーザー登録時に profiles へ自動挿入
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    'buyer'
  );
  RETURN NEW;
END;
$$;

-- 既存トリガーがあれば差し替える
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- Row Level Security の有効化
-- ================================================================
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages    ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS ポリシー定義
-- ================================================================

-- ----------------------------------------------------------------
-- profiles
--   本人のみ参照・更新。管理者は全件参照可能。
-- ----------------------------------------------------------------
CREATE POLICY "profiles: 本人のみ参照" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: 本人のみ更新" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ----------------------------------------------------------------
-- products
--   全員参照可。書き込み（INSERT / UPDATE / DELETE）は admin のみ。
-- ----------------------------------------------------------------
CREATE POLICY "products: 全員参照可" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products: admin のみ INSERT" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "products: admin のみ UPDATE" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "products: admin のみ DELETE" ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- favorites
--   本人のデータのみ全操作可。
-- ----------------------------------------------------------------
CREATE POLICY "favorites: 本人のみ" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- carts
--   本人のデータのみ全操作可。
-- ----------------------------------------------------------------
CREATE POLICY "carts: 本人のみ" ON public.carts
  FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- orders
--   参照: 本人 または admin。
--   挿入・更新・削除: 本人のみ（Webhook は service_role で実行）。
-- ----------------------------------------------------------------
CREATE POLICY "orders: 本人または admin が参照" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "orders: 本人のみ INSERT" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders: 本人のみ UPDATE" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- order_items
--   親 order の所有者 または admin のみ参照可。
-- ----------------------------------------------------------------
CREATE POLICY "order_items: 本人または admin が参照" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

CREATE POLICY "order_items: 本人のみ INSERT" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- chat_rooms
--   buyer（本人）または admin のみ参照・操作可。
-- ----------------------------------------------------------------
CREATE POLICY "chat_rooms: 当事者のみ" ON public.chat_rooms
  FOR ALL USING (
    auth.uid() = buyer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- messages
--   チャットルームの参加者（buyer または admin）のみ参照・送信可。
-- ----------------------------------------------------------------
CREATE POLICY "messages: 参加者のみ" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.chat_room_id
        AND (
          buyer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );
