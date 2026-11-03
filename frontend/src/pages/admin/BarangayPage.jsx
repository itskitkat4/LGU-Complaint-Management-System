
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { Icon, inputClass } from "../../components/ui";
import { getBarangays } from "../../lib/api";

export default function Barangays() {
  const [barangays, setBarangays] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBarangays = async (isRefresh = false) => {
  try {
    if (isRefresh) setLoading(true);

    setError("");

    const data = await getBarangays();
    setBarangays(data);
  } catch (err) {
    setError(err.message || "Failed to load barangays.");
  } finally {
    if (isRefresh) setLoading(false);
  }
};

useEffect(() => {
  let active = true;

  async function loadBarangays() {
    try {
      setError("");

      const data = await getBarangays();

      if (active) setBarangays(data);
    } catch (err) {
      if (active) {
        setError(err.message || "Failed to load barangays.");
      }
    } finally {
      if (active) setLoading(false);
    }
  }

  loadBarangays();

  return () => {
    active = false;
  };
}, []);

  const filteredBarangays = useMemo(() => {
    return barangays.filter((barangay) => {
      const name = barangay.name || "";
      const code = barangay.code || "";

      return `${name} ${code}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [barangays, search]);

  return (
    <AdminLayout title="Barangay Management">
      <div className="space-y-6">
        {/* Page Heading */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Barangay Management
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            View and manage registered barangays in the municipality.
          </p>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Total Registered Barangays
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : barangays.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Search Results
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : filteredBarangays.length}
            </p>
          </div>
        </section>

        {/* Barangay List */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="font-semibold text-slate-900">
                Registered Barangays
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Barangay records retrieved from the system database.
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search barangay..."
                  aria-label="Search barangays"
                  className={`${inputClass} pl-9`}
                />
              </div>

              <button
                type="button"
                onClick={fetchBarangays}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="refresh-cw" className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Loading barangay records...
            </div>
          ) : error ? (
            <div className="p-5 text-center">
              <p className="text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={fetchBarangays}
                className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Barangay Name</th>
                    <th className="px-5 py-3.5">Barangay Code</th>
                    <th className="px-5 py-3.5">Barangay ID</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBarangays.map((barangay) => (
                    <tr
                      key={barangay.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {barangay.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {barangay.code || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {barangay.id}
                      </td>
                    </tr>
                  ))}

                  {filteredBarangays.length === 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        {search
                          ? "No matching barangays found."
                          : "No registered barangays found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
