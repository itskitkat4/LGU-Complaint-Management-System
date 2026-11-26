import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, Panel, StatCard, inputClass, focusRing } from "../../components/ui";
import { getBarangays, getDepartments, getFeedbackMonitoring } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { ContentSkeleton } from "../../components/Skeletons";

const statDefinitions = [
  { key: "average_rating", label: "Average Rating", icon: "star", tone: "bg-amber-50 text-amber-700" },
  { key: "total_feedback", label: "Total Feedback", icon: "message", tone: "bg-slate-100 text-slate-700" },
  { key: "positive_ratings", label: "Positive Ratings", icon: "check", tone: "bg-emerald-50 text-emerald-700" },
  { key: "negative_ratings", label: "Negative Ratings", icon: "alert", tone: "bg-rose-50 text-rose-700" },
];

const roleTitles = {
  "LGU-Staff": "LGU Staff",
  Barangay_Head: "Barangay Head",
  Department_Head: "Department Head",
};

function FeedbackList({ items }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No feedback has been submitted yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {item.complaint_title || item.complaint?.title || "Complaint feedback"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.handling_unit === "barangay" ? "Barangay handled" : item.handling_unit === "lgu" ? "Department handled" : "Submitted feedback"}
                {item.barangay_name ? ` · ${item.barangay_name}` : ""}
                {item.department_name ? ` · ${item.department_name}` : ""}
                {item.handler_name ? ` · handled by ${item.handler_name}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" aria-label={`${item.rating} out of 5 stars`}>
              {item.rating}/5 ★
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.comment}</p>
          <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>
        </li>
      ))}
    </ul>
  );
}

export default function FeedbackMonitoring({ compact = false }) {
  const { profile } = useAuth();
  const role = profile?.role;
  const [items, setItems] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ handling_unit: "", department_id: "", barangay_id: "", rating: "", from: "", to: "" });
  const [departments, setDepartments] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canFilter = !compact && role === "LGU-Staff";
  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getFeedbackMonitoring({ ...filters, page });
      setItems(result.data || []);
      setStatistics(result.statistics || null);
      setPagination(result.pagination || { current_page: 1, last_page: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.message || "Unable to load service feedback.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void Promise.resolve().then(loadFeedback);
  }, [loadFeedback]);

  useEffect(() => {
    if (!canFilter) return;
    Promise.all([getDepartments(), getBarangays()])
      .then(([departmentList, barangayList]) => {
        setDepartments(departmentList || []);
        setBarangays(barangayList || []);
      })
      .catch(() => {});   
  }, [canFilter]);

  function changeFilter(key, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const content = (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <header className="flex items-start gap-3">
          <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-700">{roleTitles[role]}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Service Feedback</h2>
            <p className="mt-2 text-sm text-slate-600">Ratings and comments are attributed to the unit and handler that submitted the approved resolution.</p>
          </div>
        </header>
      )}

      {canFilter && (
        <Panel title="Filter feedback" description="Filters apply to the statistics and comments below.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <select aria-label="Handling unit" value={filters.handling_unit} onChange={(event) => changeFilter("handling_unit", event.target.value)} className={inputClass}>
              <option value="">All handling units</option><option value="barangay">Barangay</option><option value="lgu">Department</option>
            </select>
            <select aria-label="Department" value={filters.department_id} onChange={(event) => changeFilter("department_id", event.target.value)} className={inputClass}>
              <option value="">All departments</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Barangay" value={filters.barangay_id} onChange={(event) => changeFilter("barangay_id", event.target.value)} className={inputClass}>
              <option value="">All barangays</option>{barangays.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Rating" value={filters.rating} onChange={(event) => changeFilter("rating", event.target.value)} className={inputClass}>
              <option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
            </select>
            <input aria-label="Feedback from date" type="date" value={filters.from} onChange={(event) => changeFilter("from", event.target.value)} className={inputClass} />
            <input aria-label="Feedback to date" type="date" value={filters.to} onChange={(event) => changeFilter("to", event.target.value)} className={inputClass} />
          </div>
        </Panel>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {statistics && (
        <section aria-label="Feedback statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statDefinitions.map((stat) => (
            <StatCard key={stat.key} {...stat} value={stat.key === "average_rating" ? `${statistics[stat.key]} / 5` : statistics[stat.key]} />
          ))}
        </section>
      )}

      <Panel title={compact ? "Recent service feedback" : "Feedback comments"} description={compact ? "Recent ratings for your authorized handling scope." : `${pagination.total} feedback record(s)`}>
        {loading ? <ContentSkeleton label="Loading feedback" variant="list" rows={compact ? 2 : 4} /> : <FeedbackList items={items} />}
        {!compact && pagination.last_page > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">Page {pagination.current_page} of {pagination.last_page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className={`glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50 ${focusRing}`}>Previous</button>
              <button type="button" disabled={page >= pagination.last_page || loading} onClick={() => setPage((value) => value + 1)} className={`glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50 ${focusRing}`}>Next</button>
            </div>
          </div>
        )}
      </Panel>

      {compact && (
        <div className="text-right">
          <Link to={role === "LGU-Staff" ? "/staff/feedback" : role === "Department_Head" ? "/department/feedback" : "/barangay/feedback"} className={`text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}>Open feedback monitoring <Icon name="arrow" className="ml-1 inline h-4 w-4" /></Link>
        </div>
      )}
    </div>
  );

  if (compact) return content;
  return <StaffLayout title="Service Feedback" role={roleTitles[role]}>{content}</StaffLayout>;
}
