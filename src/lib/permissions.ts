// Store-app permissions. Used by the server (authoritative) and by the UI (to hide menus/buttons).
import { Role } from "@/generated/prisma/enums";

const EMPLOYEE: Role[] = [Role.STORE_EMPLOYEE, Role.STORE_MANAGER, Role.ADMIN];
const MANAGER: Role[] = [Role.STORE_MANAGER, Role.ADMIN];
const ADMIN: Role[] = [Role.ADMIN];

export const PERMISSIONS = {
  viewOrders: EMPLOYEE,
  updateOrderStatus: EMPLOYEE,
  printReceipt: EMPLOYEE,
  refund: MANAGER,
  cancelOrder: MANAGER,
  manageProducts: MANAGER,
  manageInventory: MANAGER,
  manageFlyers: MANAGER,
  viewReports: MANAGER,
  viewFinancialStats: MANAGER,
  manageEmployees: ADMIN,
  manageSettings: ADMIN,
  viewAuditLogs: ADMIN,
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export const REFUND_REASONS = [
  "Customer request",
  "Product unavailable",
  "Incorrect item",
  "Quality issue",
  "Duplicate charge",
  "Other",
] as const;

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Customer",
  STORE_EMPLOYEE: "Store employee",
  STORE_MANAGER: "Store manager",
  ADMIN: "Admin",
};
