import { redirect } from "next/navigation";
import { getPublicCitaPageData } from "@/app/actions/citas-public";
import CitaPublicaForm from "./CitaPublicaForm";
import { formatGateLabelFromPlant } from "@/lib/gates";

function decodeToken(raw: string): { companyId: string; plant: string } | null {
  try {
    const decoded = Buffer.from(decodeURIComponent(raw), "base64url").toString("utf-8");
    const sep = decoded.indexOf("|");
    if (sep < 1) return null;
    const companyId = decoded.slice(0, sep);
    const plant = decoded.slice(sep + 1);
    if (!companyId || !plant) return null;
    return { companyId, plant };
  } catch {
    return null;
  }
}

export default async function CitaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeToken(token);
  if (!decoded) redirect("/");

  const pageData = await getPublicCitaPageData(decoded.companyId, decoded.plant);
  if (!pageData) redirect("/");

  const gateLabel = formatGateLabelFromPlant(decoded.plant);

  return (
    <CitaPublicaForm
      companyId={decoded.companyId}
      companyName={pageData.companyName}
      plant={decoded.plant}
      gateLabel={gateLabel}
      responsables={pageData.responsables}
    />
  );
}

export const dynamic = "force-dynamic";
