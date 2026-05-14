import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRecentRegistrations, getCitasDelDia, getGuardiaEventosHoy, getResponsables } from "@/app/actions";
import PWAHomeGuardia from "./PWAHomeGuardia";

export default async function PWAHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pwa");

  const role = user.user_metadata?.role as string | undefined;
  if (role === "administrador") redirect("/admin");
  if (role === "supervisor")    redirect("/pwa/supervisor");

  const plant     = user.user_metadata?.plant  as string ?? "";
  const guardName = user.user_metadata?.nombre as string ?? user.email ?? "Guardia";

  const [{ records }, citas, eventos, responsables] = await Promise.all([
    getRecentRegistrations(plant, 100),
    getCitasDelDia(plant),
    getGuardiaEventosHoy(plant),
    getResponsables(),
  ]);

  return (
    <PWAHomeGuardia
      plant={plant}
      guardName={guardName}
      initialRecords={records}
      initialCitas={citas}
      initialEventos={eventos}
      responsables={responsables}
    />
  );
}
