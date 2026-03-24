import PortalShell from "@/components/layout/PortalShell";
import { adminNavItems } from "@/config/navigation";
import RoleGuard from "@/components/auth/RoleGuard";

export default function AdminLayout({ children }) {
  return (
    <RoleGuard allowedRole="admin">
      <PortalShell title="Admin Portal" items={adminNavItems} pageTitle="Admin">
        {children}
      </PortalShell>
    </RoleGuard>
  );
}
