import { getCitasDelDia, getRecentRegistrations } from "@/app/actions";

export type RecentRegistration =
  Awaited<ReturnType<typeof getRecentRegistrations>>["records"][number];

export type CitaRow = Awaited<ReturnType<typeof getCitasDelDia>>[number];
