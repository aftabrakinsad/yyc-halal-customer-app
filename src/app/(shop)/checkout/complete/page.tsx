import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutComplete } from "@/components/checkout/CheckoutComplete";

export const metadata: Metadata = { title: "Order confirmation" };

export default async function CompletePage({ searchParams }: PageProps<"/checkout/complete">) {
  const { order } = await searchParams;
  if (typeof order !== "string") redirect("/orders");
  return <CheckoutComplete orderId={order} />;
}
