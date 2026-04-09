"use client";

import React from "react";
import App from "../../../App";
import { dashboardScope } from "../logic/scopeConfig";

export default function DashboardPage() {
  return (
    <main
      data-scope={dashboardScope.id}
      className="flex min-h-screen w-full min-w-0 max-w-full flex-col"
    >
      <App />
    </main>
  );
}
