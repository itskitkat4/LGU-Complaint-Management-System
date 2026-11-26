import { supabase } from "./supabase";

// Department reference-data cache.
const DEPARTMENTS_CACHE_TTL = 5 * 60 * 1000;

let departmentsCache = null;
let departmentsCacheExpiresAt = 0;
let departmentsRequest = null;
let departmentsRequestVersion = 0;

// Clear cached department data and invalidate pending requests.
function invalidateDepartmentsCache()  {
  departmentsCache = null;
  departmentsCacheExpiresAt = 0;
  departmentsRequest = null;
  departmentsRequestVersion += 1;
}

// Barangay reference-data cache.
const BARANGAYS_CACHE_TTL = 5 * 60 * 1000;

let barangaysCache = null;
let barangaysCacheExpiresAt = 0;
let barangaysRequest = null;
let barangaysRequestVersion = 0;

// Clear cached barangay data and invalidate pending requests.
function invalidateBarangaysCache() {
  barangaysCache = null;
  barangaysCacheExpiresAt = 0;
  barangaysRequest = null;
  barangaysRequestVersion += 1;
}

const COMPLAINT_CATEGORIES_CACHE_TTL = 5 * 60 * 1000;

let complaintCategoriesCache = null;
let complaintCategoriesCacheExpiresAt = 0;
let complaintCategoriesRequest = null;
let complaintCategoriesRequestVersion = 0;

const DASHBOARD_SUMMARY_CACHE_TTLS = {
  staff: 30 * 1000,
  barangay: 30 * 1000,
  departmentPersonnel: 30 * 1000,
  admin: 60 * 1000,
};

const STAFF_COMPLAINT_HISTORY_CACHE_TTL = 10 * 1000;
const staffComplaintHistoryCache = new Map();
const staffComplaintHistoryRequests = new Map();

function invalidateStaffComplaintHistoryCache() {
  staffComplaintHistoryCache.clear();
  staffComplaintHistoryRequests.clear();
}

const STAFF_REPORTS_CACHE_TTL = 30 * 1000;
const staffReportsCache = new Map();
const staffReportsRequests = new Map();

function invalidateStaffReportsCache() {
  staffReportsCache.clear();
  staffReportsRequests.clear();
}

const FEEDBACK_MONITORING_CACHE_TTL = 5 * 1000;
const feedbackMonitoringCache = new Map();
const feedbackMonitoringRequests = new Map();

function invalidateFeedbackMonitoringCache() {
  feedbackMonitoringCache.clear();
  feedbackMonitoringRequests.clear();
}

