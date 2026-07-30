import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    FiChevronDown,
    FiChevronUp,
    FiCode,
    FiCopy,
    FiCheck,
    FiDownload,
    FiUser,
} from 'react-icons/fi';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface MessageProps {
    msg: {
        sender: 'user' | 'bot';
        text: string;
    };
}

// Allow safe HTML subset; extends the default schema to keep code highlighting attrs
const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    },
};

function safeExternalUrl(href?: string): string | undefined {
    if (!href) return undefined;
    try {
        const url = new URL(href, window.location.origin);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : undefined;
    } catch {
        return undefined;
    }
}

function Message({ msg }: MessageProps) {
    const isBot = msg.sender === 'bot';
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const hasExpandedContent = isBot && msg.text.length > 1000;
    const processedText =
        hasExpandedContent && !isExpanded
            ? msg.text.substring(0, 500) +
              '\n\n...\n\n**(Resposta completa ocultada — clique em "Ver resposta completa" abaixo ↓)**'
            : msg.text;

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(msg.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, [msg.text]);

    const downloadResponse = useCallback(() => {
        const blob = new Blob([msg.text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `ifsc-resposta-${Date.now()}.md`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, [msg.text]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`group flex items-start gap-3.5 ${isBot ? '' : 'flex-row-reverse'}`}
            aria-label={isBot ? 'Mensagem do assistente' : 'Sua mensagem'}
        >
            {/* Avatar */}
            <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isBot
                        ? 'bg-[var(--chat-bot-bg)] border border-[var(--border)]'
                        : 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)]'
                }`}
                aria-hidden="true"
            >
                {isBot ? (
                    <img src="/logo-ifsc.png" alt="" className="w-5 h-5 object-contain" />
                ) : (
                    <FiUser className="w-4 h-4 text-white" />
                )}
            </div>

            <div
                className={`message-content flex flex-col gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto'}`}
            >
                {/* Bubble */}
                <div
                    className={`px-5 py-3.5 rounded-2xl ${
                        isBot
                            ? 'bg-[var(--chat-bot-bg)] border border-[var(--border)] rounded-tl-sm'
                            : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] rounded-tr-sm text-white'
                    }`}
                >
                    {isBot ? (
                        <div className="prose prose-invert max-w-none text-[var(--text-secondary)] text-sm leading-relaxed">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                                components={{
                                    h1: ({ node: _node, ...props }) => (
                                        <h1
                                            className="text-lg font-bold mb-3 text-[var(--text-primary)]"
                                            {...props}
                                        />
                                    ),
                                    h2: ({ node: _node, ...props }) => (
                                        <h2
                                            className="text-base font-semibold mb-2 text-[var(--text-primary)] pt-2"
                                            {...props}
                                        />
                                    ),
                                    h3: ({ node: _node, ...props }) => (
                                        <h3
                                            className="text-sm font-semibold mb-1 text-[var(--text-primary)] pt-1"
                                            {...props}
                                        />
                                    ),
                                    p: ({ node: _node, ...props }) => (
                                        <p className="mb-2 last:mb-0" {...props} />
                                    ),
                                    ul: ({ node: _node, ...props }) => (
                                        <ul
                                            className="list-disc list-outside ml-4 my-1 space-y-0.5"
                                            {...props}
                                        />
                                    ),
                                    ol: ({ node: _node, ...props }) => (
                                        <ol
                                            className="list-decimal list-outside ml-4 my-1 space-y-0.5"
                                            {...props}
                                        />
                                    ),
                                    li: ({ node: _node, ...props }) => (
                                        <li className="mb-0.5 last:mb-0" {...props} />
                                    ),
                                    code({ className, children, ...props }) {
                                        const isInline = !className?.startsWith('language-');
                                        if (!isInline) {
                                            const lang = className?.replace('language-', '') ?? '';
                                            return (
                                                <div className="bg-[var(--bg-base)] border border-[var(--border-light)] rounded-lg my-3 overflow-hidden">
                                                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-light)]">
                                                        <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                            <FiCode
                                                                className="w-3 h-3"
                                                                aria-hidden="true"
                                                            />
                                                            {lang || 'código'}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                navigator.clipboard.writeText(
                                                                    String(children).replace(
                                                                        /\n$/,
                                                                        ''
                                                                    )
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 text-xs text-[var(--primary-light)] hover:text-white transition-colors"
                                                            aria-label="Copiar código"
                                                        >
                                                            <FiCopy
                                                                className="w-3 h-3"
                                                                aria-hidden="true"
                                                            />{' '}
                                                            Copiar
                                                        </button>
                                                    </div>
                                                    <pre className="overflow-x-auto p-3 bg-[#0b1f3a] text-xs font-mono text-blue-100">
                                                        <code>{children}</code>
                                                    </pre>
                                                </div>
                                            );
                                        }
                                        return (
                                            <code
                                                className="bg-[var(--primary-soft)] px-1.5 py-0.5 rounded-md text-[var(--primary-dark)] font-mono text-xs"
                                                {...props}
                                            >
                                                {children}
                                            </code>
                                        );
                                    },
                                    blockquote({ node: _node, ...props }) {
                                        return (
                                            <blockquote
                                                className="border-l-2 border-[var(--primary)] pl-3 italic text-[var(--text-secondary)] my-2"
                                                {...props}
                                            />
                                        );
                                    },
                                    a({ node: _node, href, children }) {
                                        const safeHref = safeExternalUrl(href);
                                        if (!safeHref) {
                                            return <span>{children}</span>;
                                        }
                                        return (
                                            <a
                                                href={safeHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[var(--primary-light)] hover:underline"
                                            >
                                                {children}
                                            </a>
                                        );
                                    },
                                    table({ node: _node, ...props }) {
                                        return (
                                            <div className="overflow-x-auto my-3">
                                                <table
                                                    className="w-full text-sm border-collapse"
                                                    {...props}
                                                />
                                            </div>
                                        );
                                    },
                                    th({ node: _node, ...props }) {
                                        return (
                                            <th
                                                className="border border-[var(--border)] px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] font-semibold text-left"
                                                {...props}
                                            />
                                        );
                                    },
                                    td({ node: _node, ...props }) {
                                        return (
                                            <td
                                                className="border border-[var(--border)] px-3 py-2 text-[var(--text-secondary)]"
                                                {...props}
                                            />
                                        );
                                    },
                                }}
                            >
                                {processedText}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                            {msg.text}
                        </div>
                    )}
                </div>

                {/* Expand / collapse long messages */}
                {hasExpandedContent && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="self-start flex items-center gap-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:bg-[var(--chat-bot-bg)] transition-colors"
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? (
                            <>
                                <FiChevronUp className="w-3 h-3" aria-hidden="true" /> Recolher
                                resposta
                            </>
                        ) : (
                            <>
                                <FiChevronDown className="w-3 h-3" aria-hidden="true" /> Ver
                                resposta completa
                            </>
                        )}
                    </button>
                )}

                {/* Bot action buttons — visible on hover via group class */}
                {isBot && (
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-200">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={copyToClipboard}
                            title={copied ? 'Copiado!' : 'Copiar resposta'}
                            aria-label={copied ? 'Resposta copiada' : 'Copiar resposta'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all h-7 ${
                                copied
                                    ? 'bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary-light)]'
                                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <FiCheck className="w-3 h-3" aria-hidden="true" /> Copiado!
                                </>
                            ) : (
                                <>
                                    <FiCopy className="w-3 h-3" aria-hidden="true" /> Copiar
                                </>
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={downloadResponse}
                            title="Baixar resposta como Markdown"
                            aria-label="Baixar resposta como Markdown"
                            className="flex items-center gap-1.5 bg-[var(--bg-input)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors h-7"
                        >
                            <FiDownload className="w-3 h-3" aria-hidden="true" /> Baixar
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default Message;
