/**
 * AgentTestChat - Sandbox chat for testing agent before going live
 * Embedded version of BusinessChatWidget for the dashboard
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { v1Url } from '../../services/integrations/backend/v1.api';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    tools?: string[];
}

interface AgentTestChatProps {
    businessId: string;
    businessName: string;
}

const AgentTestChat: React.FC<AgentTestChatProps> = ({ businessId, businessName }) => {
    const { firebaseUser } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Initial greeting
        setMessages([{
            id: 'greeting',
            role: 'model',
            text: `👋 This is a **sandbox** to test your agent. Messages here won't be saved to your Inbox.\n\nTry asking: "What services do you offer?" or "I'd like to book a table"`,
        }]);
    }, []);

    const ensureSession = async (token: string): Promise<string> => {
        if (sessionId) return sessionId;

        const response = await fetch(v1Url('/public-chat/session/create'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ businessId })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = payload?.error || payload?.message || `HTTP ${response.status}`;
            throw new Error(msg);
        }

        const newSessionId = payload.sessionId as string | undefined;
        if (!newSessionId) throw new Error('Failed to create chat session');
        setSessionId(newSessionId);
        return newSessionId;
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        setMessages(prev => [...prev, {
            id: `user_${Date.now()}`,
            role: 'user',
            text: userMessage,
        }]);

        setIsLoading(true);

        try {
            const token = firebaseUser ? await firebaseUser.getIdToken() : null;
            const ensuredSessionId = await ensureSession(token || '');

            const response = await fetch(v1Url('/public-chat/message/send'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    businessId,
                    sessionId: ensuredSessionId,
                    text: userMessage,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const msg = data?.error || data?.message || 'Chat request failed';
                throw new Error(msg);
            }

            setMessages(prev => [...prev, {
                id: `model_${Date.now()}`,
                role: 'model',
                text: data.text,
                tools: data.toolsExecuted,
            }]);
        } catch (error) {
            console.error('Agent test chat error:', error);
            setMessages(prev => [...prev, {
                id: `error_${Date.now()}`,
                role: 'model',
                text: '⚠️ Failed to get response. Check your API configuration.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetChat = () => {
        setSessionId(null);
        setMessages([{
            id: 'greeting',
            role: 'model',
            text: `👋 Chat reset. Try a different conversation!`,
        }]);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot size={20} />
                    <span className="font-bold">Test Your Agent</span>
                    <span className="bg-amber-500 text-xs px-2 py-0.5 rounded-full">Sandbox</span>
                </div>
                <button
                    onClick={resetChat}
                    className="text-slate-300 hover:text-white p-1"
                    title="Reset conversation"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            {msg.tools && msg.tools.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                    <span className="text-xs text-slate-400">Tools called:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {msg.tools.map((tool, i) => (
                                            <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                                {tool}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                            <span className="text-sm text-slate-500">Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type a test message..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentTestChat;
