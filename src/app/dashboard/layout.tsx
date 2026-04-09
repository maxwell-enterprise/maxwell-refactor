import type { ReactNode } from "react";

export const metadata = {
  title: "Dashboard - Maxwell Leadership Enterprise",
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-slate-50">
      {children}
    </div>
  );
}

