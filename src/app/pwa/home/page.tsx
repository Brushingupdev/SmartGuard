import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRecentRegistrations, getCitasDelDia, getGuardiaEventosHoy, getResponsables, getUserGateOptions } from "@/app/actions";
import PWAHomeGuardia from "./PWAHomeGuardia";

export default async function PWAHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pwa");

  const role = user.user_metadata?.role as string | undefined;
  if (role === "administrador") redirect("/admin");
  if (role === "supervisor")    redirect("/pwa/supervisor");

  const companyId = (user.user_metadata?.company_id as string | undefined) ?? "";
  const plant     = user.user_metadata?.plant  as string ?? "";
  const guardName = user.user_metadata?.nombre as string ?? user.email ?? "Guardia";
  const gateOptions = await getUserGateOptions();
  const plants = gateOptions.length > 0
    ? gateOptions.map((gate) => gate.plant)
    : plant
      ? [plant]
      : [];

  const [{ records }, citas, eventos, responsables] = await Promise.all([
    getRecentRegistrations(plants, 100),
    getCitasDelDia(plants),
    getGuardiaEventosHoy(plants),
    getResponsables(),
  ]);

  return (
    <PWAHomeGuardia
      companyId={companyId}
      plant={plant}
      plants={plants}
      gateOptions={gateOptions}
      guardName={guardName}
      initialRecords={records}
      initialCitas={citas}
      initialEventos={eventos}
      responsables={responsables}
    />
  );
}
