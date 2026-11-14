import RoleDashboard from "../../src/components/RoleDashboard";

export default function DepartmentPersonnelHome() {
  return (
    <RoleDashboard
      role="Department_Personnel"
      title="My assignments"
      modules={["Assigned complaints", "Work progress", "Resolution and evidence submission"]}
    />
  );
}
