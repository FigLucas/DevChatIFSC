import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/main.css';

const Auth = lazy(() => import('./components/Auth'));
const Chat = lazy(() => import('./components/Chat'));

function LoadingFallback() {
    return (
        <div
            className="h-dvh flex flex-col items-center justify-center bg-[var(--bg-base)] relative overflow-hidden"
            role="status"
            aria-label="Carregando assistente virtual"
        >
            <div
                className="absolute top-32 -left-32 w-80 h-80 bg-[var(--primary)]/5 rounded-full blur-3xl animate-float"
                aria-hidden="true"
            />
            <div
                className="absolute bottom-32 -right-32 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl animate-float"
                style={{ animationDelay: '-4s' }}
                aria-hidden="true"
            />

            <div className="flex flex-col items-center gap-4 z-10">
                <div className="ifsc-logo">
                    <img
                        src="/logo-ifsc.png"
                        alt="IFSC Logo"
                        className="ifsc-logo-img animate-pulse"
                    />
                    <div>
                        <div className="ifsc-logo-text">
                            IFSC<span className="text-[var(--primary)]">Chat</span>
                        </div>
                        <div className="ifsc-logo-subtitle">Assistente Virtual</div>
                    </div>
                </div>
                <p className="text-sm text-[var(--text-muted)] animate-fade-up">
                    Carregando assistente virtual...
                </p>
            </div>
        </div>
    );
}

function MainContent() {
    const { token, logout, loading } = useAuth();

    if (loading) {
        return <LoadingFallback />;
    }

    return (
        <Suspense fallback={<LoadingFallback />}>
            {token ? <Chat onLogout={logout} /> : <Auth />}
        </Suspense>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainContent />
        </AuthProvider>
    );
}
