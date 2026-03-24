import PortalShell from "@/components/layout/PortalShell";
import { userNavItems } from "@/config/navigation";
import RoleGuard from "@/components/auth/RoleGuard";
import UserPushRegistration from "@/components/notifications/UserPushRegistration";

export default function UserLayout({ children }) {
  return (
    <RoleGuard allowedRole="user">
      <PortalShell title="Resident Portal" items={userNavItems} pageTitle="Resident">
        <UserPushRegistration />
        {children}
      </PortalShell>
    </RoleGuard>
  );
}
