import RoleDashboard from "../../src/components/RoleDashboard";

export default function DepartmentHeadHome() {
  return (
    <RoleDashboard
      role="Department_Head"
      title="Department workspace"
      modules={["Department complaints", "Personnel assignments", "Progress monitoring", "Escalation activities"]}
    />
  );
}
