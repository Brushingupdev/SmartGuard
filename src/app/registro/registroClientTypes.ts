import type { GateAssignment } from "@/lib/gates";
import type { CitaRow, RecentRegistration } from "./types";

export type ModalIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

export type ConfirmActionState = {
  title: string;
  message: React.ReactNode;
  icon: ModalIcon;
  color: string;
  btnText: string;
  action: () => void;
};

export interface RegistroClientProps {
  initialAgente: string;
  initialPlant: string;
  initialPlants: string[];
  initialGateOptions: GateAssignment[];
  initialResponsablesList: string[];
  initialAgentesList: string[];
  initialRecentRegistrations: RecentRegistration[];
  initialRecentTotal: number;
  initialCitas: CitaRow[];
  initialUserRole: string;
  initialPlantAssigned: boolean;
  initialLastRefresh: string;
}
