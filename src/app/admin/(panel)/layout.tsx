import { AdminShell } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth/staff";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
