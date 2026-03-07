import type { Metadata } from "next";
import "./globals.css";
import "../index.css";
import DashboardProviders from "../features/dashboard/providers/DashboardProviders";

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
    <html lang="en">
      <body>
        <DashboardProviders>{children}</DashboardProviders>
      </body>
    </html>
  );
}
