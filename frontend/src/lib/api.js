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
    
    // *return the barangays array if it exists, otherwise return an empty array
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


export async function getStaffAccounts() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/staff-accounts`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to retrieve staff accounts.");
  }

  return Array.isArray(result.staff) ? result.staff : [];
}


export async function getStaffComplaint(complaintId) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/staff/complaints/${complaintId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve complaint details."
    );
  }

  return result;
}


export async function createStaffAccount(staffData) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/staff-accounts`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(staffData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create  account.");
  }

  return result;
}

export async function deactivateStaffAccount(staffId) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession(); 
  
  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/staff-accounts/${staffId}/deactivate`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to deactivate staff account.");
  }

  return result;
}

//* Get active complaint categories
export async function getComplaintCategories() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/complaint-categories`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve complaint categories."
    );
  }

  return Array.isArray(result.categories) ? result.categories : [];
}


//* Create complaint with optional evidence attachments
export async function createComplaint(complaintData) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

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

  const response = await fetch(`${API_URL}/complaints`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessage ||
        result.message ||
        "Failed to submit complaint."
    );
  }

  return result;
}

export async function getStaffComplaints(page = 1) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/staff/complaints?page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve staff complaints."
    );
  }

  return result;
}

export async function getStaffComplaintHistory(page = 1) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("Please sign in first.");

  const response = await fetch(
    `${API_URL}/staff/complaints/history?page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Failed to retrieve complaint history.");
  }

  return result;
}


export async function reviewComplaint(
  complaintId,
  decision,
  resolutionLevel = null,
  rejectionReason = "",
  reviewNotes = ""  
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/complaints/${complaintId}/review`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        decision,
        resolution_level: resolutionLevel,
        rejection_reason: rejectionReason,
        review_notes: reviewNotes,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to submit complaint review."
    );
  }

  return result;
}

export async function getAdminDashboardSummary() {
  const {
    data: {session},
    error,
    } = await supabase.auth.getSession();
  

    if(error)
       throw error;
    if(!session?.access_token) throw new Error("Please sign in first");
    
    const response = await fetch (`${API_URL}/admin/dashboard-summary`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const result = await response.json();

  if(!response.ok) {
    throw new Error(result.message || "Failed to load dashboard.");
  }
  return result;
}


export async function routeComplaint(
  complaintId,
  assignedTo,
  reason,
  departmentId = null
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/staff/complaints/${complaintId}/route`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        assigned_to: assignedTo,
        reason,
        department_id: departmentId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to route complaint."
    );
  }

  return result;
}
export async function getEligibleAssignees(complaintId) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/staff/complaints/${complaintId}/eligible-assignees`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to load eligible recipients.");
  }

  return result.data;
}
export async function getDepartmentPersonnelComplaints(page = 1) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/department/personnel/complaints?page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve assigned complaints."
    );
  }

  return result;
}


// Get complaints routed to the authenticated Department Head's department
export async function getDepartmentHeadComplaints(page = 1) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/department/complaints?page=${page}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve department complaints."
    );
  }

  return result;
}

// Get active personnel belonging to the Department Head's department
export async function getDepartmentPersonnel() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(`${API_URL}/department/personnel`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to retrieve department personnel."
    );
  }

  return Array.isArray(result.data) ? result.data : [];
}

// Assign a complaint to Department Personnel
export async function assignComplaintToPersonnel(
  complaintId,
  assignedTo,
  reason
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  const response = await fetch(
    `${API_URL}/department/complaints/${complaintId}/assign`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        assigned_to: assignedTo,
        reason,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessage ||
        result.message ||
        "Failed to assign complaint."
    );
  }

  return result;
}

async function fetchWithAccessToken(path, options = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("Please sign in first.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  const result = await response.json();
  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";
    throw new Error(validationMessage || result.message || "Request failed.");
  }

  return result;
}

export async function getBarangayHeadComplaints(page = 1) {
  return fetchWithAccessToken(`/barangay/complaints?page=${page}`);
}

export async function requestComplaintEscalation(
  complaintId,
  destinationDepartmentId,
  reason
) {
  return fetchWithAccessToken(`/complaints/${complaintId}/escalations`, {
    method: "POST",
    body: JSON.stringify({
      destination_department_id: destinationDepartmentId,
      reason,
    }),
  });
}

export async function getStaffEscalations(page = 1) {
  return fetchWithAccessToken(`/staff/escalations?page=${page}`);
}

export async function reviewStaffEscalation(escalationId, review) {
  return fetchWithAccessToken(`/staff/escalations/${escalationId}/review`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}
