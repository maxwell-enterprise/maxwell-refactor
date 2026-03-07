import type { ReactNode } from "react";

export const metadata = {
  title: "Dashboard - Maxwell Leadership Enterprise",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

