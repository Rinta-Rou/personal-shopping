# C2CグローバルECサイト 開発仕様書（Kiro参照用）

## 1. システム概要
* **システム名**: C2CグローバルECサイト（管理者出品型）
* **ターゲット**: 世界中の購入者（Buyer）および サイト管理者（Admin）
* **コンセプト**: 個人の所有物を世界中の人と取引できる、リアルタイム翻訳・自動決済機能付きショッピングサイト。

---

## 2. 技術スタック & インフラ構成

| 役割 | 採用技術 | 選定理由・役割 |
| :--- | :--- | :--- |
| **フレームワーク** | Next.js (App Router, TypeScript) | 画面（フロント）とAPI（バック）を統一構築 |
| **UI・デザイン** | Tailwind CSS, shadcn/ui, Lucide Icons | 洗練されたレスポンシブデザイン |
| **バックエンド・DB** | Supabase (PostgreSQL, Auth, Storage, Realtime) | データベース、認証（SMS/メール）、画像保存、RLS |
| **決済** | Stripe (Stripe Checkout / Webhook) | クレジットカード決済処理 |
| **メール送信** | Resend API | カート追加時・注文完了時のメール通知 |
| **自動翻訳** | OpenAI API (`gpt-4o-mini`) | ボタン押下時の日英相互翻訳 |

---

## 3. ユーザー権限とアクセス制限（RBAC）

### アクセス権限一覧

| 機能 | 未ログイン（ゲスト） | ログイン済み（本人確認済み） | 管理者（Admin） |
| :--- | :---: | :---: | :---: |
| 商品閲覧・検索・翻訳 | ⭕️ 可能 | ⭕️ 可能 | ⭕️ 可能 |
| お気に入り登録 | ❌（`/login` へ遷移） | ⭕️ 可能 | ⭕️ 可能 |
| カートに追加 | ❌（`/login` へ遷移） | ⭕️ 可能 | ⭕️ 可能 |
| 商品DMの送信 | ❌（`/login` へ遷移） | ⭕️ 可能 | ⭕️ 可能 |
| Stripe購入手続き | ❌（`/login` へ遷移） | ⭕️ 可能 | 該当なし |
| 商品管理（追加・編集・削除） | ❌ 不可 | ❌ 不可 | ⭕️ 可能（`/admin`） |

* **本人確認（KYC）ルール**: 会員登録時に「メールアドレス ＋ パスワード ＋ 電話番号（SMS認証）」を必須化します。「ログインできている＝本人確認完了」とみなします。

---

## 4. データベース設計 & RLSセキュリティ (Supabase PostgreSQL)

```sql
-- 1. ユーザープロフィール（auth.usersと連動）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'buyer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 商品情報（1点もの前提：売り切れフラグ管理）
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JPY',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. お気に入り
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 4. カート情報
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 注文履歴
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 注文明細
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL
);

-- 7. チャットルーム（商品ごとのDMスレッド）
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- 8. メッセージ詳細
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- トリガー：新規ユーザー登録時に自動でprofilesテーブルを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN   INSERT INTO public.profiles (id, email, phone_number, role)   VALUES (     NEW.id,     NEW.email,     NEW.phone_number,     'buyer'   );   RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) セキュリティの有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS セキュリティポリシー定義
-- 商品：全員閲覧可能。追加・編集・削除は管理者（admin）のみ
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin Write Products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- お気に入り・カート：自分のデータのみ参照・操作可能
CREATE POLICY "Users Own Favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users Own Carts" ON public.carts FOR ALL USING (auth.uid() = user_id);

-- 注文履歴：本人のみ参照可能（管理者は全参照可能）
CREATE POLICY "Users Own Orders" ON public.orders FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DMルーム＆メッセージ：関係者（購入希望者 または 管理者）のみ参照・送信可能
CREATE POLICY "Chat Room Participants" ON public.chat_rooms FOR SELECT USING (
  auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Message Participants" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = messages.chat_room_id
    AND (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);

## 5. 主要機能の仕様詳細

### 5.1 認証とアクセスガード
* **画面 (`/login`)**: メールアドレス＋パスワード入力およびSMSコード送信フォーム。
* **ミドルウェア制御**: 未ログインユーザーが `/cart`, `/chats`, `/admin` や「お気に入り」「カート追加」のボタンを押した場合、自動的に `/login` へ画面遷移。

### 5.2 カート機能とResendメール通知
* **カート追加処理**: 商品詳細ページ等から実行。
* **メール通知（Resend API）**: カートに商品が入った瞬間、管理者アドレス（`ADMIN_EMAIL`）宛に「ユーザー〇〇が商品〇〇をカートに入れました」という通知メールを即時送信。（※この時点では取り置き・在庫削減はしない）

### 5.3 Stripe決済連携と在庫更新
* **決済フロー**: カート画面からStripe Checkoutへ遷移してクレジットカード決済。
* **Webhook処理 (`/api/webhooks/stripe`)**:
  1. `orders` テーブルに購入履歴を作成（`status = 'completed'`）。
  2. 購入された商品の `is_sold_out`（売り切れフラグ）を `true` に更新。
  3. 該当ユーザーのカートから商品を削除。
  4. 該当商品の `chat_rooms` の `last_purchased_at`（購入完了日時）を更新。

### 5.4 商品詳細起点DMシステム（7日間期限ルール）
* **DM開始ボタン**: 商品詳細ページ内に「出品者に質問する（DM）」ボタンを配置。
* **ルーム判定**: ボタン押下時、`(product_id, buyer_id)` に該当するチャットルームを取得（無ければ新規作成）してチャット画面を開く。
* **7日間の期限制限**:
  * **購入前**: 期限なくいつでもメッセージ送信可能。
  * **購入後**: `last_purchased_at`（購入日時）から **7日以内（168時間以内）** のみ送信可能。7日経過後はメッセージ入力欄を非活性化し、「購入後1週間のDM可能期間が終了しました」と表示。

### 5.5 ボタン式自動翻訳（OpenAI API）
* **翻訳ボタン**: 各メッセージの下部に「翻訳する（Translate）」ボタンを設置。
* **挙動**: ボタン押下時、OpenAI API (`gpt-4o-mini`) を呼び出し、元の言語（日本語/英語）を自動判別して相互翻訳したテキストをメッセージ下部にリアルタイム表示。

---

## 6. 実装フェーズ（ロードマップ）

### Step 1: データベース構築 ＆ 認証基盤
* Supabase SQL EditorでスキーマとRLSポリシーを実行。
* Next.js側で `@supabase/ssr` の環境設定。
* `/login` 画面（SMS認証対応）とアクセス制御ミドルウェアの実装。

### Step 2: 管理者画面 (`/admin`)
* 商品の新規投稿（Supabase Storage `product-images` への画像アップロード含む）、編集、削除機能。

### Step 3: 一般向け商品画面 ＆ カートシステム
* トップ画面（一覧）、商品詳細画面、お気に入り機能。
* カート追加処理 ＆ Resend APIによる管理者宛てメール通知機能。

### Step 4: Stripe決済 ＆ Webhook処理
* Stripe Checkout連携。
* 決済完了時のWebhook（在庫売り切れ化、注文データ生成、カート削除）。

### Step 5: DMチャット ＆ ボタン翻訳機能
* Supabase Realtimeを使用したリアルタイムDM画面（`/chats/[id]`）。
* 購入後7日間の期限制御ロジック。
* OpenAI APIを使ったボタン押下時の日英翻訳機能。