import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUser,
    FiLock,
    FiAlertCircle,
    FiArrowRight,
    FiEye,
    FiEyeOff,
    FiShield,
    FiBookOpen,
    FiCheckCircle,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const LOGIN_TIMEOUT_MS = 15_000;

function Auth() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const usernameRef = useRef<HTMLInputElement>(null);
    const { login } = useAuth();

    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

        try {
            const formData = new URLSearchParams();
            formData.append('username', username.trim());
            formData.append('password', password);

            const response = await fetch(`${API_BASE}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
                signal: controller.signal,
            });

            if (!response.ok) {
                setError(
                    response.status === 429
                        ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
                        : 'Usuário ou senha incorretos.'
                );
                return;
            }

            const data = (await response.json()) as {
                access_token?: string;
                expires_in?: number;
            };
            if (!data.access_token) {
                throw new Error('Resposta de autenticação inválida');
            }
            login(data.access_token, data.expires_in);
        } catch (requestError) {
            setError(
                requestError instanceof DOMException && requestError.name === 'AbortError'
                    ? 'O servidor demorou para responder. Tente novamente.'
                    : 'Não foi possível conectar ao servidor.'
            );
        } finally {
            window.clearTimeout(timeout);
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-dvh grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] bg-[var(--bg-base)]">
            <section className="hidden lg:flex relative overflow-hidden bg-[var(--primary-dark)] text-white p-12 xl:p-16 flex-col justify-between">
                <div className="auth-grid absolute inset-0 opacity-20" aria-hidden="true" />
                <div
                    className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[var(--accent)]/20 blur-3xl"
                    aria-hidden="true"
                />
                <div className="ifsc-logo relative">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl">
                        <img src="/logo-ifsc.png" alt="" className="h-10 w-10 object-contain" />
                    </span>
                    <div>
                        <div className="text-2xl font-extrabold tracking-tight">IFSC Chat</div>
                        <div className="text-xs uppercase tracking-[0.22em] text-white/65">
                            Assistente institucional
                        </div>
                    </div>
                </div>

                <div className="relative max-w-xl">
                    <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                        <FiBookOpen aria-hidden="true" /> Conhecimento IFSC em um só lugar
                    </span>
                    <h1 className="text-4xl xl:text-5xl font-bold leading-[1.12] tracking-tight">
                        Encontre respostas em documentos institucionais com rapidez.
                    </h1>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-white/72">
                        Consulte processos, bolsas, editais e procedimentos do Instituto de Física
                        de São Carlos.
                    </p>
                    <ul className="mt-8 grid gap-3 text-sm text-white/82">
                        {[
                            'Base documental institucional',
                            'Respostas organizadas e pesquisáveis',
                            'Sessão protegida e temporária',
                        ].map((feature) => (
                            <li key={feature} className="flex items-center gap-3">
                                <FiCheckCircle
                                    className="text-[var(--accent-light)]"
                                    aria-hidden="true"
                                />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative text-xs text-white/50">
                    Instituto de Física de São Carlos · USP
                </p>
            </section>

            <section className="relative flex min-h-dvh items-center justify-center overflow-hidden p-5 sm:p-10">
                <div
                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,101,52,0.11),transparent_60%)]"
                    aria-hidden="true"
                />
                <div
                    className="absolute top-24 -right-24 w-72 h-72 bg-[var(--accent)]/8 rounded-full blur-3xl"
                    aria-hidden="true"
                />
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative w-full max-w-[430px]"
                >
                    <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border)] shadow-2xl shadow-slate-900/8 p-6 sm:p-9">
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8"
                        >
                            <div className="ifsc-logo mb-7 lg:hidden">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
                                    <img
                                        src="/logo-ifsc.png"
                                        alt=""
                                        className="h-8 w-8 object-contain"
                                    />
                                </span>
                                <div className="text-left">
                                    <div className="ifsc-logo-text text-[var(--text-primary)]">
                                        IFSC<span className="text-[var(--primary)]">Chat</span>
                                    </div>
                                    <div className="ifsc-logo-subtitle">ASSISTENTE VIRTUAL</div>
                                </div>
                            </div>
                            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                <FiShield aria-hidden="true" /> Área segura
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                                Bem-vindo de volta
                            </h1>
                            <p className="mt-2 text-[var(--text-secondary)] text-sm leading-relaxed">
                                Entre com suas credenciais institucionais para continuar.
                            </p>
                        </motion.div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -8, height: 0 }}
                                    className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl mb-6 text-sm"
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <FiAlertCircle
                                        className="shrink-0 w-4 h-4"
                                        aria-hidden="true"
                                    />
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
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
                                >
                                    Usuário
                                </label>
                                <div className="relative">
                                    <FiUser
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4"
                                        aria-hidden="true"
                                    />
                                    <input
                                        id="username"
                                        ref={usernameRef}
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Digite seu usuário"
                                        autoComplete="username"
                                        maxLength={150}
                                        spellCheck={false}
                                        className="field-control w-full rounded-xl pl-11 pr-4 py-3.5 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
                                >
                                    Senha
                                </label>
                                <div className="relative">
                                    <FiLock
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4"
                                        aria-hidden="true"
                                    />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        maxLength={256}
                                        className="field-control w-full rounded-xl pl-11 pr-12 py-3.5 text-sm"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                                        aria-label={
                                            showPassword ? 'Ocultar senha' : 'Mostrar senha'
                                        }
                                    >
                                        {showPassword ? (
                                            <FiEyeOff aria-hidden="true" />
                                        ) : (
                                            <FiEye aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading || !username.trim() || !password}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white py-3.5 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/30 flex items-center justify-center gap-2 mt-2"
                                aria-busy={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        Entrar{' '}
                                        <FiArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </>
                                )}
                            </motion.button>
                        </motion.form>

                        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                            <FiLock aria-hidden="true" /> Sua sessão expira automaticamente.
                        </p>
                    </div>

                    <p className="text-center text-xs text-[var(--text-muted)] mt-5">
                        IFSC USP &copy; {new Date().getFullYear()} &middot; Instituto de Física de
                        São Carlos
                    </p>
                </motion.div>
            </section>
        </main>
    );
}

export default React.memo(Auth);
