import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kutuku — Digital Kutu for Friend Groups",
  description:
    "Manage your kutu savings group the easy way. Track payments, payout schedules and never chase anyone on WhatsApp again.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
