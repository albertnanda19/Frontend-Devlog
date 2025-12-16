import DashboardShell from "@/components/dashboard-shell";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return <DashboardShell>{children}</DashboardShell>;
};

export default layout;
