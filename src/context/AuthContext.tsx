import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AuthContextType {
    token: string | null;
    login: (newToken: string, expiresIn?: number) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_KEY = 'ifsc-chat-session';

interface StoredSession {
    token: string;
    expiresAt: number;
}

function getTokenExpiration(token: string, expiresIn = 30 * 60): number {
    try {
        const payloadPart = token.split('.')[1];
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(normalized)) as { exp?: number };
        if (typeof payload.exp === 'number') {
            return payload.exp * 1000;
        }
    } catch {
        // O backend continuará sendo a fonte de verdade para validar o token.
    }
    return Date.now() + expiresIn * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        try {
            const rawSession = sessionStorage.getItem(SESSION_KEY);
            if (rawSession) {
                const session = JSON.parse(rawSession) as StoredSession;
                if (
                    typeof session.token === 'string' &&
                    typeof session.expiresAt === 'number' &&
                    session.expiresAt > Date.now()
                ) {
                    setToken(session.token);
                } else {
                    sessionStorage.removeItem(SESSION_KEY);
                }
            }
        } catch {
            sessionStorage.removeItem(SESSION_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback((newToken: string, expiresIn?: number) => {
        const expiresAt = getTokenExpiration(newToken, expiresIn);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: newToken, expiresAt }));
        setToken(newToken);
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem(SESSION_KEY);
        setToken(null);
    }, []);

    useEffect(() => {
        if (!token) return;
        const rawSession = sessionStorage.getItem(SESSION_KEY);
        if (!rawSession) return;

        try {
            const { expiresAt } = JSON.parse(rawSession) as StoredSession;
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                logout();
                return;
            }
            const timeout = window.setTimeout(logout, remaining);
            return () => window.clearTimeout(timeout);
        } catch {
            logout();
        }
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
