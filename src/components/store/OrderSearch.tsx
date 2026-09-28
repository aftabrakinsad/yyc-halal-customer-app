import { SearchIcon } from "../icons";

/** Plain GET form so search works instantly and results are linkable. Order number first. */
export function OrderSearch({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/store/orders" role="search" className="flex gap-2">
      <label className="relative flex-1">
        <span className="sr-only">Search orders</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Order number (e.g. YYC-2026-001245 or 1245), customer name or email"
          className="input min-h-14 pl-12 text-lg"
          autoComplete="off"
        />
      </label>
      <button className="btn-primary min-h-14 px-6">Search</button>
    </form>
  );
}
