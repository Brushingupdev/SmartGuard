import { NextRequest, NextResponse } from "next/server";
import { getCompanySettings, getReporteData } from "@/app/actions";
import { buildEmptyPdfHtml, buildPdfReportHtml } from "./_pdfReport";

export const runtime = "nodejs";

function getPdfQueryParams(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const plant = searchParams.get("plant") ?? "Todos";
  const timeframe = searchParams.get("timeframe") ?? "Día";
  const segmentsRaw = searchParams.get("segments") ?? undefined;
  const soloDemoras = searchParams.get("soloDemoras") === "1";
  const site = searchParams.get("site") ?? undefined;

  return {
    plant,
    timeframe,
    segments: segmentsRaw ? segmentsRaw.split(",") : undefined,
    soloDemoras,
    site,
  };
}

export async function GET(request: NextRequest) {
  const { plant, timeframe, segments, soloDemoras, site } = getPdfQueryParams(request);

  const [data, company] = await Promise.all([
    getReporteData(plant, timeframe, segments, soloDemoras, site),
    getCompanySettings(),
  ]);

  if (!data) {
    return new NextResponse(buildEmptyPdfHtml(), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = buildPdfReportHtml(data, {
    companyName: company?.name ?? "SmartGuard",
    logoUrl: company?.logo_url ?? null,
    plant,
    timeframe,
    segments,
    soloDemoras,
    site,
    sector: company?.sector ?? null,
    contactName: company?.contact_name ?? null,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
