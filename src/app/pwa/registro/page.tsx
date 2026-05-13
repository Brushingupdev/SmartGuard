import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getResponsables, getAgentes, getUserGateOptions } from "@/app/actions";
import PWARegistroWizard from "./PWARegistroWizard";

export default async function PWARegistroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pwa/login");

  const [responsables, agentes, gateOptions] = await Promise.all([
    getResponsables(),
    getAgentes(),
    getUserGateOptions(),
  ]);

  const plant = user.user_metadata?.plant as string ?? "";
  const agenteName = user.user_metadata?.nombre as string ?? user.email ?? "";

  return (
    <PWARegistroWizard
      defaultPlant={plant}
      defaultAgente={agenteName}
      responsables={responsables}
      agentes={agentes}
      gateOptions={gateOptions}
    />
  );
}
