import type { Permission } from "@/lib/permissions";

export const STORE_NAV: { href: string; label: string; permission: Permission }[] = [
  { href: "/store", label: "Dashboard", permission: "viewOrders" },
  { href: "/store/orders", label: "Orders", permission: "viewOrders" },
  { href: "/store/products", label: "Products", permission: "manageProducts" },
  { href: "/store/inventory", label: "Inventory", permission: "manageInventory" },
  { href: "/store/refunds", label: "Refunds", permission: "refund" },
  { href: "/store/flyers", label: "Flyers", permission: "manageFlyers" },
  { href: "/store/reports", label: "Reports", permission: "viewReports" },
  { href: "/store/employees", label: "Employees", permission: "manageEmployees" },
  { href: "/store/settings", label: "Settings", permission: "manageSettings" },
  { href: "/store/audit", label: "Audit Log", permission: "viewAuditLogs" },
];
