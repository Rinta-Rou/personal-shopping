"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// 権限チェックユーティリティ
// ----------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Forbidden");

  return supabase;
}

// ----------------------------------------------------------------
// 商品削除
// ----------------------------------------------------------------
export async function deleteProductAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await requireAdmin();
  const id = formData.get("id") as string;

  // 画像URLを取得してStorageからも削除
  const { data: product } = await supabase
    .from("products")
    .select("image_urls")
    .eq("id", id)
    .single();

  if (product?.image_urls?.length) {
    const paths = product.image_urls.map((url: string) => {
      const parts = url.split("/product-images/");
      return parts[1] ?? url;
    });
    await supabase.storage.from("product-images").remove(paths);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return null;
}

// ----------------------------------------------------------------
// 売り切れフラグ切り替え
// ----------------------------------------------------------------
export async function toggleSoldOutAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await requireAdmin();
  const id = formData.get("id") as string;
  const isSoldOut = formData.get("is_sold_out") === "true";

  const { error } = await supabase
    .from("products")
    .update({ is_sold_out: !isSoldOut })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return null;
}

// ----------------------------------------------------------------
// 商品新規作成
// ----------------------------------------------------------------
export async function createProductAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await requireAdmin();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));
  const currency = (formData.get("currency") as string) || "JPY";

  // 画像アップロード処理
  const imageUrls: string[] = [];
  const files = formData.getAll("images") as File[];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    imageUrls.push(urlData.publicUrl);
  }

  const { error } = await supabase.from("products").insert({
    title,
    description,
    price,
    currency,
    image_urls: imageUrls,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  redirect("/admin");
}

// ----------------------------------------------------------------
// 商品更新
// ----------------------------------------------------------------
export async function updateProductAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await requireAdmin();

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));
  const currency = (formData.get("currency") as string) || "JPY";

  // 既存の画像URL（削除されていないもの）
  const existingUrls = formData.getAll("existing_image_urls") as string[];

  // 新規画像アップロード
  const newImageUrls: string[] = [];
  const files = formData.getAll("images") as File[];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    newImageUrls.push(urlData.publicUrl);
  }

  const imageUrls = [...existingUrls, ...newImageUrls];

  const { error } = await supabase
    .from("products")
    .update({ title, description, price, currency, image_urls: imageUrls })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  redirect("/admin");
}
