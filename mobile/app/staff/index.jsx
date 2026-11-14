import RoleDashboard from "../../src/components/RoleDashboard";

export default function StaffHome() {
  return (
    <RoleDashboard
      role="LGU-Staff"
      title="LGU Staff"
      modules={["Complaint queue and review", "Complaint history and routing", "Escalations", "Resolution review", "Reports and analytics"]}
    />
  );
}
