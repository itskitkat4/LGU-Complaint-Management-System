import RoleDashboard from "../../src/components/RoleDashboard";

export default function BarangayHeadHome() {
  return (
    <RoleDashboard
      role="Barangay_Head"
      title="Barangay workspace"
      modules={["Assigned complaints", "Complaint progress", "Department escalation"]}
    />
  );
}
