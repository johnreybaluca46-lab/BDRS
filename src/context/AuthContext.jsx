import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../database/firebase';
import { signInWithCustomToken, signOut, onAuthStateChanged, inMemoryPersistence, setPersistence } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || '';

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            try {
                // Ensure in-memory persistence is enforced before any auth state changes
                await setPersistence(auth, inMemoryPersistence);
                
                const res = await fetch(`${API_BASE_URL}/api/verify-session`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.customToken) {
                        // Sign in with the custom token silently
                        const userCred = await signInWithCustomToken(auth, data.customToken);
                        if (isMounted) {
                            setUserRole(data.role);
                            setUserData(data.user);
                            setCurrentUser(userCred.user);
                            setSessionExpired(false);
                        }
                    } else {
                        throw new Error('Invalid session response');
                    }
                } else {
                    // Cookie invalid or expired
                    if (auth.currentUser) {
                        await signOut(auth);
                    }
                    if (isMounted) {
                        setCurrentUser(null);
                        setUserRole(null);
                        setUserData(null);
                        // If we had a role in local state but verify failed, it's a true expiration
                        if (userRole) {
                            setSessionExpired(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Session verification failed:", error);
                if (isMounted) {
                    setCurrentUser(null);
                    setUserRole(null);
                    setUserData(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        verifySession();

        // Also track onAuthStateChanged as a backup (it updates on signInWithCustomToken)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (isMounted) {
                setCurrentUser(user);
                // If user becomes null externally (e.g. forced signout), clear role
                if (!user) {
                    setUserRole(null);
                    setUserData(null);
                    // Also clear the server-side cookie just in case
                    fetch(`${API_BASE_URL}/api/session-logout`, {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                        credentials: 'include'
                    }).catch(e => console.log('Auto-logout cookie sync:', e));
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const loginWithSession = async (idToken) => {
        const res = await fetch(`${API_BASE_URL}/api/session-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({ idToken })
        });
        
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to create session');
        }
        
        const data = await res.json();
        
        // After server sets HttpOnly cookie, we don't strictly need the client ID token anymore.
        // We will sign out of the normal auth and then re-auth with verify-session to get the custom token,
        // or we can just fetch verify-session directly.
        await signOut(auth); // Clear client credential
        
        // Now fetch verify-session to get custom token and restore inMemory state
        const verifyRes = await fetch(`${API_BASE_URL}/api/verify-session`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            await signInWithCustomToken(auth, verifyData.customToken);
            setUserRole(verifyData.role);
            setUserData(verifyData.user);
            return verifyData;
        } else {
            throw new Error('Failed to verify session after login');
        }
    };

    const logoutSession = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/session-logout`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout request failed', e);
        }
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
        
        // Clear old localstorage junk to be safe
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('isResident');
    };

    const value = {
        currentUser,
        userRole,
        userData,
        loading,
        sessionExpired,
        loginWithSession,
        logoutSession
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
