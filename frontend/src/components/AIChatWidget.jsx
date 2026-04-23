/**
 * Floating AI chat assistant widget.
 * Renders globally — a bubble in the bottom-right corner that expands to a chat panel.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, ChevronDown } from 'lucide-react';
import { aiAPI } from '../api/client';

const SUGGESTIONS = [
    'How do I improve my resume?',
    'Tips for cold emailing recruiters',
    'How to prepare for technical interviews',
    'What skills are most in-demand?',
];

function TypingIndicator() {
    return (
        <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#e60023' }}
                />
            ))}
        </div>
    );
}

export function AIChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (text) => {
        const content = text || input.trim();
        if (!content || loading) return;
        setInput('');

        const userMsg = { role: 'user', content };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setLoading(true);

        try {
            const res = await aiAPI.chat({ messages: nextMessages });
            const reply = res.data.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            if (!open) setUnread(u => u + 1);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I ran into an issue. Please try again in a moment.',
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            {/* Chat panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="chat-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                        className="ai-chat-panel"
                        style={{
                            position: 'fixed',
                            right: 16,
                            width: 340,
                            maxWidth: 'calc(100vw - 32px)',
                            height: 480,
                            maxHeight: 'calc(100vh - 120px)',
                            background: '#ffffff',
                            border: '1px solid #e1e1e1',
                            borderRadius: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            zIndex: 200,
                            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: '#ffffff',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: '#e60023',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Sparkles size={15} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>NextStep AI</p>
                                <p style={{ fontSize: 11, color: '#e60023' }}>Career assistant</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {messages.length === 0 && (
                                <div style={{ padding: '20px 0' }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
                                        Ask me anything about your job search
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {SUGGESTIONS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => send(s)}
                                                style={{
                                                    background: 'rgba(230,0,35,0.06)',
                                                    border: '1px solid rgba(230,0,35,0.15)',
                                                    borderRadius: 10,
                                                    padding: '8px 12px',
                                                    fontSize: 12,
                                                    color: '#e60023',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        background: msg.role === 'user' ? '#e60023' : '#f3f3f3',
                                        border: `1px solid ${msg.role === 'user' ? 'transparent' : '#e1e1e1'}`,
                                        color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        padding: '9px 13px',
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {msg.content}
                                </motion.div>
                            ))}

                            {loading && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    background: '#f3f3f3',
                                    border: '1px solid #e1e1e1',
                                    borderRadius: '16px 16px 16px 4px',
                                }}>
                                    <TypingIndicator />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{
                            padding: '10px 12px',
                            borderTop: '1px solid #f0f0f0',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'flex-end',
                        }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Ask anything..."
                                rows={1}
                                style={{
                                    flex: 1,
                                    background: '#f3f3f3',
                                    border: '1px solid #e1e1e1',
                                    borderRadius: 12,
                                    padding: '9px 12px',
                                    fontSize: 13,
                                    color: 'var(--text-primary)',
                                    resize: 'none',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.4,
                                    maxHeight: 100,
                                    overflow: 'auto',
                                }}
                            />
                            <button
                                onClick={() => send()}
                                disabled={!input.trim() || loading}
                                style={{
                                    width: 36, height: 36,
                                    borderRadius: 10,
                                    background: input.trim() && !loading ? '#e60023' : '#f0f0f0',
                                    border: 'none',
                                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={15} color={input.trim() && !loading ? '#fff' : '#aaa'} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble toggle */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpen(o => !o)}
                className="ai-chat-button"
                style={{
                    position: 'fixed',
                    right: 16,
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#e60023',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(230,0,35,0.4)',
                    zIndex: 201,
                }}
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <X size={20} color="#fff" />
                        </motion.span>
                    ) : (
                        <motion.span key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <MessageSquare size={20} color="#fff" />
                        </motion.span>
                    )}
                </AnimatePresence>
                {unread > 0 && !open && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#f87171', fontSize: 10, fontWeight: 800,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #06070f',
                    }}>
                        {unread}
                    </span>
                )}
            </motion.button>
        </>
    );
}