async function getCachedUserResponse(cache, requests, userKey, ttl, endpoint) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user?.id;
  if (!userId) return fetchWithAccessToken(endpoint);

  const cacheKey = `${userId}:${userKey}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const pending = requests.get(cacheKey);
  if (pending) return pending.promise;

  const request = { promise: null };
  request.promise = fetchWithAccessToken(endpoint)
    .then((result) => {
      if (requests.get(cacheKey) === request) {
        cache.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + ttl,
        });
      }
      return result;
    })
    .finally(() => {
      if (requests.get(cacheKey) === request) {
        requests.delete(cacheKey);
      }
    });

  requests.set(cacheKey, request);
  return request.promise;
}

function invalidateStaffComplaintDataCaches() {
  invalidateStaffComplaintHistoryCache();
  invalidateStaffReportsCache();
  invalidateFeedbackMonitoringCache();
}

const UNREAD_NOTIFICATION_COUNT_CACHE_TTL = 10 * 1000;
const unreadNotificationCountCache = new Map();
const unreadNotificationCountRequests = new Map();

function invalidateUnreadNotificationCountCache() {
  unreadNotificationCountCache.clear();
  unreadNotificationCountRequests.clear();
}


// Staff Accounts cache.
const STAFF_ACCOUNTS_CACHE_TTL = 30 * 1000;

const staffAccountsCache = new Map();
const staffAccountsRequests = new Map();
const staffAccountsRequestVersions = new Map();

// Clear staff account data and invalidate pending requests.
function invalidateStaffAccountsCache() {
  const keys = new Set([
    ...staffAccountsCache.keys(),
    ...staffAccountsRequests.keys(),
    ...staffAccountsRequestVersions.keys(),
  ]);

  keys.forEach((key) => {
    staffAccountsRequestVersions.set(
      key,
      (staffAccountsRequestVersions.get(key) || 0) + 1
    );
  });

  staffAccountsCache.clear();
  staffAccountsRequests.clear();
}


const dashboardSummaryCache = new Map();
const dashboardSummaryRequests = new Map();
const DASHBOARD_SUMMARY_CACHE_KEYS = Object.keys(DASHBOARD_SUMMARY_CACHE_TTLS);

function invalidateDashboardSummaryCaches(keys = DASHBOARD_SUMMARY_CACHE_KEYS) {
  keys.forEach((key) => {
    const prefix = `${key}:`;
    for (const cacheKey of dashboardSummaryCache.keys()) {
      if (cacheKey.startsWith(prefix)) dashboardSummaryCache.delete(cacheKey);
    }
    for (const requestKey of dashboardSummaryRequests.keys()) {
      if (requestKey.startsWith(prefix)) dashboardSummaryRequests.delete(requestKey);
    }
  });
}

async function getCachedDashboardSummary(key, endpoint) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  const userId = session?.user?.id;
  if (!session?.access_token || !userId) {
    return fetchWithAccessToken(endpoint);
  }

  const cacheKey = `${key}:${userId}`;
  const cached = dashboardSummaryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const pending = dashboardSummaryRequests.get(cacheKey);
  if (pending) return pending.promise;

  const request = { promise: null };
  request.promise = fetchWithAccessToken(endpoint).then((result) => {
    if (dashboardSummaryRequests.get(cacheKey) === request) {
      dashboardSummaryCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + DASHBOARD_SUMMARY_CACHE_TTLS[key],
      });
    }
    return result;
  }).finally(() => {
    if (dashboardSummaryRequests.get(cacheKey) === request) {
      dashboardSummaryRequests.delete(cacheKey);
    }
  });

  dashboardSummaryRequests.set(cacheKey, request);
  return request.promise;
}

// Clear cached complaint category data and invalidate pending requests.
function invalidateComplaintCategoriesCache() {
  complaintCategoriesCache = null;
  complaintCategoriesCacheExpiresAt = 0;
  complaintCategoriesRequest = null;
  complaintCategoriesRequestVersion += 1;
}

// Prevent cached data from carrying over between authenticated accounts.
supabase.auth.onAuthStateChange((event) => {
  if (
    event === "SIGNED_IN" ||
    event === "SIGNED_OUT" ||
    event === "USER_UPDATED"
  ) {
    invalidateDepartmentsCache();
    invalidateBarangaysCache();
    invalidateComplaintCategoriesCache();
    invalidateDashboardSummaryCaches();
    invalidateStaffAccountsCache();
    invalidateUnreadNotificationCountCache();
    invalidateStaffComplaintDataCaches();
  }
});


const configuredApiUrl = import.meta.env.VITE_API_URL || "/api";
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");
const API_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

export const ACCOUNT_DEACTIVATED_EVENT =
  "bantayserbisyo:account-deactivated";

const ACCOUNT_DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please cooperate with the System Administrator.";

export const DEFAULT_API_TIMEOUT_MS = 30_000;


/* API Request Helper  Handles authentication, requests, responses, and errors.*/

export class ApiError extends Error {
  constructor(message, status, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(timeoutMs) {
    super("The request timed out. Check your connection and try again.", null, "API_TIMEOUT");
    this.name = "ApiTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class ApiAbortError extends Error {
  constructor() {
    super("The request was cancelled.");
    this.name = "AbortError";
    this.code = "API_ABORTED";
  }
}

async function fetchWithAccessToken(path, options = {}) {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, signal: callerSignal, ...requestOptions } = options;
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_API_TIMEOUT_MS;
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

  const controller = new AbortController();
  let timedOut = false;
  let callerAborted = Boolean(callerSignal?.aborted);
  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort(callerSignal?.reason);
  };
  if (callerAborted) controller.abort(callerSignal?.reason);
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, effectiveTimeoutMs);

  let response;
  let responseText;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });
    responseText = await response.text();
    if (timedOut) throw new ApiTimeoutError(effectiveTimeoutMs);
    if (callerAborted || callerSignal?.aborted) throw new ApiAbortError();
  } catch (fetchError) {
    if (timedOut) throw new ApiTimeoutError(effectiveTimeoutMs);
    if (callerAborted || callerSignal?.aborted) throw new ApiAbortError();
    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }

  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }
  }

  if (!response.ok) {
    const accountDeactivated =
      response.status === 403 &&
      result.message === ACCOUNT_DEACTIVATED_MESSAGE;

    if (accountDeactivated && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ACCOUNT_DEACTIVATED_EVENT, {
        detail: { userId: data.session?.user?.id ?? null },
      }));
    }

    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";
    const errorMessage = accountDeactivated
      ? "Your account is inactive. Please sign in again."
      : validationMessage || result.message || "Something went wrong with the request.";

    throw new ApiError(
      errorMessage,
      response.status,
      accountDeactivated ? "ACCOUNT_DEACTIVATED" : "API_ERROR"
    );
  }

  return result;
}

/* Authentication and Profile*/

export function getCitizenProfile() {
  return fetchWithAccessToken("/profile");
}

export function getAuthenticatedProfile(options = {}) {
  return fetchWithAccessToken("/auth/profile", options);
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

export async function getBarangays({ forceRefresh = false } = { }) {
  // Return cached data if it has not expired.
  if (
    !forceRefresh &&
    barangaysCache !== null &&
    Date.now() < barangaysCacheExpiresAt
  ) {
    return barangaysCache;
  }

  // Reuse an existing request instead of sending another one.
  if (!forceRefresh && barangaysRequest) {
    return barangaysRequest;
  }

  // A forced refresh must bypass the cache and pending request.
  if (forceRefresh) {
    invalidateBarangaysCache();
  }

  const requestVersion = ++barangaysRequestVersion;

  const request = fetchWithAccessToken("/barangays")
  .then((result) => { 
    const barangays = result.barangays || [];

    // Cache only if this request has not been invalidated.   
if (requestVersion === barangaysRequestVersion) {
      barangaysCache = barangays;
      barangaysCacheExpiresAt = Date.now() + BARANGAYS_CACHE_TTL;
    }

    return barangays; 
}).finally(() => {
  if (requestVersion === barangaysRequestVersion) {
    barangaysRequest = null;
  }
});

  barangaysRequest = request;

  return request;
}


export function getBarangayHeadComplaints(page = 1) {
  return fetchWithAccessToken(`/barangay/complaints?page=${page}`);
}

export function getBarangayComplaintHistory(page = 1, status = "all") {
  const params = new URLSearchParams({ page: String(page) });
  if (status !== "all") params.set("status", status);
  return fetchWithAccessToken(`/barangay/complaints/history?${params}`);
}

export function getBarangayDashboardSummary() {
  return getCachedDashboardSummary("barangay", "/barangay/dashboard-summary");
}

/* Departments*/

export async function getDepartments({ forceRefresh = false } = {}) {
  // Return cached data if it has not expired.
  if (
    !forceRefresh &&
    departmentsCache !== null &&
    Date.now() < departmentsCacheExpiresAt
  ) {
    return departmentsCache;
  }

  // Reuse an existing request instead of sending another one.
  if (!forceRefresh && departmentsRequest) {
    return departmentsRequest;
  }

  // A forced refresh must bypass the cache and pending request.
  if (forceRefresh) {
    invalidateDepartmentsCache();
  }

  const requestVersion = ++departmentsRequestVersion;

  const request = fetchWithAccessToken("/departments")
    .then((result) => {
      const departments = result.departments || [];

      // Cache only if this request has not been invalidated.
      if (requestVersion === departmentsRequestVersion) {
        departmentsCache = departments;
        departmentsCacheExpiresAt = Date.now() + DEPARTMENTS_CACHE_TTL;
      }

      return departments;
    })
    .finally(() => {
      if (requestVersion === departmentsRequestVersion) {
        departmentsRequest = null;
      }
    });

  departmentsRequest = request;

  return request;
}

export async function createDepartment(departmentData) {
  const result = await fetchWithAccessToken("/departments", {
    method: "POST",
    body: JSON.stringify(departmentData),
  });

  invalidateDepartmentsCache();

  invalidateDashboardSummaryCaches(["admin"]);

  return result;
}

export async function updateDepartment(departmentId, departmentData) {
  const result = await fetchWithAccessToken(`/departments/${departmentId}`, {
    method: "PUT",
    body: JSON.stringify(departmentData),
  });

  invalidateDepartmentsCache();

  invalidateDashboardSummaryCaches(["admin"]);

  return result;
}
export async function deleteDepartment(departmentId) {
  const result = await fetchWithAccessToken(`/departments/${departmentId}`, {
    method: "DELETE",
  });

  invalidateDepartmentsCache();

  invalidateDashboardSummaryCaches(["admin"]);

  return result;
}

/* Staff Accounts*/


export async function getStaffAccounts() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  const userId = session?.user?.id;

  if (!session?.access_token || !userId) {
    return fetchWithAccessToken("/staff-accounts").then(
      (result) => result.staff || []
    );
  }

  const cacheKey = `admin:${userId}`;
  const cached = staffAccountsCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const pending = staffAccountsRequests.get(cacheKey);
  if (pending) return pending.promise;

  const requestVersion =
    staffAccountsRequestVersions.get(cacheKey) || 0;

  const request = { promise: null };

  request.promise = fetchWithAccessToken("/staff-accounts")
    .then((result) => {
      if (
        staffAccountsRequests.get(cacheKey) === request &&
        (staffAccountsRequestVersions.get(cacheKey) || 0) ===
          requestVersion
      ) {
        staffAccountsCache.set(cacheKey, {
          value: result.staff || [],
          expiresAt: Date.now() + STAFF_ACCOUNTS_CACHE_TTL,
        });
      }

      return result.staff || [];
    })
    .finally(() => {
      if (staffAccountsRequests.get(cacheKey) === request) {
        staffAccountsRequests.delete(cacheKey);
      }
    });

  staffAccountsRequests.set(cacheKey, request);

  return request.promise;
}


export async function createStaffAccount(staffData) {
  const result = await fetchWithAccessToken("/staff-accounts", {
    method: "POST",
    body: JSON.stringify(staffData),
  });

  invalidateStaffAccountsCache();
  invalidateDashboardSummaryCaches(["admin"]);
  return result;
}

export async function completeStaffPasswordSetup(password) {
  const result = await fetchWithAccessToken(
    "/staff-accounts/complete-password-setup",
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );

  invalidateStaffAccountsCache();

  return result;
}

export async function deactivateStaffAccount(staffId) {
  const result = await fetchWithAccessToken(
    `/staff-accounts/${staffId}/deactivate`,
    {
      method: "PATCH",
    }
  );

  if (result.profile) {
    invalidateStaffAccountsCache();
  }

  invalidateDashboardSummaryCaches(["admin"]);

  return result;
}
/* Complaint Categories*/

export async function getComplaintCategories({
  forceRefresh = false,
} = {}) {
  // Return cached data if it has not expired.
  if (
    !forceRefresh &&
    complaintCategoriesCache !== null &&
    Date.now() < complaintCategoriesCacheExpiresAt
  ) {
    return complaintCategoriesCache;
  }

  // Reuse an existing request instead of sending another one.
  if (!forceRefresh && complaintCategoriesRequest) {
    return complaintCategoriesRequest;
  }

  // A forced refresh must bypass the cache and pending request.
  if (forceRefresh) {
    invalidateComplaintCategoriesCache();
  }

  const requestVersion = ++complaintCategoriesRequestVersion;

  const request = fetchWithAccessToken("/complaint-categories")
    .then((result) => {
      const categories = result.categories || [];

      // Cache only if this request has not been invalidated.
      if (requestVersion === complaintCategoriesRequestVersion) {
        complaintCategoriesCache = categories;
        complaintCategoriesCacheExpiresAt =
          Date.now() + COMPLAINT_CATEGORIES_CACHE_TTL;
      }

      return categories;
    })
    .finally(() => {
      if (requestVersion === complaintCategoriesRequestVersion) {
        complaintCategoriesRequest = null;
      }
    });

  complaintCategoriesRequest = request;

  return request;
}


/* Citizen Complaints*/

export async function createComplaint(complaintData) {
  const formData = new FormData();

  formData.append("barangay_id", complaintData.barangay_id);
  formData.append("category_id", complaintData.category_id);
  formData.append("title", complaintData.title);
  formData.append("description", complaintData.description);
  formData.append("is_anonymous", complaintData.is_anonymous ? "1" : "0");

  if (complaintData.attachments?.length) {
    complaintData.attachments.forEach((file) => {
      formData.append("attachments[]", file);
    });
  }

  const result = await fetchWithAccessToken("/complaints", {
    method: "POST",
    body: formData,
  });
  invalidateDashboardSummaryCaches(["staff", "admin"]);
  invalidateStaffComplaintHistoryCache();
  invalidateStaffReportsCache();
  return result;
}

export function chatWithComplaintAssistant(messages, { signal, timeoutMs } = {}) {
  return fetchWithAccessToken("/citizen/complaint-assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
    signal,
    timeoutMs,
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
  return getCachedUserResponse(
    staffComplaintHistoryCache,
    staffComplaintHistoryRequests,
    `page:${page}`,
    STAFF_COMPLAINT_HISTORY_CACHE_TTL,
    `/staff/complaints/history?page=${page}`
  );
}

export function getStaffComplaint(complaintId) {
  return fetchWithAccessToken(`/staff/complaints/${complaintId}`);
}

export async function reviewComplaint(
  complaintId,
  decision,
  resolutionLevel = null,
  rejectionReason = "",
  reviewNotes = "",
  priority = null
) {
  const result = await fetchWithAccessToken(`/complaints/${complaintId}/review`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      resolution_level: resolutionLevel,
      rejection_reason: rejectionReason,
      review_notes: reviewNotes,
      priority,
    }),
  });
  invalidateDashboardSummaryCaches(["staff", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}

export async function routeComplaint(
  complaintId,
  assignedTo,
  reason,
  departmentId = null
) {
  const result = await fetchWithAccessToken(`/staff/complaints/${complaintId}/route`, {
    method: "POST",
    body: JSON.stringify({
      assigned_to: assignedTo,
      reason,
      department_id: departmentId,
    }),
  });
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
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

export function getDepartmentPersonnelDashboardSummary() {
  return getCachedDashboardSummary(
    "departmentPersonnel",
    "/department/personnel/dashboard-summary"
  );
}

export async function getDepartmentPersonnel() {
  const result = await fetchWithAccessToken("/department/personnel");

  return result.data || [];
}

export async function assignComplaintToPersonnel(
  complaintId,
  assignedTo,
  reason
) {
  const result = await fetchWithAccessToken(
    `/department/complaints/${complaintId}/assign`,
    {
      method: "POST",
      body: JSON.stringify({
        assigned_to: assignedTo,
        reason,
      }),
    }
  );
  invalidateDashboardSummaryCaches(["departmentPersonnel"]);
  invalidateStaffComplaintHistoryCache();
  invalidateFeedbackMonitoringCache();
  return result;
}

/*Department Personnel*/

export function getDepartmentPersonnelComplaints(page = 1) {
  return fetchWithAccessToken(
    `/department/personnel/complaints?page=${page}`
  );
}
export async function submitComplaintResolution(
  complaintId,
  description,
  beforePhoto,
  completedAt,
  evidence = [],
) {
  const formData = new FormData();

  formData.append("resolution_description", description);
  formData.append("before_photo", beforePhoto);
  formData.append("completed_at", completedAt);

  evidence.forEach((file) => {
    formData.append("evidence[]", file);
  });

  const result = await fetchWithAccessToken(
    `/complaints/${complaintId}/resolutions`,
    {
      method: "POST",
      body: formData,
    }
  );
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}

export async function startDepartmentPersonnelWork(complaintId) {
  const result = await fetchWithAccessToken(
    `/department/personnel/complaints/${complaintId}/start`,
    {
      method: "POST",
    }
  );
  invalidateDashboardSummaryCaches(["departmentPersonnel"]);
  invalidateStaffComplaintDataCaches();
  return result;
}
export async function startBarangayHeadWork(complaintId) {
  const result = await fetchWithAccessToken(
    `/barangay/complaints/${complaintId}/start`,
    {
      method: "POST",
    }
  );
  invalidateDashboardSummaryCaches(["barangay"]);
  invalidateStaffComplaintDataCaches();
  return result;
}

/* LGU-Staff Resolution Review */

export function getStaffResolutions(page = 1) {
  return fetchWithAccessToken(`/staff/resolutions?page=${page}`);
}

export async function reviewResolution(
  resolutionId,
  decision,
  reviewComment = ""
) {
  const result = await fetchWithAccessToken(
    `/staff/resolutions/${resolutionId}/review`,
    {
      method: "POST",
      body: JSON.stringify({
        decision,
        review_comment: reviewComment,
      }),
    }
  );
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}



/* Complaint Attachments*/

export function getComplaintAttachmentSignedUrl(attachmentId) {
  return fetchWithAccessToken(
    `/complaint-attachments/${attachmentId}/signed-url`
  );
}

/* Escalations */

export async function requestComplaintEscalation(
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

  const result = await fetchWithAccessToken(`/complaints/${complaintId}/escalations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}

