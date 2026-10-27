import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/auth/staff";

import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Contraseña" };

export default async function PasswordPage() {
  const { claims } = await getStaffSession();
  if (!claims) redirect("/admin/login");
  return <PasswordForm />;
}
