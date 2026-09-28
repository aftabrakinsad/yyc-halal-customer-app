import { avatarUrl, requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CartProvider } from "@/components/cart/CartProvider";
import { ToastProvider } from "@/components/shell/Toaster";
import { RealtimeProvider } from "@/components/shell/RealtimeProvider";
import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";

// Every page in this group requires a signed-in customer.
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  return (
    <CartProvider userId={user.id}>
      <ToastProvider>
        <RealtimeProvider initialUnread={unread}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
            Skip to content
          </a>
          <AppHeader name={user.name} imageUrl={avatarUrl(user)} />
          <main id="main" className="pb-nav mx-auto w-full max-w-6xl px-4 pt-5">
            {children}
          </main>
          <BottomNav />
        </RealtimeProvider>
      </ToastProvider>
    </CartProvider>
  );
}
