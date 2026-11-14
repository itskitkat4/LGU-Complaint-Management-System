
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

/* API Request Helper  Handles authentication, requests, responses, and errors.*/

async function fetchWithAccessToken(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Please sign in first.");
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();

  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }
  }

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessage ||
        result.message ||
        "Something went wrong with the request."
    );
  }

  return result;
}

/* Authentication and Profile*/

export function getCitizenProfile() {
  return fetchWithAccessToken("/profile");
}

export function getAuthenticatedProfile() {
  return fetchWithAccessToken("/auth/profile");
}

export function getAuthenticatedUser() {
  return fetchWithAccessToken("/auth/me");
}

export function updateCitizenProfile(barangayId) {
  return fetchWithAccessToken("/profile", {
    method: "PUT",
    body: JSON.stringify({
      barangay_id: barangayId,
    }),
  });
}

/* Barangays*/

export async function getBarangays() {
  const result = await fetchWithAccessToken("/barangays");

  return result.barangays || [];
}

export function getBarangayHeadComplaints(page = 1) {
  return fetchWithAccessToken(`/barangay/complaints?page=${page}`);
}

/* Departments*/

export async function getDepartments() {
  const result = await fetchWithAccessToken("/departments");

  return result.departments || [];
}

export function createDepartment(departmentData) {
  return fetchWithAccessToken("/departments", {
    method: "POST",
    body: JSON.stringify(departmentData),
  });
}

export function updateDepartment(departmentId, departmentData) {
  return fetchWithAccessToken(`/departments/${departmentId}`, {
    method: "PUT",
    body: JSON.stringify(departmentData),
  });
}

export function deleteDepartment(departmentId) {
  return fetchWithAccessToken(`/departments/${departmentId}`, {
    method: "DELETE",
  });
}

/* Staff Accounts*/

export async function getStaffAccounts() {
  const result = await fetchWithAccessToken("/staff-accounts");

  return result.staff || [];
}

export function createStaffAccount(staffData) {
  return fetchWithAccessToken("/staff-accounts", {
    method: "POST",
    body: JSON.stringify(staffData),
  });
}

export function deactivateStaffAccount(staffId) {
  return fetchWithAccessToken(`/staff-accounts/${staffId}/deactivate`, {
    method: "PATCH",
  });
}

/* Complaint Categories*/

export async function getComplaintCategories() {
  const result = await fetchWithAccessToken("/complaint-categories");

  return result.categories || [];
}

/* Citizen Complaints*/

export function createComplaint(complaintData) {
  const formData = new FormData();

  formData.append("barangay_id", complaintData.barangay_id);
  formData.append("category_id", complaintData.category_id);
  formData.append("title", complaintData.title);
  formData.append("description", complaintData.description);

  if (complaintData.attachments?.length) {
    complaintData.attachments.forEach((file) => {
      formData.append("attachments[]", file);
    });
  }

  return fetchWithAccessToken("/complaints", {
    method: "POST",
    body: formData,
  });
}

export function getCitizenComplaints(page = 1) {
  return fetchWithAccessToken(`/complaints?page=${page}`);
}

export function getCitizenComplaint(complaintId) {
  return fetchWithAccessToken(`/complaints/${complaintId}`);
}

/* LGU-Staff Complaint Management*/

export function getStaffComplaints(page = 1) {
  return fetchWithAccessToken(`/staff/complaints?page=${page}`);
}

export function getStaffComplaintHistory(page = 1) {
  return fetchWithAccessToken(`/staff/complaints/history?page=${page}`);
}

export function getStaffComplaint(complaintId) {
  return fetchWithAccessToken(`/staff/complaints/${complaintId}`);
}

export function reviewComplaint(
  complaintId,
  decision,
  resolutionLevel = null,
  rejectionReason = "",
  reviewNotes = ""
) {
  return fetchWithAccessToken(`/complaints/${complaintId}/review`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      resolution_level: resolutionLevel,
      rejection_reason: rejectionReason,
      review_notes: reviewNotes,
    }),
  });
}

export function routeComplaint(
  complaintId,
  assignedTo,
  reason,
  departmentId = null
) {
  return fetchWithAccessToken(`/staff/complaints/${complaintId}/route`, {
    method: "POST",
    body: JSON.stringify({
      assigned_to: assignedTo,
      reason,
      department_id: departmentId,
    }),
  });
}

export async function getEligibleAssignees(complaintId) {
  const result = await fetchWithAccessToken(
    `/staff/complaints/${complaintId}/eligible-assignees`
  );

  return result.data;
}

/*
|--------------------------------------------------------------------------
| Department Head
|--------------------------------------------------------------------------
*/

export function getDepartmentHeadComplaints(page = 1) {
  return fetchWithAccessToken(`/department/complaints?page=${page}`);
}

export function getDepartmentMonitoring(page = 1) {
  return fetchWithAccessToken(`/department/monitoring?page=${page}`);
}

export async function getDepartmentPersonnel() {
  const result = await fetchWithAccessToken("/department/personnel");

  return result.data || [];
}

export function assignComplaintToPersonnel(
  complaintId,
  assignedTo,
  reason
) {
  return fetchWithAccessToken(
    `/department/complaints/${complaintId}/assign`,
    {
      method: "POST",
      body: JSON.stringify({
        assigned_to: assignedTo,
        reason,
      }),
    }
  );
}

