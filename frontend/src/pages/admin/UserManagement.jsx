import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AdminLayout from "../../layouts/AdminLayout";
import { CreateStaffAccountDialog, StaffAccountsTable } from "./UserManagementSections";
import {
  getStaffAccounts,
  createStaffAccount,
  deactivateStaffAccount,
  getBarangays,
  getDepartments,
} from "../../lib/api";

const roleOptions = [
  { value: "LGU-Staff", label: "LGU Staff" },
  { value: "Barangay_Head", label: "Barangay Head" },
  { value: "Department_Head", label: "Department Head" },
  { value: "Department_Personnel", label: "Department Personnel" },
];

const roleLabel = (role) =>
  roleOptions.find((option) => option.value === role)?.label ?? role;

const initialForm = {
  full_name: "",
  email: "",
  role: "LGU-Staff",
  barangay_id: "",
  department_id: "",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [barangays, setBarangays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deactivatingId, setDeactivatingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  // Retrieve staff accounts
  async function loadStaffAccounts() {
    try {
      const staff = await getStaffAccounts();
      setUsers(staff);
    } catch (error) {
      setError(error.message || "Failed to load staff accounts.");
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  queueMicrotask(() => {
    void loadStaffAccounts();
  });
}, []);

  useEffect(() => {
    if (!showForm) return undefined;

    function handleDialogKeyDown(event) {
      if (event.key === "Escape" && !submitting) {
        setShowForm(false);
        setForm(initialForm);
        setFormError("");
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => window.removeEventListener("keydown", handleDialogKeyDown);
  }, [showForm, submitting]);

  // Open the staff creation form and retrieve assignments
  async function openCreateForm() {
    setShowForm(true);
    setFormError("");
    setActionMessage("");

    try {
      setFormLoading(true);

      const [barangayData, departmentData] = await Promise.all([
        getBarangays(),
        getDepartments(),
      ]);

      setBarangays(barangayData);
      setDepartments(departmentData);
    } catch (error) {
      setFormError(
        error.message || "Failed to load barangays and departments."
      );
    } finally {
      setFormLoading(false);
    }
  }

  function closeCreateForm() {
    if (submitting) return;
    setShowForm(false);
    setForm(initialForm);
    setFormError("");
  }

  // Handle form field changes
  function handleFormChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "role"
        ? { barangay_id: "", department_id: "" }
        : {}),
    }));
  }

  // Create staff account
  async function handleCreateStaff(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setFormError("");
      setActionMessage("");

      const staffData = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        barangay_id: form.barangay_id || null,
        department_id: form.department_id || null,
      };

      await createStaffAccount(staffData);

      const updatedStaff = await getStaffAccounts();
      setUsers(updatedStaff);

      setForm(initialForm);
      setShowForm(false);

      setActionMessage(
        "Staff account invitation sent successfully."
      );
    } catch (error) {
      setFormError(
        error.message || "Failed to create  account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Deactivate staff account
  async function handleDeactivate(staff) {
    const { isConfirmed } = await Swal.fire({
      title: "Deactivate staff account?",
      text: `${staff.full_name}'s account will no longer be able to access the system.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#b91c1c",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!isConfirmed) return;

    try {
      setDeactivatingId(staff.id);
      setActionMessage("");
      setError("");

      await deactivateStaffAccount(staff.id);

      const updatedStaff = await getStaffAccounts();
      setUsers(updatedStaff);

      setActionMessage(
        `${staff.full_name}'s account has been deactivated.`
      );
    } catch (error) {
      setError(error.message || "Failed to deactivate staff account.");
    } finally {
      setDeactivatingId(null);
    }
  }

  // Filter staff accounts
  const filteredUsers = users.filter((user) => {
    const matchesSearch = `${user.full_name} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const needsBarangay = form.role === "Barangay_Head";

  const needsDepartment = [
    "Department_Head",
    "Department_Personnel",
  ].includes(form.role);

  const departmentsWithActiveHead = new Set(
    users
      .filter((user) => user.role === "Department_Head" && user.is_active)
      .map((user) => user.department_id)
  );

  return (
    <AdminLayout title="User Management" role="System Administrator">
      <div className="space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                User management
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                View and manage staff accounts, roles and activation status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Create Account
          </button>
        </div>

        {/* Success Message */}
        {actionMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {actionMessage}
          </div>
        )}

        <CreateStaffAccountDialog
          showForm={showForm}
          closeCreateForm={closeCreateForm}
          submitting={submitting}
          formError={formError}
          formLoading={formLoading}
          form={form}
          handleFormChange={handleFormChange}
          needsBarangay={needsBarangay}
          barangays={barangays}
          needsDepartment={needsDepartment}
          departments={departments}
          departmentsWithActiveHead={departmentsWithActiveHead}
          handleCreateStaff={handleCreateStaff}
          roleOptions={roleOptions}
        />

        <StaffAccountsTable
          search={search}
          setSearch={setSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          loading={loading}
          error={error}
          filteredUsers={filteredUsers}
          deactivatingId={deactivatingId}
          handleDeactivate={handleDeactivate}
          roleLabel={roleLabel}
          roleOptions={roleOptions}
        />

        <p className="text-xs text-slate-500">
          Staff account information is retrieved from the BantaySerbisyo
          database.
        </p>
      </div>
    </AdminLayout>
  );
}
