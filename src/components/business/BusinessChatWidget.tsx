/**
 * BusinessChatWidget
 * Chat interface for business-specific AI agents
 * Replaces "Check Availability" on Discover listing cards
 */
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { v1Url } from '../../services/integrations/backend/v1.api';
import { formatDate } from '../../utils/formatters';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

interface BusinessChatWidgetProps {
    businessId: string;
    businessName: string;
    isOpen: boolean;
    onClose: () => void;
}

const BusinessChatWidget: React.FC<BusinessChatWidgetProps> = ({
    businessId,
    businessName,
    isOpen,
    onClose
}) => {
    const { user, firebaseUser } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);

            // Send initial greeting if no messages
            if (messages.length === 0) {
                setMessages([{
                    id: 'greeting',
                    role: 'model',
                    text: `Hello! I'm the AI assistant for ${businessName}. How can I help you today?`,
                    timestamp: new Date()
                }]);
            }
        }
    }, [isOpen, businessName]);

    const getChatToken = async (): Promise<string> => {
        if (firebaseUser) return firebaseUser.getIdToken();
        if (auth.currentUser) return auth.currentUser.getIdToken();
        const credential = await signInAnonymously(auth);
        return credential.user.getIdToken();
    };

    const ensureSession = async (token: string): Promise<string> => {
        if (sessionId) return sessionId;

        const response = await fetch(v1Url('/public-chat/session/create'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            text: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = await getChatToken();
            const ensuredSessionId = await ensureSession(token);

            const response = await fetch(v1Url('/public-chat/message/send'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessId,
                    sessionId: ensuredSessionId,
                    text: userMessage.text
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const msg = payload?.error || payload?.message || `HTTP ${response.status}`;
                console.error('Chat API error:', response.status, msg);
                throw new Error(msg);
            }

            const data = await response.json();

            const botMessage: Message = {
                id: `bot_${Date.now()}`,
                role: 'model',
                text: data.text || "I'm sorry, I couldn't process that. Please try again.",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error: unknown) {
            console.error('Chat error:', error);
            const errorMessage =
                error.message?.includes('Business not found')
                    ? "This business isn't available for chat right now."
                    : error.message?.includes('No token provided') || error.message?.includes('Invalid token')
                        ? "Please refresh the page and try again."
                        : error.message?.includes('Session access denied')
                            ? "This chat session expired. Please try again."
                            : "Sorry, I'm having trouble connecting right now. Please try again.";

            setMessages(prev => [...prev, {
                id: `error_${Date.now()}`,
                role: 'model',
                text: errorMessage,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{businessName}</h3>
                            <p className="text-xs text-white/80">AI Assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" style={{ minHeight: '300px' }}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-teal-500 text-white rounded-tr-sm'
                                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-sm'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                                    {formatDate(msg.timestamp, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Typing...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="p-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    {!user && (
                        <p className="text-xs text-amber-600 mt-2 text-center">
                            Sign in to save your chat history
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Chat Button Component - use this to trigger chat modal
 */
export const BusinessChatButton: React.FC<{
    businessId: string;
    businessName: string;
    className?: string;
}> = ({ businessId, businessName, className }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className || "flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"}
            >
                <MessageCircle className="w-4 h-4" />
                Chat
            </button>

            <BusinessChatWidget
                businessId={businessId}
                businessName={businessName}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
};

export default BusinessChatWidget;
