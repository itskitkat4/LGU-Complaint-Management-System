
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
import { getAuthenticatedProfile } from "../lib/api";

const AuthContext = createContext(null);

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
    const [loading, setLoading] = useState(true);

    const requestId = useRef(0);

    const refreshProfile = useCallback(async () => {
        const currentRequest = ++requestId.current;

        try {
            const result = await getAuthenticatedProfile();

            if (currentRequest !== requestId.current) {
                return null;
            }

            const updatedProfile = result?.profile || null;

            setProfile(updatedProfile);
            setLoading(false);

            return updatedProfile;
        } catch (error) {
            if (currentRequest === requestId.current) {
                setLoading(false);
            }

            throw error;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        async function loadAuthentication(session) {
            const currentRequest = ++requestId.current;

            if (!session?.access_token) {
                if (mounted && currentRequest === requestId.current) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }

                return;
            }

            if (mounted) {
                setUser(session.user);
                setLoading(true);
            }

            try {
                const result = await getAuthenticatedProfile();

                if (!mounted || currentRequest !== requestId.current) {
                    return;
                }

                setProfile(result?.profile || null);
            } catch (error) {
                console.error("Authentication verification failed:", error);

                if (mounted && currentRequest === requestId.current) {
                    setProfile(null);
                }
            } finally {
                if (mounted && currentRequest === requestId.current) {
                    setLoading(false);
                }
            }
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void loadAuthentication(session);
        });

        void supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Failed to retrieve session:", error);
            }

            if (mounted) {
                void loadAuthentication(error ? null : data.session);
            }
        });

        return () => {
            mounted = false;
            requestId.current += 1;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        role: profile?.role || null,
        loading,
        isAuthenticated: Boolean(user),
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
