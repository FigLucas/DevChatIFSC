import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiLock, FiAlertCircle, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function Auth() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const emailRef = useRef<HTMLInputElement>(null);
    const { login } = useAuth();

    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const response = await fetch(`${API_BASE}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData,
            });

            if (!response.ok) {
                setError("Usuário ou senha incorretos");
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            login(data.access_token);
        } catch {
            setError("Erro ao conectar ao servidor");
            setIsLoading(false);
        }
    }

    return (
        <div className="h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,134,65,0.08),transparent_60%)]" />

            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />

            <div className="absolute top-32 -left-32 w-80 h-80 bg-[var(--primary)]/5 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-32 -right-32 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-4s" }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative w-full max-w-[360px]"
            >
                <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] shadow-xl shadow-gray-200/50 p-8">
                    <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <div className="ifsc-logo justify-center mb-5">
                            <img src="/logo-ifsc.png" alt="IFSC Logo" className="ifsc-logo-img" />
                            <div className="text-left">
                                <div className="ifsc-logo-text text-[var(--text-primary)]">IFSC<span className="text-[var(--primary)]">Chat</span></div>
                                <div className="ifsc-logo-subtitle">ASSISTENTE VIRTUAL</div>
                            </div>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs mx-auto">
                            Tire dúvidas sobre processos, bolsas, editais e documentos do IFSC
                        </p>
                    </motion.div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-400 p-3.5 rounded-xl mb-6 text-sm"
                                role="alert"
                                aria-live="assertive"
                            >
                                <FiAlertCircle className="shrink-0 w-4 h-4" aria-hidden="true" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        noValidate
                        onSubmit={handleLogin}
                        className="space-y-4"
                    >
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Usuário
                            </label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" aria-hidden="true" />
                                <input
                                    id="email"
                                    ref={emailRef}
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin"
                                    autoComplete="username"
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/25 transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" aria-hidden="true" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/25 transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading || !email.trim() || !password.trim()}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:from-[var(--primary-dark)] hover:to-[var(--primary)] text-white py-3.5 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/30 flex items-center justify-center gap-2 mt-2"
                            aria-busy={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Entrar <FiArrowRight className="w-4 h-4" aria-hidden="true" />
                                </>
                            )}
                        </motion.button>
                    </motion.form>
                </div>

                <p className="text-center text-xs text-[var(--text-muted)] mt-5">
                    IFSC USP &copy; 2025 &middot; Instituto de Física de São Carlos
                </p>
            </motion.div>
        </div>
    );
}

export default React.memo(Auth);