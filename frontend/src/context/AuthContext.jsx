/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { supabase } from "../lib/supabase";
import { ACCOUNT_DEACTIVATED_EVENT, getAuthenticatedProfile } from "../lib/api";

const AuthContext = createContext(null);

function logAuthTiming(label, startedAt) {
    if (import.meta.env.DEV) {
        console.debug(`[auth-timing] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
    }
}

function getProfileErrorKind(error) {
    if (error?.code === "ACCOUNT_DEACTIVATED") {
        return "inactive";
    }

    return error?.status === 404 ? "missing" : "unavailable";
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }

    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [loading, setLoading] = useState(true);

    const requestId = useRef(0);
    const currentUserId = useRef(null);
    const validatedProfileUserId = useRef(null);
    const loginResolutionActive = useRef(false);
    const loginSessionUserId = useRef(null);
    const profileRequest = useRef(null);
    const deactivationSignOut = useRef(null);

    const beginLoginProfileResolution = useCallback(() => {
        loginResolutionActive.current = true;
        loginSessionUserId.current = null;
        validatedProfileUserId.current = null;
        profileRequest.current = null;
        requestId.current += 1;
        setProfileError(null);
    }, []);

    const setValidatedLoginProfile = useCallback((validatedProfile, authenticatedUser) => {
        const authenticatedUserId = authenticatedUser?.id;

        if (
            !loginResolutionActive.current ||
            !authenticatedUserId ||
            validatedProfile?.id !== authenticatedUserId ||
            (loginSessionUserId.current &&
                loginSessionUserId.current !== authenticatedUserId)
        ) {
            throw new Error("The verified profile does not match the active login session.");
        }

        requestId.current += 1;
        currentUserId.current = authenticatedUserId;
        validatedProfileUserId.current = authenticatedUserId;
        loginResolutionActive.current = false;
        loginSessionUserId.current = null;
        profileRequest.current = null;
        setUser(authenticatedUser);
        setProfile(validatedProfile);
        setProfileError(null);
        setLoading(false);
    }, []);

    const refreshProfile = useCallback(async () => {
        const currentRequest = ++requestId.current;
        const requestedUserId = currentUserId.current;
        profileRequest.current = null;
        validatedProfileUserId.current = null;
        setProfileError(null);
        setLoading(true);

        try {
            const profilePromise = getAuthenticatedProfile();
            profileRequest.current = {
                userId: requestedUserId,
                requestId: currentRequest,
                promise: profilePromise,
            };
            const result = await profilePromise;

            if (
                currentRequest !== requestId.current ||
                (requestedUserId && currentUserId.current !== requestedUserId)
            ) {
                return null;
            }

            const updatedProfile = result?.profile || null;

            if (updatedProfile?.id && requestedUserId && updatedProfile.id !== requestedUserId) {
                throw new Error("The returned profile does not match the active session.");
            }

            validatedProfileUserId.current = updatedProfile?.id || null;
            setProfile(updatedProfile);
            setProfileError(updatedProfile ? null : "missing");
            setLoading(false);

            return updatedProfile;
        } catch (error) {
            if (currentRequest === requestId.current) {
                setProfile(null);
                validatedProfileUserId.current = null;
                setProfileError(getProfileErrorKind(error));
                setLoading(false);
            }

            throw error;
        } finally {
            if (profileRequest.current?.requestId === currentRequest) {
                profileRequest.current = null;
            }
        }
    }, []);

    const cancelLoginProfileResolution = useCallback(async ({ restoreSession = true } = {}) => {
        if (!loginResolutionActive.current) {
            return;
        }

        if (!restoreSession) {
            loginResolutionActive.current = false;
            loginSessionUserId.current = null;
            validatedProfileUserId.current = null;
            requestId.current += 1;
            currentUserId.current = null;
            setUser(null);
            setProfile(null);
            setProfileError(null);
            setLoading(false);
            return;
        }

        const recoveryRequest = ++requestId.current;
        loginSessionUserId.current = null;
        validatedProfileUserId.current = null;

        let session;
        try {
            const result = await supabase.auth.getSession();
            if (result.error) {
                throw result.error;
            }
            session = result.data.session;
        } catch (error) {
            if (
                recoveryRequest === requestId.current &&
                loginResolutionActive.current
            ) {
                loginResolutionActive.current = false;
                currentUserId.current = null;
                setUser(null);
                setProfile(null);
                setProfileError(null);
                setLoading(false);
            }
            throw error;
        }

        if (
            recoveryRequest !== requestId.current ||
            !loginResolutionActive.current
        ) {
            return;
        }

        if (!session?.access_token) {
            loginResolutionActive.current = false;
            currentUserId.current = null;
            setUser(null);
            setProfile(null);
            setProfileError(null);
            setLoading(false);
            return;
        }

        const sessionUserId = session.user?.id;
        if (!sessionUserId) {
            loginResolutionActive.current = false;
            currentUserId.current = null;
            setUser(null);
            setProfile(null);
            setProfileError(null);
            setLoading(false);
            return;
        }

        currentUserId.current = sessionUserId;
        setUser(session.user);
        setProfileError(null);
        setLoading(true);

        try {
            const result = await getAuthenticatedProfile();
            const restoredProfile = result?.profile || null;

            if (
                recoveryRequest !== requestId.current ||
                !loginResolutionActive.current ||
                currentUserId.current !== sessionUserId
            ) {
                return;
            }
            if (restoredProfile?.id && restoredProfile.id !== sessionUserId) {
                throw new Error("The restored profile does not match the active session.");
            }

            validatedProfileUserId.current = restoredProfile?.id || null;
            setProfile(restoredProfile);
            setProfileError(restoredProfile ? null : "missing");
        } catch (error) {
            if (
                recoveryRequest === requestId.current &&
                loginResolutionActive.current &&
                currentUserId.current === sessionUserId
            ) {
                setProfile(null);
                validatedProfileUserId.current = null;
                setProfileError(getProfileErrorKind(error));
            }
            throw error;
        } finally {
            if (
                recoveryRequest === requestId.current &&
                loginResolutionActive.current &&
                currentUserId.current === sessionUserId
            ) {
                loginResolutionActive.current = false;
                loginSessionUserId.current = null;
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        let authEventReceived = false;

        function handleAccountDeactivated(event) {
            const affectedUserId = event.detail?.userId;
            if (
                !mounted ||
                !affectedUserId ||
                affectedUserId !== currentUserId.current ||
                deactivationSignOut.current?.userId === affectedUserId
            ) {
                return;
            }

            requestId.current += 1;
            const signOutRequestId = requestId.current;
            const operation = { userId: affectedUserId, requestId: signOutRequestId };
            deactivationSignOut.current = operation;
            profileRequest.current = null;
            validatedProfileUserId.current = null;
            setProfile(null);
            setProfileError("inactive");
            setLoading(false);

            void (async () => {
                try {
                    const { data, error } = await supabase.auth.getSession();
                    if (
                        error ||
                        !mounted ||
                        requestId.current !== signOutRequestId ||
                        currentUserId.current !== affectedUserId ||
                        data.session?.user?.id !== affectedUserId
                    ) {
                        return;
                    }

                    // No await occurs between the identity check and starting this local sign-out.
                    const result = await supabase.auth.signOut({ scope: "local" });
                    if (result.error) {
                        console.error("Could not sign out the deactivated account.");
                    }
                } catch {
                    console.error("Could not sign out the deactivated account.");
                } finally {
                    if (deactivationSignOut.current === operation) {
                        deactivationSignOut.current = null;
                    }
                }
            })();
        }

        async function loadAuthentication(session, event = null) {
            if (!mounted) {
                return;
            }

            if (!session?.access_token) {
                if (loginResolutionActive.current && event !== "SIGNED_OUT") {
                    requestId.current += 1;
                    currentUserId.current = null;
                    validatedProfileUserId.current = null;
                    profileRequest.current = null;
                    setUser(null);
                    setProfile(null);
                    setProfileError(null);
                    setLoading(true);
                    return;
                }

                loginResolutionActive.current = false;
                loginSessionUserId.current = null;
                requestId.current += 1;
                currentUserId.current = null;
                validatedProfileUserId.current = null;
                profileRequest.current = null;
                setUser(null);
                setProfile(null);
                setProfileError(null);
                setLoading(false);
                return;
            }

            const sessionUserId = session.user?.id;
            if (!sessionUserId) {
                requestId.current += 1;
                currentUserId.current = null;
                validatedProfileUserId.current = null;
                profileRequest.current = null;
                setUser(null);
                setProfile(null);
                setProfileError(null);
                setLoading(false);
                return;
            }

            const identityChanged = currentUserId.current !== sessionUserId;
            if (identityChanged) {
                // Invalidate work and identity data from the previous session before rendering again.
                requestId.current += 1;
                currentUserId.current = sessionUserId;
                validatedProfileUserId.current = null;
                profileRequest.current = null;
                setProfile(null);
                setProfileError(null);
                setLoading(true);
            }

            setUser(session.user);

            if (loginResolutionActive.current) {
                if (event === "SIGNED_IN") {
                    loginSessionUserId.current = sessionUserId;
                }
                if (validatedProfileUserId.current !== sessionUserId) {
                    setProfile(null);
                    setProfileError(null);
                }
                setLoading(true);
                return;
            }

            if (event === "TOKEN_REFRESHED") {
                // Recheck trusted profile state when Supabase has renewed the session.
                validatedProfileUserId.current = null;
            }

            if (validatedProfileUserId.current === sessionUserId) {
                setLoading(false);
                return;
            }

            if (
                profileRequest.current?.userId === sessionUserId &&
                profileRequest.current?.requestId === requestId.current
            ) {
                return profileRequest.current.promise;
            }

            const currentRequest = ++requestId.current;
            const startedAt = performance.now();
            setProfile(null);
            setProfileError(null);
            setLoading(true);

            const request = getAuthenticatedProfile()
                .then((result) => {
                    if (
                        !mounted ||
                        currentRequest !== requestId.current ||
                        currentUserId.current !== sessionUserId
                    ) {
                        return;
                    }

                    const restoredProfile = result?.profile || null;
                    if (restoredProfile?.id && restoredProfile.id !== sessionUserId) {
                        throw new Error("The restored profile does not match the active session.");
                    }

                    validatedProfileUserId.current = restoredProfile?.id || null;
                    setProfile(restoredProfile);
                    setProfileError(restoredProfile ? null : "missing");
                })
                .catch((error) => {
                        console.error("Authentication profile retrieval failed.", {
                            status: error?.status ?? null,
                        });

                    if (
                        mounted &&
                        currentRequest === requestId.current &&
                        currentUserId.current === sessionUserId
                    ) {
                        setProfile(null);
                        validatedProfileUserId.current = null;
                        setProfileError(getProfileErrorKind(error));
                    }
                })
                .finally(() => {
                    logAuthTiming("auth listener profile retrieval", startedAt);

                    if (profileRequest.current?.promise === request) {
                        profileRequest.current = null;
                    }

                    if (
                        mounted &&
                        currentRequest === requestId.current &&
                        currentUserId.current === sessionUserId
                    ) {
                        setLoading(false);
                    }
                });

            profileRequest.current = {
                userId: sessionUserId,
                requestId: currentRequest,
                promise: request,
            };
            return request;
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            authEventReceived = true;
            void loadAuthentication(session, event);
        });
        window.addEventListener(ACCOUNT_DEACTIVATED_EVENT, handleAccountDeactivated);

        void supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted || authEventReceived) {
                return;
            }

            if (error) {
                console.error("Failed to retrieve the Supabase session.");

                if (data?.session?.access_token) {
                    void loadAuthentication(data.session);
                } else {
                    // A retrieval error is not proof that a previously observed session signed out.
                    setLoading(false);
                }
                return;
            }

            void loadAuthentication(data.session);
        }).catch(() => {
            if (!mounted || authEventReceived) {
                return;
            }

            console.error("Failed to retrieve the Supabase session.");
            setLoading(false);
        });

        return () => {
            mounted = false;
            requestId.current += 1;
            profileRequest.current = null;
            window.removeEventListener(ACCOUNT_DEACTIVATED_EVENT, handleAccountDeactivated);
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        role: profile?.role || null,
        loading,
        profileError,
        isAuthenticated: Boolean(user),
        refreshProfile,
        beginLoginProfileResolution,
        setValidatedLoginProfile,
        cancelLoginProfileResolution,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
