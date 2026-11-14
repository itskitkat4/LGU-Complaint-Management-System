import RoleDashboard from "../../src/components/RoleDashboard";

export default function AdminHome() {
  return (
    <RoleDashboard
      role="System Administrator"
      title="Administration"
      modules={["Overview", "User and staff accounts", "Barangays", "Departments"]}
    />
  );
}
