import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiSend,
    FiLogOut,
    FiLoader,
    FiAlertCircle,
    FiSearch,
    FiFile,
    FiChevronLeft,
    FiChevronRight,
    FiX,
} from "react-icons/fi";
import Message from "./Message";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface ChatProps {
    onLogout: () => void;
}

function Chat({ onLogout }: ChatProps) {
    const { token, logout } = useAuth();

    const [messages, setMessages] = useState([
        {
            sender: "bot" as const,
            text: "Olá! Sou o **IFSC Assistente**, um chatbot especializado em auxiliar com dúvidas sobre o **Instituto de Física de São Carlos (IFSC-USP)**.\n\nComigo, você pode tirar dúvidas sobre:\n\n- Processos seletivos\n- Bolsas de iniciação científica\n- Editais e oportunidades\n- Documentos institucionais\n- Procedimentos administrativos",
        },
    ]);
    const [question, setQuestion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea as user types
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }, [question]);

    const sendQuestion = useCallback(async () => {
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        const userMessage = {
            sender: "user" as const,
            text: question,
        };

        const currentQuestion = question;
        setMessages((prev) => [...prev, userMessage]);
        setQuestion("");

        try {
            const response = await fetch(`${API_BASE}/chat-api`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ question: currentQuestion }),
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            setMessages((prev) => [
                ...prev,
                {
                    sender: "bot",
                    text: data?.answer || "O servidor retornou uma resposta inválida.",
                },
            ]);
        } catch (err) {
            const message =
                err instanceof Error && err.message !== "Failed to fetch"
                    ? err.message
                    : "Não consegui processar sua pergunta. Tente novamente.";

            setError(message);
            setMessages((prev) => [
                ...prev,
                {
                    sender: "bot",
                    text: "Desculpe, não consegui processar sua pergunta. Pode reformular ou tentar novamente?",
                },
            ]);
        } finally {
            setIsLoading(false);
            // Re-focus textarea after response
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [question, isLoading, token, logout]);

    function handleLogout() {
        logout();
        onLogout();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendQuestion();
        }
    }

    const suggestedQuestions = [
        "Quais as oportunidades de bolsa de iniciação científica no IFSC?",
        "Como funciona o processo seletivo para ingresso no IFSC?",
        "Quais os documentos necessários para pedido de auxílio financeiro?",
        "Tem editais abertos para mestrado ou doutorado?",
    ];

    const sidebarContent = (
        <div className="flex flex-col h-full p-5 pb-20">
            <div className="mb-5">
                <div className="ifsc-logo">
                    <img src="/logo-ifsc.png" alt="IFSC Logo" className="w-10 h-10 object-contain shrink-0" />
                    <div className="text-left">
                        <div className="ifsc-logo-text text-[var(--text-primary)]">IFSC<span className="text-[var(--primary)]">Chat</span></div>
                        <div className="ifsc-logo-subtitle">MENU</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 chat-scrollbar">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Sugestões</h3>

                <div className="space-y-2 flex flex-col">
                    {suggestedQuestions.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setQuestion(item);
                                setIsSidebarOpen(false);
                            }}
                            className="text-left flex items-start gap-2.5 p-3 rounded-xl hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-light)] border border-transparent transition-all text-sm bg-[var(--bg-input)] w-full"
                        >
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] mt-1.5 shrink-0"></div>
                            <span>
                                <span className="block font-medium text-[var(--text-primary)]">{item.split("?")[0]}?</span>
                                <span className="block text-xs text-[var(--text-muted)] mt-0.5">Clique para perguntar</span>
                            </span>
                        </button>
                    ))}
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 mt-6">Documentos base</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-input)]">
                        <FiFile className="w-4 h-4 text-[var(--primary-light)] shrink-0" aria-hidden="true" />
                        <div>
                            <div className="font-medium text-sm text-[var(--text-primary)]">Editais recentes</div>
                            <div className="text-xs text-[var(--text-muted)]">FAPESP e CNPq</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-input)]">
                        <FiFile className="w-4 h-4 text-[var(--primary-light)] shrink-0" aria-hidden="true" />
                        <div>
                            <div className="font-medium text-sm text-[var(--text-primary)]">Guia do aluno</div>
                            <div className="text-xs text-[var(--text-muted)]">Iniciação científica</div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors fixed bottom-6"
                aria-label="Recolher menu lateral"
            >
                <FiChevronRight className="w-4 h-4" aria-hidden="true" /> Recolher menu
            </button>
        </div>
    );

    return (
        <div className="h-screen flex">
            {/* Sidebar Toggle Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
                aria-expanded={isSidebarOpen}
                className={`fixed top-6 left-4 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isSidebarOpen
                        ? "bg-[var(--bg-input)] border border-[var(--border)]"
                        : "backdrop-blur-md bg-[var(--bg-card)]/60 border border-white/10"
                }`}
            >
                {isSidebarOpen ? (
                    <FiX className="w-5 h-5 text-[var(--text-primary)]" aria-hidden="true" />
                ) : (
                    <FiSearch className="w-5 h-5 text-[var(--primary-light)]" aria-hidden="true" />
                )}
            </motion.button>

            {/* Sidebar + Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Backdrop overlay for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: -300, scaleX: 0.96 }}
                            animate={{ opacity: 1, x: 0, scaleX: 1 }}
                            exit={{ opacity: 0, x: -300, scaleX: 0.96, transition: { duration: 0.2 } }}
                            className="fixed inset-y-0 left-0 z-30 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border)]"
                            style={{ backdropFilter: "blur(24px)" }}
                            ref={sidebarRef}
                            role="navigation"
                            aria-label="Menu lateral"
                        >
                            {sidebarContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <div className="flex items-center gap-3 pl-12">
                        <div className="ifsc-logo">
                            <img src="/logo-ifsc.png" alt="IFSC Logo" className="w-9 h-9 object-contain shrink-0" />
                            <div className="text-left">
                                <div className="ifsc-logo-text text-[var(--text-primary)]">IFSC<span className="text-[var(--primary)]">Chat</span></div>
                                <div className="ifsc-logo-subtitle">Assistente Virtual</div>
                            </div>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        title="Encerrar sessão"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/8 transition-all"
                    >
                        <FiLogOut className="w-4 h-4" aria-hidden="true" /> Encerrar
                    </motion.button>
                </div>

                {/* Messages */}
                <main
                    className="flex-1 overflow-y-auto p-5 pb-6 chat-scrollbar"
                    aria-label="Conversa"
                    aria-live="polite"
                    aria-atomic="false"
                >
                    <div className="max-w-4xl mx-auto space-y-5">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, i) => (
                                <Message key={i} msg={msg} />
                            ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-start gap-3"
                                    aria-label="Aguardando resposta"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[var(--chat-bot-bg)] flex items-center justify-center shrink-0 border border-[var(--border)]">
                                        <svg className="w-4 h-4 animate-spin text-[var(--primary)]" viewBox="0 0 24 24" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-[var(--chat-bot-bg)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-5 py-3.5 max-w-[85%]"
                                    >
                                        <div className="flex gap-1.5 items-center h-5">
                                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 rounded-full bg-[var(--primary-light)] animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Error banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm"
                                    role="alert"
                                >
                                    <FiAlertCircle className="shrink-0" aria-hidden="true" />
                                    <span>{error}</span>
                                    <button
                                        onClick={() => setError(null)}
                                        className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
                                        aria-label="Fechar aviso de erro"
                                    >
                                        <FiX className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div ref={messagesEndRef} />
                </main>

                {/* Input Area */}
                <div className="bg-[var(--bg-card)] border-t border-[var(--border)] p-4">
                    <div className="max-w-4xl mx-auto">
                        {/* Suggested questions (shown before first user message) */}
                        <AnimatePresence>
                            {!messages.some((msg) => msg.sender === "user") && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="mb-3"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQuestions.map((item, index) => (
                                            <motion.button
                                                key={index}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setQuestion(item)}
                                                className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-full text-sm hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-light)] transition-all text-[var(--text-secondary)]"
                                            >
                                                {item}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendQuestion();
                            }}
                            className="flex gap-3 items-end"
                            aria-label="Enviar mensagem"
                        >
                            <div className="flex-1 relative">
                                <textarea
                                    ref={textareaRef}
                                    id="chat-input"
                                    className="chat-textarea w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-2xl px-5 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/25 transition-all text-sm resize-none leading-relaxed"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Digite sua pergunta sobre o IFSC... (Enter para enviar, Shift+Enter para nova linha)"
                                    disabled={isLoading}
                                    rows={1}
                                    aria-label="Campo de mensagem"
                                    maxLength={2000}
                                />
                                {question.length > 1800 && (
                                    <span className="absolute bottom-2 right-3 text-xs text-[var(--text-muted)]">
                                        {question.length}/2000
                                    </span>
                                )}
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading || !question.trim()}
                                whileTap={{ scale: 0.95 }}
                                className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/35 transition-shadow shrink-0"
                                aria-label="Enviar mensagem"
                            >
                                {isLoading ? (
                                    <FiLoader className="w-5 h-5 animate-spin text-white" aria-hidden="true" />
                                ) : (
                                    <FiSend className="w-4 h-4 text-white" aria-hidden="true" />
                                )}
                            </motion.button>
                        </form>

                        <p className="text-xs text-center text-[var(--text-muted)] mt-2">
                            IFSC Assistente &bull; Tirando dúvidas sobre o Instituto de Física de São Carlos
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(Chat);