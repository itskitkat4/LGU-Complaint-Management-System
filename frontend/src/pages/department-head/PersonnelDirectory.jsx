import { useEffect, useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon } from "../../components/ui";
import { getDepartmentPersonnel } from "../../lib/api";
import { ContentSkeleton } from "../../components/Skeletons";

export default function PersonnelDirectory() {
  const [personnel, setPersonnel] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDepartmentPersonnel()
      .then((result) => {
        if (active) setPersonnel(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load personnel.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visiblePersonnel = personnel.filter((person) =>
    `${person.full_name} ${person.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <StaffLayout title="Personnel Directory" role="Department Head">
      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Department Portal</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Department Personnel</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">View and search active personnel assigned to your department.</p>
          </div>
        </header>

        <section className="glass overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="font-semibold text-slate-900">Personnel directory</h3>
              <p className="mt-1 text-sm text-slate-500">{personnel.length} active {personnel.length === 1 ? "person" : "people"}</p>
            </div>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search department personnel" className="glass-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:max-w-xs" />
          </div>

          {loading ? (
            <ContentSkeleton label="Loading department personnel" variant="table" rows={4} className="p-4" />
          ) : error ? (
            <p role="alert" className="p-6 text-sm text-red-700">{error}</p>
          ) : visiblePersonnel.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Icon name="users" className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-800">{personnel.length ? "No matching personnel" : "No active personnel yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{personnel.length ? "Try a different name or email." : "Active personnel assigned to your department will appear here."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiblePersonnel.map((person) => (
                <li key={person.id} className="glass-hover flex items-center gap-3 p-4 sm:p-5">
                  <span className="glass-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold">{person.full_name?.charAt(0)?.toUpperCase() || "P"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{person.full_name}</span>
                    <span className="block truncate text-sm text-slate-500">{person.email}</span>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">Active</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StaffLayout>
  );
}
