
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getAuthenticatedProfile } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        let requestId = 0;

        async function loadAuthentication(session) {
            const currentRequest = ++requestId;

            if (!session?.access_token) {
                if (mounted) {
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

                if (mounted && currentRequest === requestId) {
                    setProfile(result.profile || null);
                }
            } catch (error) {
                console.error("Authentication verification failed:", error);

                if (mounted && currentRequest === requestId) {
                    setProfile(null);
                }
            } finally {
                if (mounted && currentRequest === requestId) {
                    setLoading(false);
                }
            }
        }

        // Listen for Supabase authentication changes.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void loadAuthentication(session);
        });

        // Check the existing session when the application loads.
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Failed to retrieve session:", error);
            }

            if (mounted) {
                void loadAuthentication(error ? null : data.session);
            }
        });

        return () => {
            mounted = false;
            requestId++;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        role: profile?.role || null,
        loading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside an AuthProvider."
        );
    }

    return context;
}
