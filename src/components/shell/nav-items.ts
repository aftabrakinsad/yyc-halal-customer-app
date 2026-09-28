import { CartIcon, HomeIcon, ReceiptIcon, StoreIcon, UserIcon } from "../icons";

export const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/order", label: "Order", Icon: StoreIcon },
  { href: "/cart", label: "Cart", Icon: CartIcon },
  { href: "/orders", label: "My Orders", Icon: ReceiptIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
