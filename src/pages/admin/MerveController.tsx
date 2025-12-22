/**
 * Merve Controller - Admin Page
 * 
 * Control global + per-tool enablement, templates, and safety policies.
 * Route: /admin/merve
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Power, Settings, Save, ArrowLeft, AlertCircle, CheckCircle,
    Utensils, Wrench, Calendar, Home, Pill, Newspaper, Map, Car,
    RefreshCw, Shield, MessageSquare
} from 'lucide-react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

// ============================================================================
// TYPES
// ============================================================================

interface ToolConfig {
    enabled: boolean;
    defaultTemplate: string;
    allowedTags?: string[];
    requireConfirmation?: boolean;
}

interface MerveConfig {
    enabled: boolean;
    defaultLanguage: string;
    marketId: string;
    safety: {
        requireConfirmFor: string[];
        maxOutboundPerInbound: number;
    };
    tools: Record<string, ToolConfig>;
    updatedAt: any;
    updatedBy?: string;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOL_DEFINITIONS = [
    { name: 'orderFood', label: 'Order Food', icon: Utensils, category: 'dispatch' },
    { name: 'bookService', label: 'Book Service', icon: Wrench, category: 'dispatch' },
    { name: 'bookActivity', label: 'Book Activity', icon: Calendar, category: 'dispatch' },
    { name: 'bookStay', label: 'Book Stay', icon: Home, category: 'dispatch' },
    { name: 'requestTaxi', label: 'Request Taxi', icon: Car, category: 'dispatch' },
    { name: 'findPharmacy', label: 'Find Pharmacy', icon: Pill, category: 'read' },
    { name: 'getNews', label: 'Get News', icon: Newspaper, category: 'read' },
    { name: 'showDirections', label: 'Show Directions', icon: Map, category: 'read' },
    { name: 'findClosest', label: 'Find Closest', icon: Map, category: 'read' },
];

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: MerveConfig = {
    enabled: true,
    defaultLanguage: 'en',
    marketId: 'nc',
    safety: {
        requireConfirmFor: ['orderFood', 'bookService', 'bookActivity', 'bookStay', 'requestTaxi'],
        maxOutboundPerInbound: 3,
    },
    tools: {
        orderFood: {
            enabled: true,
            defaultTemplate: `🍽️ New Order from Easy Islanders

Customer: {customerName}
Phone: {customerPhone}

{items}

Total: {total}
Deliver to: {address}
{notes}`,
        },
        bookService: {
            enabled: true,
            defaultTemplate: `🔧 New Service Request

Service: {serviceType}
Customer: {customerName}
Phone: {customerPhone}
Address: {address}
Urgency: {urgency}

Details: {description}`,
            allowedTags: ['plumber', 'electrician', 'handyman', 'ac_technician', 'painter', 'cleaner'],
        },
        bookActivity: { enabled: true, defaultTemplate: '' },
        bookStay: { enabled: true, defaultTemplate: '' },
        requestTaxi: { enabled: true, defaultTemplate: '' },
        findPharmacy: { enabled: true, defaultTemplate: '' },
        getNews: { enabled: true, defaultTemplate: '' },
        showDirections: { enabled: true, defaultTemplate: '' },
        findClosest: { enabled: true, defaultTemplate: '' },
    },
    updatedAt: null,
};

// ============================================================================
// COMPONENT
// ============================================================================

const MerveController: React.FC = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState<MerveConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedTool, setSelectedTool] = useState<string | null>(null);

    const marketId = 'nc'; // North Cyprus market

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, `markets/${marketId}/merve/config`);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const raw = docSnap.data() as Partial<MerveConfig>;
                setConfig({
                    ...DEFAULT_CONFIG,
                    ...raw,
                    marketId,
                    safety: {
                        ...DEFAULT_CONFIG.safety,
                        ...(raw.safety || {}),
                    },
                    tools: {
                        ...DEFAULT_CONFIG.tools,
                        ...(raw.tools || {}),
                    },
                } as MerveConfig);
            } else {
                // Initialize with defaults
                setConfig({ ...DEFAULT_CONFIG, marketId });
            }
        } catch (error) {
            console.error('Failed to load Merve config:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const docRef = doc(db, `markets/${marketId}/merve/config`);
            await setDoc(docRef, {
                ...config,
                updatedAt: Timestamp.now(),
            }, { merge: true });
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Failed to save config:', error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const toggleGlobal = () => {
        setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    };

    const toggleTool = (toolName: string) => {
        setConfig(prev => ({
            ...prev,
            tools: {
                ...prev.tools,
                [toolName]: {
                    ...prev.tools[toolName],
                    enabled: !prev.tools[toolName]?.enabled,
                },
            },
        }));
    };

    const updateToolTemplate = (toolName: string, template: string) => {
        setConfig(prev => ({
            ...prev,
            tools: {
                ...prev.tools,
                [toolName]: {
                    ...prev.tools[toolName],
                    defaultTemplate: template,
                },
            },
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-500" />
                                Merve Controller
                            </h1>
                            <p className="text-sm text-slate-400">Control tools, templates, and safety policies</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {saveStatus === 'success' && (
                            <span className="text-emerald-400 flex items-center gap-1 text-sm">
                                <CheckCircle className="w-4 h-4" /> Saved
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-red-400 flex items-center gap-1 text-sm">
                                <AlertCircle className="w-4 h-4" /> Error
                            </span>
                        )}
                        <button
                            onClick={saveConfig}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-8">
                {/* Global Toggle */}
                <section className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Power className={config.enabled ? 'text-emerald-500' : 'text-red-500'} />
                                Global Status
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                {config.enabled
                                    ? 'Merve is active and responding to users'
                                    : 'Merve is offline - all tool calls will be blocked'}
                            </p>
                        </div>
                        <button
                            onClick={toggleGlobal}
                            className={`relative w-14 h-8 rounded-full transition-colors ${config.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                                }`}
                        >
                            <span
                                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${config.enabled ? 'left-7' : 'left-1'
                                    }`}
                            />
                        </button>
                    </div>
                </section>

                {/* Safety Settings */}
                <section className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Shield className="text-amber-500" />
                        Safety Settings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Max outbound messages per inbound
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={config.safety.maxOutboundPerInbound}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    safety: { ...prev.safety, maxOutboundPerInbound: parseInt(e.target.value) || 3 }
                                }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Default language
                            </label>
                            <select
                                value={config.defaultLanguage}
                                onChange={(e) => setConfig(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            >
                                <option value="en">English</option>
                                <option value="tr">Türkçe</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Tools Matrix */}
                <section className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <MessageSquare className="text-blue-500" />
                        Tools Configuration
                    </h2>

                    <div className="grid gap-3">
                        {TOOL_DEFINITIONS.map((tool) => {
                            const Icon = tool.icon;
                            const toolConfig = config.tools[tool.name] || { enabled: false, defaultTemplate: '' };
                            const isDispatch = tool.category === 'dispatch';
                            const isSelected = selectedTool === tool.name;

                            return (
                                <div
                                    key={tool.name}
                                    className={`border rounded-lg transition-colors ${isSelected ? 'border-emerald-500 bg-slate-800/50' : 'border-slate-800'
                                        }`}
                                >
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer"
                                        onClick={() => setSelectedTool(isSelected ? null : tool.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-5 h-5 ${toolConfig.enabled ? 'text-emerald-500' : 'text-slate-500'
                                                }`} />
                                            <div>
                                                <span className="font-medium">{tool.label}</span>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isDispatch ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {isDispatch ? 'Dispatch' : 'Read-only'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTool(tool.name);
                                            }}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${toolConfig.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                                                }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${toolConfig.enabled ? 'left-6' : 'left-0.5'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Expanded view */}
                                    {isSelected && isDispatch && (
                                        <div className="px-4 pb-4 border-t border-slate-800 pt-4">
                                            <label className="block text-sm text-slate-400 mb-2">
                                                Dispatch Template
                                            </label>
                                            <textarea
                                                rows={6}
                                                value={toolConfig.defaultTemplate}
                                                onChange={(e) => updateToolTemplate(tool.name, e.target.value)}
                                                placeholder="WhatsApp message template with {placeholders}..."
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                            />
                                            <p className="text-xs text-slate-500 mt-2">
                                                Variables: {'{customerName}'}, {'{customerPhone}'}, {'{address}'}, {'{items}'}, {'{total}'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default MerveController;
