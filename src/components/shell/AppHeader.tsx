"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { BellIcon, UserIcon } from "../icons";
import { useCart } from "../cart/CartProvider";
import { useRealtime } from "./RealtimeProvider";
import { isActive, NAV_ITEMS } from "./nav-items";

export function AppHeader({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const pathname = usePathname();
  const { count } = useCart();
  const { unread } = useRealtime();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="YYC Halal home">
          <Logo size={42} />
          <span className="leading-tight">
            <span className="block text-lg font-extrabold text-brand-700">YYC Halal</span>
            <span className="block text-xs font-semibold text-muted">Meat Shop · Calgary</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-6 hidden flex-1 md:block">
          <ul className="flex gap-1">
            {NAV_ITEMS.filter((i) => i.href !== "/profile").map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex min-h-11 items-center rounded-xl px-4 font-semibold ${
                      active ? "bg-brand-100 text-brand-800" : "text-ink hover:bg-brand-50"
                    }`}
                  >
                    {label}
                    {href === "/cart" && count > 0 && (
                      <span className="ml-2 rounded-full bg-accent-500 px-2 text-xs leading-5 font-bold text-white">
                        {count}
                        <span className="sr-only"> items</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-ink hover:bg-brand-50"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <BellIcon />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-5 rounded-full bg-accent-500 px-1 text-center text-[11px] leading-5 font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="hidden h-12 items-center gap-2 rounded-full pr-3 pl-1 hover:bg-brand-50 md:inline-flex"
            aria-label="Your profile"
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <UserIcon width={20} height={20} />
              </span>
            )}
            <span className="max-w-32 truncate font-semibold">{name.split(" ")[0]}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
