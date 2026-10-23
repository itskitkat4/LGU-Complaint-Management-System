import { supabase } from "./supabase";

const API_URL = "http://127.0.0.1:8000/api";

export async function getCitizenProfile() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to retrieve citizen profile.");
  }

  return result;
}

export async function getAuthenticatedUser() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    if (!session?.access_token) {
        throw new Error("No authenticated user found, Please log in first.");
    }
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
    });
   const result = await response.json();

   if (!response.ok) {
       throw new Error(result.message || "Authentication failed.");
   }
   return result;   
}

export async function getBarangays() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    if (!session?.access_token) {
        throw new Error(" Please log in first.");
    }

    const response = await fetch(`${API_URL}/barangays`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to retrieve barangays.");
    }
    
    //return the barangays array if it exists, otherwise return an empty array
    return Array.isArray(result.barangays) ? result.barangays : [];
}

// Update the citizen profile with the provided barangay ID.
export async function updateCitizenProfile(barangayId) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      barangay_id: barangayId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessage ||
        result.message ||
        "Failed to complete your profile."
    );
  }

  return result;
}