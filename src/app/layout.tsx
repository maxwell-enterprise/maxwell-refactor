import type { Metadata } from "next";
import "./globals.css";
import "../index.css";
import DashboardProviders from "../features/dashboard/providers/DashboardProviders";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Maxwell Leadership Enterprise",
  description: "Maxwell dashboard application powered by Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <DashboardProviders>{children}</DashboardProviders>
      </body>
    </html>
  );
}
