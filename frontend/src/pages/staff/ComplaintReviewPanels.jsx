import { Link } from "react-router-dom";
import { Icon, StatusBadge, focusRing, inputClass, primaryBtn } from "../../components/ui";
import { MetaItem, DecisionButton, LevelOption, PriorityField, CheckIcon, XIcon } from "./ComplaintReviewComponents";

export function ComplaintSummaryCard({ complaint }) {
  return (
    <>
            {/* Complaint summary */}
            <section className="glass overflow-hidden rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />

              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600">
                      Ref: {complaint.id}
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {complaint.title}
                    </h2>
                  </div>

                  <StatusBadge status={complaint.status} />
                </div>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  <MetaItem
                    label="Category"
                    value={complaint.category?.name || "—"}
                  />
                  <MetaItem
                    label="Barangay"
                    value={complaint.barangay?.name || "—"}
                  />
                  <MetaItem
                    label="Priority"
                    value={complaint.priority || "medium"}
                  />
                </dl>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Citizen's description
                  </h3>

                  <div className="glass-soft mt-2 rounded-2xl p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {complaint.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

    </>
  );
}

export function ComplaintActionPanels({
  complaint, priority, setPriority, submitting, error, setError, success, startReview,
  submit, decision, setDecision, resolutionLevel, setResolutionLevel, notes,
  setNotes, isDeclined, noteLimit, locked, onClose, returnToQueue, routingLoading,
  submitRouting, selectedDepartmentId, setSelectedDepartmentId, departments,
  selectedAssigneeId, setSelectedAssigneeId, assignees, routingReason, setRoutingReason,
}) {
  return (
    <>
            {/* Decision form */}
            {complaint.status === "submitted" ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-slate-900">Begin review</h2>
                <p className="mt-1 text-sm text-slate-500">Mark that LGU Staff has started reviewing this complaint before recording an acceptance or decline decision.</p>
                <div className="mt-5 max-w-sm">
                  <PriorityField
                    value={priority}
                    onChange={setPriority}
                    disabled={submitting}
                  />
                </div>
                {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
                <button type="button" onClick={startReview} disabled={submitting} className={`${primaryBtn} mt-5 disabled:opacity-60`}>
                  {submitting ? "Starting…" : "Start review"}
                </button>
              </section>
            ) : complaint.status === "under_review" ? (
              <form
                onSubmit={submit}
                className="glass overflow-hidden rounded-2xl"
              >
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Complaint Review
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assess the complaint and decide whether it should be
                    handled by the Barangay or the LGU.
                  </p>
                </div>

                <div className="space-y-7 p-6">
                  <PriorityField
                    value={priority}
                    onChange={setPriority}
                    disabled={locked}
                  />

                  {/* Review decision */}
                  <div>
                    <p
                      id="decision-label"
                      className="mb-2 text-sm font-medium text-slate-700"
                    >
                      Review Decision
                    </p>

                    <div
                      role="radiogroup"
                      aria-labelledby="decision-label"
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <DecisionButton
                        tone="accept"
                        active={decision === "accepted"}
                        title="Accept Complaint"
                        hint="Valid concern — route it for handling"
                        icon={<CheckIcon />}
                        disabled={locked}
                        onClick={() => {
                          setDecision("accepted");
                          setError("");
                        }}
                      />
                      <DecisionButton
                        tone="decline"
                        active={decision === "declined"}
                        title="Decline Complaint"
                        hint="Not valid — a reason is required"
                        icon={<XIcon />}
                        disabled={locked}
                        onClick={() => {
                          setDecision("declined");
                          setError("");
                        }}
                      />
                    </div>
                  </div>

                  {/* Handling level */}
                  {decision === "accepted" && (
                    <div>
                      <p
                        id="level-label"
                        className="mb-2 text-sm font-medium text-slate-700"
                      >
                        Where can this complaint be resolved?
                      </p>

                      <div
                        role="radiogroup"
                        aria-labelledby="level-label"
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <LevelOption
                          active={resolutionLevel === "barangay"}
                          title="Barangay-level"
                          hint="Handled by the Barangay Head. Best when the issue can be resolved within the concerned barangay."
                          disabled={locked}
                          onClick={() => setResolutionLevel("barangay")}
                        />
                        <LevelOption
                          active={resolutionLevel === "lgu"}
                          title="LGU-level"
                          hint="Handled by the appropriate LGU department. Choose this when department intervention is needed."
                          disabled={locked}
                          onClick={() => setResolutionLevel("lgu")}
                        />
                      </div>
                    </div>
                  )}

                  {/* Review notes / rejection reason */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="notes"
                        className="text-sm font-medium text-slate-700"
                      >
                        {isDeclined ? "Reason for Declining" : "Review Notes"}
                        {isDeclined ? (
                          <span className="ml-1 text-red-600">*</span>
                        ) : (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            (optional)
                          </span>
                        )}
                      </label>

                      <span
                        className={`text-xs tabular-nums ${
                          notes.length >= noteLimit * 0.9
                            ? "text-red-600"
                            : "text-slate-400"
                        }`}
                      >
                        {notes.length}/{noteLimit}
                      </span>
                    </div>

                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      required={decision === "declined"}
                      maxLength={decision === "declined" ? 100 : 1000}
                      disabled={locked}
                      placeholder={
                        decision === "declined"
                          ? "Explain why this complaint is being declined..."
                          : "Add your assessment or observations about this complaint..."
                      }
                      className={`${inputClass} resize-y disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                      {decision === "declined"
                        ? "A reason for declining is required (maximum 100 characters)."
                        : "Optional review notes (maximum 1000 characters)."}
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                    >
                      <XIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div
                      role="status"
                      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
                    >
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  {onClose ? (
                    <button
                      type="button"
                      onClick={returnToQueue}
                      disabled={submitting || routingLoading}
                      className={`glass-btn-secondary inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                    >
                      Cancel
                    </button>
                  ) : (
                    <Link
                      to="/staff/complaints"
                      aria-disabled={submitting}
                      tabIndex={submitting ? -1 : undefined}
                      className={`glass-btn-secondary inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 ${
                        submitting ? "pointer-events-none opacity-60" : ""
                      } ${focusRing}`}
                    >
                      Cancel
                    </Link>
                  )}

                  <button
                    type="submit"
                    disabled={locked}
                    className={
                      isDeclined
                        ? `inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`
                        : `${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`
                    }
                  >
                    {submitting
                      ? "Saving..."
                      : decision === "accepted"
                        ? "Accept Complaint"
                        : "Decline Complaint"}

                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : ["accepted", "assigned", "in_progress"].includes(
                complaint.status
              ) ? (
              <form
                onSubmit={submitRouting}
                className="glass overflow-hidden rounded-2xl"
              >
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Route Complaint
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign this complaint to the appropriate handling unit.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Handling Level
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">
                      {complaint.resolution_level === "barangay"
                        ? "Barangay-level"
                        : "LGU-level"}
                    </p>
                  </div>

                  {complaint.resolution_level === "lgu" && (
                    <div>
                      <label
                        htmlFor="department"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Select Department
                      </label>
                      <select
                        id="department"
                        value={selectedDepartmentId}
                        onChange={(event) => {
                          setSelectedDepartmentId(event.target.value);
                          setSelectedAssigneeId("");
                          setError("");
                        }}
                        required
                        className={inputClass}
                      >
                        <option value="">Choose a department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="assignee"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {complaint.resolution_level === "barangay"
                        ? "Barangay Head"
                        : "Department Head"}
                    </label>
                    <select
                      id="assignee"
                      value={selectedAssigneeId}
                      onChange={(event) =>
                        setSelectedAssigneeId(event.target.value)
                      }
                      required
                      disabled={
                        complaint.resolution_level === "lgu" &&
                        !selectedDepartmentId
                      }
                      className={inputClass}
                    >
                      <option value="">Choose a recipient</option>
                      {assignees
                        .filter((person) =>
                          complaint.resolution_level === "barangay"
                            ? true
                            : person.department_id === selectedDepartmentId
                        )
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.full_name}
                          </option>
                        ))}
                    </select>

                    {assignees.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        No eligible recipient found. Check that an active
                        {complaint.resolution_level === "barangay"
                          ? " Barangay Head is assigned to this barangay."
                          : " Department Head is assigned to a department."}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="routingReason"
                        className="text-sm font-medium text-slate-700"
                      >
                        Routing Reason <span className="text-red-600">*</span>
                      </label>
                      <span className="text-xs text-slate-400">
                        {routingReason.length}/1000
                      </span>
                    </div>
                    <textarea
                      id="routingReason"
                      value={routingReason}
                      onChange={(event) =>
                        setRoutingReason(event.target.value)
                      }
                      rows={4}
                      minLength={10}
                      maxLength={1000}
                      required
                      placeholder="Explain why this complaint is being assigned to this handling unit..."
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                    >
                      {error}
                    </div>
                  )}

                  {success && (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
                    >
                      {success}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-100 px-6 py-5">
                  <button
                    type="submit"
                    disabled={
                      routingLoading ||
                      !selectedAssigneeId ||
                      (complaint.resolution_level === "lgu" &&
                        !selectedDepartmentId)
                    }
                    className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {routingLoading ? "Routing..." : "Route Complaint"}
                    <Icon name="arrow" className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="glass flex items-start gap-3 rounded-2xl p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <p className="pt-1.5 text-sm text-slate-600">
                  This complaint has already been reviewed or is no longer
                  pending routing.
                </p>
              </div>
            )}
    </>
  );
}
