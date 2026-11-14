export const STATUS = {
  submitted:    { label: "Submitted",    bg: "#E0E7FF", fg: "#3730A3" },
  under_review: { label: "Under review", bg: "#FEF3C7", fg: "#92400E" },
  accepted:     { label: "Accepted",     bg: "#DBEAFE", fg: "#1E40AF" },
  declined:     { label: "Declined",     bg: "#FEE2E2", fg: "#991B1B" },
  assigned:     { label: "Assigned",     bg: "#E0F2FE", fg: "#075985" },
  in_progress:  { label: "In progress",  bg: "#E0F2FE", fg: "#075985" },
  resolved:     { label: "Resolved",     bg: "#D1FAE5", fg: "#065F46" },
};

export const statusInfo = (s) => STATUS[s] || { label: String(s || "Unknown"), bg: "#E5E7EB", fg: "#374151" };

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