export function getStaffEscalations(page = 1) {
  return fetchWithAccessToken(`/staff/escalations?page=${page}`);
}

export async function reviewStaffEscalation(escalationId, review) {
  const result = await fetchWithAccessToken(
    `/staff/escalations/${escalationId}/review`,
    {
      method: "POST",
      body: JSON.stringify(review),
    }
  );
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}

export async function recordDepartmentEscalationOutcome(
  escalationId,
  outcomeNotes
) {
  const result = await fetchWithAccessToken(
    `/department/escalations/${escalationId}/outcome`,
    {
      method: "POST",
      body: JSON.stringify({
        outcome_notes: outcomeNotes,
      }),
    }
  );
  invalidateDashboardSummaryCaches(["staff", "barangay", "departmentPersonnel", "admin"]);
  invalidateStaffComplaintDataCaches();
  return result;
}


/* Admin Dashboard */
export function getAdminDashboardSummary() {
  return getCachedDashboardSummary("admin", "/admin/dashboard-summary");
}

export function getAdminComplaints(page = 1) {
  return fetchWithAccessToken(`/admin/complaints?page=${page}`);
}

export function getStaffDashboardSummary() {
  return getCachedDashboardSummary("staff", "/staff/dashboard-summary");
}

export function getDepartmentPersonnelComplaint(complaintId) {
  return fetchWithAccessToken(
    `/department/personnel/complaints/${complaintId}`
  );
}


