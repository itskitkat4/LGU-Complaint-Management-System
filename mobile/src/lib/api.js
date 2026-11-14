import { supabase } from "./supabase";
import { API_URL } from "../config";

const TIMEOUT_MS = 20000;

// Same job as fetchWithAccessToken in the web app.
async function apiRequest(path, options = {}) {
  if (!API_URL) {
    throw new Error("The API address is not configured. Set EXPO_PUBLIC_API_URL for this device or deployment.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in first.");

  const headers = { Accept: "application/json", Authorization: `Bearer ${token}`, ...options.headers };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch {
    throw new Error("Cannot reach the server. Check your internet and the API address.");
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let result = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { message: text };
    }
  }

  if (!response.ok) {
    const validation = result.errors ? Object.values(result.errors).flat().join(" ") : "";
    const err = new Error(validation || result.message || "Something went wrong with the request.");
    err.status = response.status;
    throw err;
  }
  return result;
}

export const getCitizenProfile = () => apiRequest("/profile");
export const getAuthenticatedProfile = () => apiRequest("/auth/profile");

export const updateCitizenProfile = (barangayId) =>
  apiRequest("/profile", { method: "PUT", body: JSON.stringify({ barangay_id: barangayId }) });

export async function getBarangays() {
  const result = await apiRequest("/barangays");
  return result.barangays || [];
}

export async function getComplaintCategories() {
  const result = await apiRequest("/complaint-categories");
  return result.categories || [];
}

// photos: [{ uri, name, type }]
export function createComplaint({ barangay_id, category_id, title, description, photos = [] }) {
  const form = new FormData();
  form.append("barangay_id", barangay_id);
  form.append("category_id", category_id);
  form.append("title", title);
  form.append("description", description);
  photos.forEach((p) => form.append("attachments[]", { uri: p.uri, name: p.name, type: p.type }));
  return apiRequest("/complaints", { method: "POST", body: form });
}

export const getCitizenComplaints = (page = 1) => apiRequest(`/complaints?page=${page}`);
export const getCitizenComplaint = (id) => apiRequest(`/complaints/${id}`);
export const getAttachmentSignedUrl = (id) => apiRequest(`/complaint-attachments/${id}/signed-url`);
