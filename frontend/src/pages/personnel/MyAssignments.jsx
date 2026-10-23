import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, PriorityBadge, StatusBadge, primaryBtn } from "../../components/ui";

const assignments = [
  { id: "BS-DEMO-031", title: "Repair damaged streetlight", priority: "High", status: "In Progress" },
  { id: "BS-DEMO-032", title: "Inspect drainage issue", priority: "Normal", status: "Assigned" },
  { id: "BS-DEMO-033", title: "Road maintenance concern", priority: "Normal", status: "Returned for Follow-up" },
];

export default function MyAssignments() {
  return (
    <StaffLayout title="My Assignments" role="Department Personnel">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            My assignments
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Work on your assigned complaints and keep their progress updated.
          </p>
        </div>

        <ul className="space-y-4">
          {assignments.map((item) => (
            <li key={item.id}>
              <article className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                    <Icon name="file" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500">{item.id}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{item.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </div>
                <Link
                  to={`/personnel/assignments/${item.id}`}
                  className={`${primaryBtn} shrink-0`}
                  aria-label={`Open assignment ${item.id}`}
                >
                  Open assignment
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </article>
            </li>
          ))}
        </ul>

        {assignments.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
              <Icon name="file" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">No assignments yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Complaints assigned to you will appear here.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Demo assignments only; connect the backend to load actual assigned work.
        </p>
      </div>
    </StaffLayout>
  );
}