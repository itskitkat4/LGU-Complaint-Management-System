import { useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, inputClass } from "../../components/ui";

const initialUsers = [
  { id: 1, name: "Sample Administrator", email: "admin@example.com", role: "System Administrator", status: "Active" },
  { id: 2, name: "Sample LGU Staff", email: "staff@example.com", role: "LGU-Staff", status: "Active" },
  { id: 3, name: "Sample Department Head", email: "head@example.com", role: "Department_Head", status: "Active" },
  { id: 4, name: "Sample Personnel", email: "personnel@example.com", role: "Department_Personnel", status: "Inactive" },
];

const roleOptions = [
  { value: "System Administrator", label: "System Administrator" },
  { value: "LGU-Staff", label: "LGU Staff" },
  { value: "Barangay_Head", label: "Barangay Head" },
  { value: "Department_Head", label: "Department Head" },
  { value: "Department_Personnel", label: "Department Personnel" },
  { value: "citizen", label: "Citizen" },
];

const roleLabel = (role) =>
  roleOptions.find((option) => option.value === role)?.label ?? role;

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [users] = useState(initialUsers);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <StaffLayout title="User Management" role="System Administrator">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            User management
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            View user accounts, roles and activation status.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          {/* Filters */}
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <caption className="sr-only">User accounts</caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["User", "Email", "Role", "Status"].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.status === "Active" ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </section>

        <p className="text-xs text-slate-500">
          Demo accounts only. Account creation, role changes, and activation must be connected
          to authorized backend endpoints.
        </p>
      </div>
    </StaffLayout>
  );
}