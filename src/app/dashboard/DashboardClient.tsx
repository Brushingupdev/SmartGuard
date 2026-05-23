"use client";

import { DashboardClientContent } from "./DashboardClientContent";
import type { DashboardClientProps } from "./dashboardClientTypes";
import { useDashboardController } from "./useDashboardController";

export default function DashboardClient(props: DashboardClientProps) {
  const controller = useDashboardController(props);

  return <DashboardClientContent {...controller} />;
}
