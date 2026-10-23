import { useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, inputClass, primaryBtn } from "../../components/ui";

const sampleComplaints = [
  { id: "BS-DEMO-021", title: "Damaged public road", category: "Infrastructure", status: "Awaiting Assignment" },
  { id: "BS-DEMO-022", title: "Broken streetlight", category: "Public Safety", status: "Awaiting Assignment" },
];

const samplePersonnel = ["Select personnel", "Personnel A", "Personnel B", "Personnel C"];

export default function ComplaintAssignment() {
  const [assignments, setAssignments] = useState({});
  const [notes, setNotes] = useState({});

  function assign(event, id) {
    event.preventDefault();
    if (!assignments[id] || assignments[id] === samplePersonnel[0]) {
      alert("Please select a personnel member.");
      return;
    }
    alert(`Demo only: ${id} selected for ${assignments[id]}. Assignment not saved.`);
  }

  return (
    <StaffLayout title="Complaint Assignment" role="Department Head">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Complaint assignment
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Select qualified department personnel for each LGU-level complaint.
          </p>
        </div>

        {sampleComplaints.map((complaint) => (
          <form
            key={complaint.id}
            onSubmit={(e) => assign(e, complaint.id)}
            className="rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-medium text-slate-500">{complaint.id}</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{complaint.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{complaint.category}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                <Icon name="clock" className="h-3.5 w-3.5" />
                {complaint.status}
              </span>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`personnel-${complaint.id}`}
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Assign personnel
                </label>
                <select
                  id={`personnel-${complaint.id}`}
                  value={assignments[complaint.id] || samplePersonnel[0]}
                  onChange={(e) =>
                    setAssignments({ ...assignments, [complaint.id]: e.target.value })
                  }
                  className={inputClass}
                >
                  {samplePersonnel.map((person) => (
                    <option key={person}>{person}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`notes-${complaint.id}`}
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Assignment notes <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id={`notes-${complaint.id}`}
                  value={notes[complaint.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [complaint.id]: e.target.value })}
                  placeholder="Instructions or priority"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button type="submit" className={primaryBtn}>
                Assign personnel (demo)
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            </div>
          </form>
        ))}

        {sampleComplaints.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              Nothing waiting for assignment
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              New LGU-level complaints will appear here once they are routed to your department.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Demo data only; assignment is not saved.
        </p>
      </div>
    </StaffLayout>
  );
}