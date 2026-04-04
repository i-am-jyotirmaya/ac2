import type { Metadata } from "next";
import { TemplateDashboard } from "@/components/dashboard/template-dashboard";
import { requireSession } from "@/lib/auth/session";
import { mockTemplates } from "@/lib/templates/mock-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <TemplateDashboard
      user={{
        email: session.user.email,
        plan: session.user.plan,
        mfaEnabled: session.user.mfaEnabled,
      }}
      initialTemplates={mockTemplates}
    />
  );
}
