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

export async function getAuthenticatedProfile() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error('Please Sign in First');
  }
  const response = await fetch (`${API_URL}/auth/profile`, {
    method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
  });
  const result = await response.json();

  if(!response.ok) {
    throw new Error(result.message || "Failed to retrieve profile.");
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

// * get all departments

export async function getDepartments() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/departments`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to retrieve departments.");
  }
  return Array.isArray(result.departments) ? result.departments : [];
}

//* Create department
export async function createDepartment(departmentData) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/departments`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(departmentData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create department.");
  }

  return result;
}

//* Update department
export async function updateDepartment(departmentId, departmentData) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/departments/${departmentId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(departmentData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update department.");
  }

  return result;
}

//* Delete department
export async function deleteDepartment(departmentId) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/departments/${departmentId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to delete department.");
  }

  return result;
}
