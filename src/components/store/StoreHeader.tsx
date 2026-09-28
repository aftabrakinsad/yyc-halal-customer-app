"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { BellIcon } from "../icons";
import { useStoreRealtime } from "./StoreRealtime";

type NavItem = { href: string; label: string };

export function StoreHeader({ nav, name, roleLabel, logout }: { nav: NavItem[]; name: string; roleLabel: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const { soundOn, setSoundOn, connected, newIds } = useStoreRealtime();
  const active = (href: string) => (href === "/store" ? pathname === "/store" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-30 border-b border-brand-800 bg-brand-700 text-white">
      <div className="flex h-16 items-center gap-3 px-4">
        <Link href="/store" className="flex items-center gap-2.5" aria-label="Store dashboard">
          <Logo size={40} className="rounded-full bg-white" />
          <span className="leading-tight">
            <span className="block text-lg font-extrabold">YYC Halal</span>
            <span className="block text-xs font-semibold text-brand-100">Store</span>
          </span>
        </Link>
        <span
          className={`ml-2 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold sm:inline-flex ${connected ? "bg-brand-600" : "bg-accent-500"}`}
          role="status"
        >
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-gold-400" : "bg-white"}`} aria-hidden />
          {connected ? "Live" : "Reconnecting…"}
        </span>
        {newIds.size > 0 && (
          <Link href="/store" className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-sm font-extrabold text-ink">
            <BellIcon width={16} height={16} /> {newIds.size} new
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="hidden cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-brand-600 md:flex">
            <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} className="h-5 w-5 accent-gold-400" />
            Sound
          </label>
          <span className="hidden text-right text-sm leading-tight lg:block">
            <span className="block font-bold">{name}</span>
            <span className="block text-brand-100">{roleLabel}</span>
          </span>
          <form action={logout}>
            <button className="min-h-11 rounded-xl border-2 border-white/60 px-4 font-bold hover:bg-white hover:text-brand-800">Logout</button>
          </form>
        </div>
      </div>
      <nav aria-label="Store" className="overflow-x-auto bg-brand-800/60">
        <ul className="flex gap-1 px-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center px-4 font-semibold whitespace-nowrap ${
                  active(item.href) ? "border-b-4 border-gold-400 text-white" : "border-b-4 border-transparent text-brand-100 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
