/**
 * KnowledgeSidebar - Live Knowledge Status Panel
 * Shows what the AI knows as content is added in real-time.
 */
import React, { useState } from 'react';
import { Brain, Check, Circle, MessageSquare, X, Send, Loader2 } from 'lucide-react';

interface KnowledgeSidebarProps {
    knowledgeCount: number;
    productCount: number;
    hasOfferings: boolean;
    hasPrices: boolean;
    hasOtherInfo: boolean;
    businessId: string | null;
    onTestChat?: () => void;
}

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
    knowledgeCount,
    productCount,
    hasOfferings,
    hasPrices,
    hasOtherInfo,
    businessId,
    onTestChat
}) => {
    const [showTestChat, setShowTestChat] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [testResponse, setTestResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleTestChat = async () => {
        if (!testMessage.trim()) return;
        setIsLoading(true);
        setTestResponse('');

        setTestResponse(
            'Preview chat is disabled in V1. Test your knowledge via the public business chat (it uses the same RAG pipeline).'
        );
        setIsLoading(false);
    };

    const items = [
        {
            label: 'Offerings uploaded',
            done: hasOfferings,
            hint: 'What you sell or offer'
        },
        {
            label: 'Prices added',
            done: hasPrices,
            hint: 'Your pricing info'
        },
        {
            label: 'Other info',
            done: hasOtherInfo,
            hint: 'Reservations, hours, etc.'
        },
    ];

    const completedCount = items.filter(i => i.done).length;
    const progress = Math.round((completedCount / items.length) * 100);

    return (
        <div className="sticky top-4 space-y-4">
            {/* Progress Card */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-purple-600" size={20} />
                    <h3 className="font-bold text-slate-800">What Your AI Knows</h3>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Setup Progress</span>
                        <span className="font-bold text-purple-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-2 text-sm ${item.done ? 'text-green-600' : 'text-slate-400'}`}
                        >
                            {item.done ? (
                                <Check size={16} className="text-green-500" />
                            ) : (
                                <Circle size={16} />
                            )}
                            <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-purple-100 grid grid-cols-2 gap-3">
                    <div className="text-center bg-white/60 rounded-xl p-2">
                        <div className="text-xl font-bold text-purple-600">{knowledgeCount}</div>
                        <div className="text-xs text-slate-500">Knowledge Items</div>
                    </div>
                    <div className="text-center bg-white/60 rounded-xl p-2">
                        <div className="text-xl font-bold text-indigo-600">{productCount}</div>
                        <div className="text-xs text-slate-500">Products</div>
                    </div>
                </div>
            </div>

            {/* Test Your AI */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <button
                    onClick={() => setShowTestChat(!showTestChat)}
                    className="w-full flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-slate-600" />
                        <span className="font-bold text-slate-800">Test Your AI</span>
                    </div>
                    {showTestChat ? <X size={18} /> : <span className="text-purple-600 text-sm">Try it →</span>}
                </button>

                {showTestChat && (
                    <div className="mt-4 space-y-3">
                        <p className="text-sm text-slate-500">
                            Ask a question like a customer would:
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
                                placeholder="What's on your menu?"
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleTestChat}
                                disabled={isLoading || !testMessage.trim()}
                                className="bg-purple-600 text-white px-3 py-2 rounded-xl disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                        {testResponse && (
                            <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">
                                <span className="font-medium text-purple-600">AI: </span>
                                {testResponse}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeSidebar;