/* Citizen Feedback */

export async function getFeedbackMonitoring(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const suffix = params.size ? `?${params.toString()}` : "";
  const filterKey = JSON.stringify(
    Object.entries(filters).sort(([left], [right]) => left.localeCompare(right))
  );
  return getCachedUserResponse(
    feedbackMonitoringCache,
    feedbackMonitoringRequests,
    `filters:${filterKey}`,
    FEEDBACK_MONITORING_CACHE_TTL,
    `/feedback${suffix}`
  );
}

export async function getMyFeedback(page = 1) {
  return fetchWithAccessToken(`/feedback?page=${page}`);
}

export async function getEligibleFeedbackComplaints() {
  const result = await fetchWithAccessToken(
    "/feedback/eligible-complaints"
  );

  return result.data || [];
}

export async function submitCitizenFeedback(
  complaintId,
  rating,
  comment
) {
  const result = await fetchWithAccessToken(
    `/complaints/${complaintId}/feedback`,
    {
      method: "POST",
      body: JSON.stringify({
        rating,
        comment,
      }),
    }
  );
  invalidateDashboardSummaryCaches(["staff", "admin"]);
  invalidateFeedbackMonitoringCache();
  return result;
}

// Notification

/*  Citizen Notifications */

export const NOTIFICATIONS_CHANGED_EVENT = "bantayserbisyo:notifications-changed";

