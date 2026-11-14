import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { getAuthenticatedProfile, getCitizenProfile } from "../lib/api";
import { APP_SCHEME, SUPABASE_URL } from "../config";

WebBrowser.maybeCompleteAuthSession();

function redactCallbackUrl(url) {
  const callbackUrl = new URL(url);
  callbackUrl.search = "";
  callbackUrl.hash = "";
  return callbackUrl.toString();
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [booting, setBooting] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const profileRequestId = useRef(0);

  // 1. Restore the saved session and listen for changes.
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next ?? null);
    });

    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(sessionData?.session ?? null);
      setBooting(false);
    }).catch((error) => {
      if (!active) return;
      setAuthError(error.message || "Unable to restore your saved session.");
      setBooting(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // 2. Load the authenticated profile, creating a profile only for first-time citizens.
  const userId = session?.user?.id;
  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);
    setAuthError("");
    try {
      let result;
      try {
        result = await getAuthenticatedProfile();
      } catch (error) {
        if (error.status !== 404) throw error;
        if (requestId !== profileRequestId.current) return;
        result = await getCitizenProfile();
      }

      if (requestId !== profileRequestId.current) return;
      if (!result?.profile) {
        throw new Error("Your account profile could not be retrieved.");
      }

      setProfile(result.profile);
      setProfileUserId(userId);
      setRequiresOnboarding(
        result.profile.role === "citizen" &&
        (Boolean(result.requires_onboarding) || !result.profile.barangay_id)
      );
      setAuthError("");
    } catch (error) {
      if (requestId !== profileRequestId.current) return;
      setProfile(null);
      setProfileUserId(null);
      setRequiresOnboarding(false);
      setAuthError(error.message || "Unable to load your profile.");
      if (error.status === 403 || error.status === 401) await supabase.auth.signOut();
    } finally {
      if (requestId === profileRequestId.current) setProfileLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadProfile();
    });
    return () => {
      active = false;
      profileRequestId.current += 1;
    };
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email, password) => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError("");
    const redirectTo = `${APP_SCHEME}://login`;
    const supabaseCallback = new URL("/auth/v1/callback", SUPABASE_URL).toString();
    console.info("[Google OAuth] Generated app redirect URI:", redirectTo);
    console.info("[Google OAuth] Google-to-Supabase callback URI:", supabaseCallback);

    if (Constants.expoGoConfig) {
      throw new Error(
        `Google sign-in requires the installed BantaySerbisyo development build. Expo Go cannot register "${redirectTo}" as this app's callback scheme. Open the project in the installed app and allow this redirect in Supabase Auth > URL Configuration.`
      );
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Google sign-in could not be started.");

    const authorizationUrl = new URL(data.url);
    const requestedRedirect = authorizationUrl.searchParams.get("redirect_to");
    console.info("[Google OAuth] Supabase app callback target:", requestedRedirect);
    if (requestedRedirect !== redirectTo) {
      throw new Error(
        `Supabase did not use this mobile callback: ${redirectTo}. Add it to Supabase Auth's Redirect URLs and try again.`
      );
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancelled" };
    }
    if (result.type !== "success" || !result.url) {
      throw new Error("Google sign-in did not return to the app. Check the mobile redirect URL in Supabase Auth settings.");
    }

    console.info(
      "[Google OAuth] App callback received (query and fragment redacted):",
      redactCallbackUrl(result.url)
    );
    const { queryParams } = Linking.parse(result.url);
    const callbackError = queryParams?.error_description || queryParams?.error;
    if (callbackError) {
      throw new Error(String(callbackError));
    }

    const code = typeof queryParams?.code === "string" ? queryParams.code : null;
    if (!code) {
      throw new Error(
        `Google sign-in returned to ${redactCallbackUrl(result.url)} without an authorization code. Ensure ${redirectTo} is allowed in Supabase Auth Redirect URLs.`
      );
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return { type: "success" };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const currentProfile = profileUserId === userId ? profile : null;
  const value = useMemo(
    () => ({
      session,
      profile: currentProfile,
      requiresOnboarding: Boolean(currentProfile) && requiresOnboarding,
      authError,
      loading: booting || profileLoading ||
        (Boolean(session) && profileUserId !== session.user.id && !authError),
      signIn, signInWithGoogle, signOut, reloadProfile: loadProfile,
    }),
    [session, currentProfile, profileUserId, requiresOnboarding, authError, booting, profileLoading, signIn, signInWithGoogle, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
