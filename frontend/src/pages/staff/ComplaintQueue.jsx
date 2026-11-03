import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, StatusBadge, focusRing } from "../../components/ui";

const complaints = [
  { id: "BS-DEMO-001", title: "Uncollected garbage", category: "Sanitation", barangay: "Sample Barangay", date: "Demo date", status: "Pending Review" },
  { id: "BS-DEMO-002", title: "Damaged road section", category: "Infrastructure", barangay: "Sample Barangay", date: "Demo date", status: "Pending Review" },
  { id: "BS-DEMO-003", title: "Streetlight not working", category: "Public Safety", barangay: "Sample Barangay", date: "Demo date", status: "Under Review" },
];

export default function ComplaintQueue() {
  return (
    <StaffLayout title="Complaint Queue" role="LGU Staff">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Incoming complaints
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Review the details before routing each complaint.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <caption className="sr-only">Incoming complaints awaiting review</caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {["Reference", "Complaint", "Category", "Barangay", "Status", "Action"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{c.id}</td>
                    <td className="px-5 py-4 text-slate-700">{c.title}</td>
                    <td className="px-5 py-4 text-slate-600">{c.category}</td>
                    <td className="px-5 py-4 text-slate-600">{c.barangay}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/staff/complaints/${c.id}`}
                        className={`inline-flex items-center gap-1 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
                        aria-label={`Review ${c.id}`}
                      >
                        Review <Icon name="arrow" className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {complaints.length === 0 && (
            <div className="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                <Icon name="file" className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">No incoming complaints</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                New citizen complaints will appear here for review.
              </p>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Demo records only. Live queue and filtering need API integration.
        </p>
      </div>
    </StaffLayout>
  );
}