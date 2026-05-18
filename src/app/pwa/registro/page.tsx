import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRecentRegistrations, getResponsables, getUserGateOptions } from "@/app/actions";
import PWARegistroWizard from "./PWARegistroWizard";

export default async function PWARegistroPage({
  searchParams,
}: {
  searchParams?: Promise<{ plant?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pwa/login");

  const role = user.user_metadata?.role as string | undefined;
  if (role === "administrador") redirect("/admin");
  if (role === "supervisor") redirect("/pwa/supervisor");

  const requestedParams = searchParams ? await searchParams : undefined;
  const requestedPlant = requestedParams?.plant?.trim() ?? "";
  const plant = user.user_metadata?.plant as string ?? "";
  const agenteName = user.user_metadata?.nombre as string ?? user.email ?? "";
  const gateOptions = await getUserGateOptions();
  const plants = gateOptions.length > 0
    ? gateOptions.map((gate) => gate.plant)
    : plant
      ? [plant]
      : [];
  const resolvedPlant = requestedPlant && plants.includes(requestedPlant)
    ? requestedPlant
    : plant;

  const [responsables, recentData] = await Promise.all([
    getResponsables(),
    getRecentRegistrations(plants, 8),
  ]);

  return (
    <PWARegistroWizard
      defaultPlant={resolvedPlant}
      defaultAgente={agenteName}
      responsables={responsables}
      agentes={[agenteName]}
      gateOptions={gateOptions}
      initialRecentRecords={recentData.records}
    />
  );
}
