"use client";

import React from "react";
import App from "../../../App";
import { dashboardScope } from "../logic/scopeConfig";

export default function DashboardPage() {
  return (
    <main data-scope={dashboardScope.id}>
      <App />
    </main>
  );
}
