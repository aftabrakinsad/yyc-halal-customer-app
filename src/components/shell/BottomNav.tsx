"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../cart/CartProvider";
import { isActive, NAV_ITEMS } from "./nav-items";

/** Large, labelled bottom tabs for phones. */
export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  active ? "text-brand-700" : "text-muted"
                }`}
              >
                <span className={`relative rounded-full px-4 py-1 ${active ? "bg-brand-100" : ""}`}>
                  <Icon width={24} height={24} />
                  {href === "/cart" && count > 0 && (
                    <span className="absolute -top-1 right-1 min-w-5 rounded-full bg-accent-500 px-1.5 text-center text-[11px] leading-5 font-bold text-white">
                      {count}
                      <span className="sr-only"> items in cart</span>
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
