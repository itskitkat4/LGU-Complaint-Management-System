import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import AdminLayout from "../../layouts/AdminLayout";
import { Icon, inputClass } from "../../components/ui";
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

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

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
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              User management
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              View and manage staff accounts, roles and activation status.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Icon name="user-plus" className="h-4 w-4" />
            Create Account
          </button>
        </div>

        {/* Success Message */}
        {actionMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {actionMessage}
          </div>
        )}

        {/* Create Staff Account Form */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeCreateForm();
            }}
          >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 id="create-account-title" className="text-lg font-semibold text-slate-900">
                  Create Account
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the staff member's account information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close create account dialog"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {formLoading ? (
              <div role="status" className="space-y-4">
                <span className="sr-only">
                  Loading barangays and departments...
                </span>

                <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="mb-2 h-4 w-24 rounded" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ))}
                </div>

                <div
                  aria-hidden="true"
                  className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"
                >
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-36 rounded-lg" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Full Name
                    </label>

                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={handleFormChange}
                      placeholder="Enter full name"
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="Enter email address"
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      htmlFor="role"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Staff Role
                    </label>

                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleFormChange}
                      className={inputClass}
                      required
                    >
                      {roleOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barangay Assignment */}
                  {needsBarangay && (
                    <div>
                      <label
                        htmlFor="barangay_id"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Assigned Barangay
                      </label>

                      <select
                        id="barangay_id"
                        name="barangay_id"
                        value={form.barangay_id}
                        onChange={handleFormChange}
                        className={inputClass}
                        required
                      >
                        <option value="">Select barangay</option>

                        {barangays.map((barangay) => (
                          <option
                            key={barangay.id}
                            value={barangay.id}
                          >
                            {barangay.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Department Assignment */}
                  {needsDepartment && (
                    <div>
                      <label
                        htmlFor="department_id"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Assigned Department
                      </label>

                      <select
                        id="department_id"
                        name="department_id"
                        value={form.department_id}
                        onChange={handleFormChange}
                        className={inputClass}
                        required
                      >
                        <option value="">Select department</option>

                        {departments.map((department) => (
                          <option
                            key={department.id}
                            value={department.id}
                            disabled={
                              form.role === "Department_Head" &&
                              departmentsWithActiveHead.has(department.id)
                            }
                          >
                            {department.name}
                            {form.role === "Department_Head" &&
                            departmentsWithActiveHead.has(department.id)
                              ? " (Head assigned)"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateForm}
                    disabled={submitting}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Creating account..."
                      : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </section>
          </div>
        )}

        {/* Staff Accounts */}
        <section className="rounded-xl border border-slate-200 bg-white">
          {/* Search and Role Filters */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:p-5">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="user-search" className="sr-only">
                Search users by name or email
              </label>

              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                id="user-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="sm:w-60">
              <label htmlFor="role-filter" className="sr-only">
                Filter by role
              </label>

              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={inputClass}
              >
                <option value="All">All roles</option>

                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div role="status" className="overflow-x-auto">
              <span className="sr-only">Loading staff accounts...</span>

              <table
                className="w-full min-w-[900px] text-left text-sm"
                aria-hidden="true"
              >
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {["User", "Email", "Role", "Status", "Action"].map(
                      (heading) => (
                        <th key={heading} className="px-5 py-3.5">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                          <Skeleton className="h-4 w-32 rounded" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-48 rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-7 w-20 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error State */}
          {error && (
            <p className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Staff Accounts Table */}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <caption className="sr-only">
                    Staff accounts
                  </caption>

                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "User",
                        "Email",
                        "Role",
                        "Status",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-5 py-3.5"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-slate-50"
                      >
                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                              {user.full_name?.charAt(0).toUpperCase() || "U"}
                            </span>

                            <span className="font-semibold text-slate-900">
                              {user.full_name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4 text-slate-600">
                          {user.email}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                            {roleLabel(user.role)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                                : "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.is_active
                                  ? "bg-emerald-600"
                                  : "bg-slate-400"
                              }`}
                            />

                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          {user.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(user)}
                              disabled={deactivatingId === user.id}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deactivatingId === user.id
                                ? "Deactivating..."
                                : "Deactivate"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Deactivated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {filteredUsers.length === 0 && (
                <div className="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                    <Icon name="users" className="h-6 w-6" />
                  </span>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No matching users found
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Try a different name, email or role filter.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Staff account information is retrieved from the BantaySerbisyo
          database.
        </p>
      </div>
    </AdminLayout>
  );
}
