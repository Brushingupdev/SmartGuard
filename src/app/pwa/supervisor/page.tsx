import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  getSupervisorHoyData,
  getGuardiaEventosHoy,
  getResponsables,
} from "@/app/actions";
import PWASupervisorHome from "./PWASupervisorHome";

export default async function PWASupervisorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pwa");

  const role = user.user_metadata?.role as string | undefined;
  if (role === "administrador") redirect("/admin");
  if (role === "guardia") redirect("/pwa/home");

  const supervisorName = (user.user_metadata?.nombre as string | undefined)
    ?? user.email
    ?? "Supervisor";
  const companyId = (user.user_metadata?.company_id as string | undefined) ?? "";

  const [supervisorData, responsables] = await Promise.all([
    getSupervisorHoyData(),
    getResponsables(),
  ]);

  // Eventos del día — fetching all plants for supervisor
  const plantas = supervisorData.plantas;
  const eventosAll = await Promise.all(
    plantas.map(p => getGuardiaEventosHoy(p))
  ).then(arr => arr.flat());

  return (
    <PWASupervisorHome
      supervisorName={supervisorName}
      companyId={companyId}
      initialRecords={supervisorData.records}
      initialCitas={supervisorData.citas}
      initialPlantas={plantas}
      initialEventos={eventosAll}
      responsables={responsables}
    />
  );
}
