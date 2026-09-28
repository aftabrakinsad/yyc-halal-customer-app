import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "YYC Halal Meat Shop", template: "%s · YYC Halal" },
  description: "Order fresh halal meat online from YYC Halal in Calgary — pay securely and pick up in store.",
  applicationName: "YYC Halal",
  appleWebApp: { capable: true, title: "YYC Halal", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b6b3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
