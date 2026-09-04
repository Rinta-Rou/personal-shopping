import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "ログイン | C2C グローバルショップ",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4 py-12">
      <Suspense>
        <LoginClient />
      </Suspense>
    </main>
  );
}
