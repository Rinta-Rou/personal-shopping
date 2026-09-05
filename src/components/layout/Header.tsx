import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { ShoppingBag, ShoppingCart, Heart, LogOut } from "lucide-react";
import { cn } from "cn";
import { signOutAction } from "@/app/actions/auth";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // カート件数
  let cartCount = 0;
  if (user) {
    const { count } = await supabase
      .from("carts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    cartCount = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2 font-bold">
          <ShoppingBag className="size-5" />
          <span className="hidden sm:inline">C2C Shop</span>
        </Link>

        {/* ナビ */}
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {/* お気に入り */}
              <Link
                href="/wishlist"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                title="お気に入り"
              >
                <Heart className="size-5" />
              </Link>

              {/* カート */}
              <Link
                href="/cart"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative")}
                title="カート"
              >
                <ShoppingCart className="size-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* ログアウト */}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                  title="ログアウト"
                >
                  <LogOut className="size-5" />
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
