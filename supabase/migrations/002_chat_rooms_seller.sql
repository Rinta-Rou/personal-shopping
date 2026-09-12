-- ============================================================
-- Migration 002: chat_rooms に seller_id 追加・RLS更新
-- products に seller_id 追加
-- ============================================================

-- products に seller_id を追加（管理者が出品者）
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- chat_rooms に seller_id を追加
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- UNIQUE 制約を product_id + buyer_id + seller_id に更新
ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_product_id_buyer_id_key;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_product_buyer_seller_key
  UNIQUE (product_id, buyer_id, seller_id);

-- chat_rooms の RLS ポリシーを再作成
DROP POLICY IF EXISTS "chat_rooms: 当事者のみ" ON public.chat_rooms;

CREATE POLICY "chat_rooms: 参加者のみ参照" ON public.chat_rooms
  FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

CREATE POLICY "chat_rooms: buyer のみ作成" ON public.chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id
  );

-- messages の RLS ポリシーを更新（seller_id 対応）
DROP POLICY IF EXISTS "messages: 参加者のみ" ON public.messages;

CREATE POLICY "messages: 参加者のみ参照・送信" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.chat_room_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- profiles: 会話相手のプロフィールを参照可能にする
DROP POLICY IF EXISTS "profiles: 本人のみ参照" ON public.profiles;

CREATE POLICY "profiles: 本人または会話相手が参照可" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE (buyer_id = auth.uid() AND seller_id = profiles.id)
         OR (seller_id = auth.uid() AND buyer_id = profiles.id)
    )
  );

-- Supabase Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
