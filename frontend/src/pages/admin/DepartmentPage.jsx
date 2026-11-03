
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { Icon, inputClass } from "../../components/ui";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../lib/api";

const INITIAL_FORM = {
  name: "",
  description: "",
};

export default function DepartmentPage() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // READ: Retrieve departments from the Laravel API.
  const fetchDepartments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getDepartments();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid department list.");
      }

      setDepartments(data);
    } catch (err) {
      setError(err.message || "Failed to load departments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Filter departments based on the search input.
  const filteredDepartments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return departments;
    }

    return departments.filter((department) => {
      const name = department.name || "";
      const description = department.description || "";

      return `${name} ${description}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [departments, search]);

  // Open a clean form for creating a department.
  const handleAdd = () => {
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setFormError("");
    setShowForm(true);
  };

  // Open the form with the selected department's information.
  const handleEdit = (department) => {
    setEditingId(department.id);
    setFormData({
      name: department.name || "",
      description: department.description || "",
    });
    setFormError("");
    setShowForm(true);
  };

  // Update a controlled form field.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CREATE or UPDATE a department.
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      setFormError("Please enter a department name.");
      return;
    }

    const payload = {
      name,
      description: description || null,
    };

    try {
      setSaving(true);
      setFormError("");

      if (editingId !== null) {
        await updateDepartment(editingId, payload);
      } else {
        await createDepartment(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ ...INITIAL_FORM });

      await fetchDepartments();
    } catch (err) {
      setFormError(err.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  // Close the form without saving.
  const handleCancel = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setFormData({ ...INITIAL_FORM });
    setFormError("");
  };

  // DELETE a department after confirmation.
  const handleDelete = async (id) => {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this department? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await deleteDepartment(id);
      await fetchDepartments();
    } catch (err) {
      setError(err.message || "Failed to delete department.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Department Management">
      <div className="space-y-6">
        {/* Page heading */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Department Management
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View and manage registered departments in the municipality.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add Department
          </button>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Total Departments
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : departments.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Search Results
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : filteredDepartments.length}
            </p>
          </div>
        </section>

        {/* Add / Edit form */}
        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {editingId !== null
                    ? "Edit Department"
                    : "Add New Department"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId !== null
                    ? "Update the department information below."
                    : "Enter the details for the new department."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="department-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Department Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="department-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Municipal Health Office"
                  className={inputClass}
                  required
                  maxLength={255}
                  disabled={saving}
                />
              </div>

              <div>
                <label
                  htmlFor="department-description"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="department-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter a short department description"
                  className={`${inputClass} min-h-24`}
                  maxLength={255}
                  disabled={saving}
                  rows={3}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Optional. Maximum 255 characters.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Department"
                      : "Save Department"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Department list */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="font-semibold text-slate-900">
                Registered Departments
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Department records retrieved from the system database.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-64">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search department..."
                  aria-label="Search departments"
                  className={`${inputClass} pl-9`}
                />
              </div>

              <button
                type="button"
                onClick={() => fetchDepartments(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name="refresh-cw"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => fetchDepartments()}
                disabled={loading}
                className="mt-2 text-sm font-semibold text-red-700 underline hover:text-red-900 disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />

              <p className="mt-3 text-sm text-slate-500">
                Loading department records...
              </p>
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      Department Name
                    </th>

                    <th scope="col" className="px-5 py-3.5">
                      Description
                    </th>

                    <th scope="col" className="px-5 py-3.5">
                      Department ID
                    </th>

                    <th scope="col" className="px-5 py-3.5">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((department) => (
                    <tr
                      key={department.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {department.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {department.description || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {department.id}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(department)}
                            disabled={deletingId !== null || saving}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(department.id)}
                            disabled={deletingId !== null || saving}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === department.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredDepartments.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        {search.trim()
                          ? "No matching departments found."
                          : "No registered departments found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
}