/*Department Personnel*/

export function getDepartmentPersonnelComplaints(page = 1) {
  return fetchWithAccessToken(
    `/department/personnel/complaints?page=${page}`
  );
}
export function submitComplaintResolution(
  complaintId,
  description,
  evidence = []
) {
  const formData = new FormData();

  formData.append("resolution_description", description);

  evidence.forEach((file) => {
    formData.append("evidence[]", file);
  });

  return fetchWithAccessToken(
    `/complaints/${complaintId}/resolutions`,
    {
      method: "POST",
      body: formData,
    }
  );
}

export function startDepartmentPersonnelWork(complaintId) {
  return fetchWithAccessToken(
    `/department/personnel/complaints/${complaintId}/start`,
    {
      method: "POST",
    }
  );
}
export function startBarangayHeadWork(complaintId) {
  return fetchWithAccessToken(
    `/barangay/complaints/${complaintId}/start`,
    {
      method: "POST",
    }
  );
}
/*
|--------------------------------------------------------------------------
| LGU-Staff Resolution Review
|--------------------------------------------------------------------------
*/

export function getStaffResolutions(page = 1) {
  return fetchWithAccessToken(`/staff/resolutions?page=${page}`);
}

export function reviewResolution(
  resolutionId,
  decision,
  reviewComment = ""
) {
  return fetchWithAccessToken(
    `/staff/resolutions/${resolutionId}/review`,
    {
      method: "POST",
      body: JSON.stringify({
        decision,
        review_comment: reviewComment,
      }),
    }
  );
}



/* Complaint Attachments*/

export function getComplaintAttachmentSignedUrl(attachmentId) {
  return fetchWithAccessToken(
    `/complaint-attachments/${attachmentId}/signed-url`
  );
}

/*
|--------------------------------------------------------------------------
| Escalations
|--------------------------------------------------------------------------
*/

export function requestComplaintEscalation(
  complaintId,
  destinationDepartmentId,
  reason,
  higherAuthorityOffice = null
) {
  const body = { reason };

  if (destinationDepartmentId) {
    body.destination_department_id = destinationDepartmentId;
  }

  if (higherAuthorityOffice) {
    body.higher_authority_office = higherAuthorityOffice;
  }

  return fetchWithAccessToken(`/complaints/${complaintId}/escalations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getStaffEscalations(page = 1) {
  return fetchWithAccessToken(`/staff/escalations?page=${page}`);
}

export function reviewStaffEscalation(escalationId, review) {
  return fetchWithAccessToken(
    `/staff/escalations/${escalationId}/review`,
    {
      method: "POST",
      body: JSON.stringify(review),
    }
  );
}

export function recordDepartmentEscalationOutcome(
  escalationId,
  outcomeNotes
) {
  return fetchWithAccessToken(
    `/department/escalations/${escalationId}/outcome`,
    {
      method: "POST",
      body: JSON.stringify({
        outcome_notes: outcomeNotes,
      }),
    }
  );
}


//*Admin Dashboard
export function getAdminDashboardSummary() {
  return fetchWithAccessToken("/admin/dashboard-summary");
}

export function getDepartmentPersonnelComplaint(complaintId) {
  return fetchWithAccessToken(
    `/department/personnel/complaints/${complaintId}`
  );
}


/*
|--------------------------------------------------------------------------
| Citizen Feedback
|--------------------------------------------------------------------------
*/

export async function getEligibleFeedbackComplaints() {
  const result = await fetchWithAccessToken(
    "/feedback/eligible-complaints"
  );

  return result.data || [];
}

export function submitCitizenFeedback(
  complaintId,
  rating,
  comment
) {
  return fetchWithAccessToken(
    `/complaints/${complaintId}/feedback`,
    {
      method: "POST",
      body: JSON.stringify({
        rating,
        comment,
      }),
    }
  );
}

// Notification

/*
|--------------------------------------------------------------------------
| Citizen Notifications
|--------------------------------------------------------------------------
*/

export async function getCitizenNotifications() {
  const result = await fetchWithAccessToken("/notifications");

  // Supports common Laravel response structures
  return result.notifications || result.data || [];
}

export async function getUnreadNotificationCount() {
  const result = await fetchWithAccessToken(
    "/notifications/unread-count"
  );

  return result.unread_count ?? result.count ?? 0;
}

export function markNotificationAsRead(notificationId) {
  return fetchWithAccessToken(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
}

export function markAllNotificationsAsRead() {
  return fetchWithAccessToken("/notifications/read-all", {
    method: "PATCH",
  });
}

export function getStaffReports() {
  return fetchWithAccessToken("/staff/reports/summary");
}


export function createStaffReport(dateFrom, dateTo) {
  return fetchWithAccessToken("/staff/reports", {
    method: "POST",
    body: JSON.stringify({
      date_from: dateFrom,
      date_to: dateTo,
    }),
  });
}

export function uploadStaffReportPdf(reportId, pdfBlob, filename) {
  const formData = new FormData();

  formData.append("file", pdfBlob, filename);

  return fetchWithAccessToken(`/staff/reports/${reportId}/pdf`, {
    method: "POST",
    body: formData,
  });
}

export function getStaffReportPdfSignedUrl(reportId) {
  return fetchWithAccessToken(
    `/staff/reports/${reportId}/pdf/signed-url`
  );
}
