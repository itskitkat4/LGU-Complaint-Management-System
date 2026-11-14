export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const APP_SCHEME = "bantayserbisyo";

export const ROLE_HOME = {
  citizen: "/(tabs)",
  "System Administrator": "/admin",
  "LGU-Staff": "/staff",
  Department_Head: "/department-head",
  Department_Personnel: "/department-personnel",
  Barangay_Head: "/barangay-head",
};
