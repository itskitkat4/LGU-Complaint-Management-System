import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, focusRing } from "../../components/ui";

const records = [
  { id: "BS-DEMO-011", title: "Drainage blockage", status: "In Progress", date: "Demo date" },
  { id: "BS-DEMO-012", title: "Waste collection concern", status: "Assigned", date: "Demo date" },
  { id: "BS-DEMO-013", title: "Damaged pathway", status: "Awaiting Update", date: "Demo date" },
];

const statusStyles = {
  Assigned: "bg-slate-100 text-slate-700 ring-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 ring-sky-100",
  "Awaiting Update": "bg-amber-50 text-amber-700 ring-amber-100",
  Completed: "bg-emerald-50 text-emerald-800 ring-emerald-100",
};

export default function AssignedComplaints() {
  return (
    <StaffLayout title="Assigned Complaints" role="Barangay Head">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Assigned complaints
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Complaints routed to your barangay for handling and follow-up.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <caption className="sr-only">Complaints assigned to your barangay</caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Reference", "Complaint", "Received", "Status", "Details"].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{record.id}</td>
                    <td className="px-5 py-4 text-slate-700">{record.title}</td>
                    <td className="px-5 py-4 text-slate-600">{record.date}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          statusStyles[record.status] ?? statusStyles.Assigned
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/barangay/complaints/${record.id}`}
                        className={`inline-flex items-center gap-1 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
                        aria-label={`View details for ${record.id}`}
                      >
                        View <Icon name="arrow" className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {records.length === 0 && (
            <div className="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                <Icon name="file" className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No assigned complaints
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Complaints routed to your barangay will appear here.
              </p>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Demo data only; assignment and status updates are not connected.
        </p>
      </div>
    </StaffLayout>
  );
}