import {
  getCitasDelDia,
  getRecentRegistrations,
  getResponsables,
  getUserPlants,
} from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import RegistroClient from "./RegistroClient";

export const dynamic = "force-dynamic";

const LOAD_LIMIT = 200;

export default async function RegistroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [responsablesList, plants] = await Promise.all([
    getResponsables(),
    getUserPlants(),
  ]);

  const userRole = (user?.user_metadata?.role as string | undefined) ?? "guardia";
  const metaPlant = user?.user_metadata?.plant as string | undefined;
  const initialPlant = metaPlant || plants[0] || "";
  const plantAssigned = Boolean(metaPlant);
  const agente = user?.email
    ? user.email.split("@")[0].toUpperCase().replace(/\./g, " ").replace(/_/g, " ")
    : "";

  const [{ records, total }, citas] = initialPlant
    ? await Promise.all([
        getRecentRegistrations(initialPlant, LOAD_LIMIT, 0),
        getCitasDelDia(initialPlant),
      ])
    : [{ records: [], total: 0 }, []];

  return (
    <RegistroClient
      initialAgente={agente}
      initialPlant={initialPlant}
      initialPlants={plants}
      initialResponsablesList={responsablesList}
      initialRecentRegistrations={records}
      initialRecentTotal={total}
      initialCitas={citas}
      initialUserRole={userRole}
      initialPlantAssigned={plantAssigned}
      initialLastRefresh={initialPlant ? new Date().toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) : ""}
    />
  );
}