export function announceNotificationsChanged() {
  invalidateUnreadNotificationCountCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export async function getCitizenNotificationsPage(page = 1, options = {}) {
  const params = new URLSearchParams({ page: String(page) });
  const result = await fetchWithAccessToken(`/notifications?${params}`, options);
  const paginator = result.data;
  const notifications = paginator?.data;

  if (Array.isArray(result.notifications)) {
    return {
      notifications: result.notifications,
      currentPage: page,
      lastPage: page,
      perPage: result.notifications.length,
      total: result.notifications.length,
      nextPageUrl: null,
      previousPageUrl: null,
      hasMore: false,
    };
  }

  if (Array.isArray(notifications)) {
    const currentPage = Number(paginator.current_page) || page;
    const lastPage = Number(paginator.last_page) || currentPage;
    return {
      notifications,
      currentPage,
      lastPage,
      perPage: Number(paginator.per_page) || notifications.length,
      total: Number(paginator.total) || 0,
      nextPageUrl: paginator.next_page_url || null,
      previousPageUrl: paginator.prev_page_url || null,
      hasMore: typeof paginator.next_page_url === "string"
        ? true
        : paginator.next_page_url === null
          ? false
          : currentPage < lastPage,
    };
  }

  return {
    notifications: Array.isArray(paginator) ? paginator : [],
    currentPage: page,
    lastPage: page,
    perPage: Array.isArray(paginator) ? paginator.length : 0,
    total: Array.isArray(paginator) ? paginator.length : 0,
    nextPageUrl: null,
    previousPageUrl: null,
    hasMore: false,
  };
}

export async function getCitizenNotifications(page = 1) {
  const result = await getCitizenNotificationsPage(page);
  return result.notifications;
}

export async function getUnreadNotificationCount(options = {}) {
  const hasCustomOptions = Object.keys(options).length > 0;
  if (hasCustomOptions) {
    const result = await fetchWithAccessToken(
      "/notifications/unread-count",
      options
    );
    return result.unread_count ?? result.count ?? 0;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user?.id;
  if (!userId) {
    const result = await fetchWithAccessToken("/notifications/unread-count", options);
    return result.unread_count ?? result.count ?? 0;
  }

  const cached = unreadNotificationCountCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const pending = unreadNotificationCountRequests.get(userId);
  if (pending) return pending.promise;

  const request = { promise: null };
  request.promise = fetchWithAccessToken("/notifications/unread-count", options)
    .then((result) => {
      const count = result.unread_count ?? result.count ?? 0;
      if (unreadNotificationCountRequests.get(userId) === request) {
        unreadNotificationCountCache.set(userId, {
          value: count,
          expiresAt: Date.now() + UNREAD_NOTIFICATION_COUNT_CACHE_TTL,
        });
      }
      return count;
    })
    .finally(() => {
      if (unreadNotificationCountRequests.get(userId) === request) {
        unreadNotificationCountRequests.delete(userId);
      }
    });

  unreadNotificationCountRequests.set(userId, request);
  return request.promise;
}

export async function markNotificationAsRead(notificationId) {
  const result = await fetchWithAccessToken(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
  invalidateUnreadNotificationCountCache();
  return result;
}

export async function markAllNotificationsAsRead() {
  const result = await fetchWithAccessToken("/notifications/read-all", {
    method: "PATCH",
  });
  invalidateUnreadNotificationCountCache();
  return result;
}

export function getStaffReports() {
  return getCachedUserResponse(
    staffReportsCache,
    staffReportsRequests,
    "summary",
    STAFF_REPORTS_CACHE_TTL,
    "/staff/reports/summary"
  );
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
