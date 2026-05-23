import { redirect } from "next/navigation";
import { getPublicCitaPageData } from "@/app/actions/citas-public";
import CitaPublicaForm from "./CitaPublicaForm";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { readPublicCitaToken } from "@/lib/publicCitaToken";

export default async function CitaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = readPublicCitaToken(token);
  if (!decoded) redirect("/");

  const pageData = await getPublicCitaPageData(decoded.companyId, decoded.plant);
  if (!pageData) redirect("/");

  const gateLabel = formatGateLabelFromPlant(decoded.plant);

  return (
    <CitaPublicaForm
      token={token}
      companyName={pageData.companyName}
      gateLabel={gateLabel}
      responsables={pageData.responsables}
    />
  );
}

export const dynamic = "force-dynamic";
