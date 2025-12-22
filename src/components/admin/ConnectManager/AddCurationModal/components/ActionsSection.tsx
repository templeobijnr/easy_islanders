/**
 * ActionsSection - Action toggles and URL inputs
 */
import React from "react";
import { ACTIONS_CONFIG } from "../constants";

interface ActionsSectionProps {
    enabledActions: Record<string, boolean>;
    onToggleAction: (actionId: string) => void;
    actionUrls: Record<string, string>;
    setActionUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const ActionsSection: React.FC<ActionsSectionProps> = ({
    enabledActions,
    onToggleAction,
    actionUrls,
    setActionUrls,
}) => {
    return (
        <div className="bg-slate-800/50 p-4 rounded-xl space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase">
                Enable Actions
            </label>
            <div className="grid grid-cols-3 gap-3">
                {ACTIONS_CONFIG.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onToggleAction(action.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all ${enabledActions[action.id]
                                ? `bg-${action.color}-500/20 text-${action.color}-400 border border-${action.color}-500/30`
                                : "bg-slate-700 text-slate-400 border border-transparent"
                            }`}
                    >
                        <action.icon size={16} />
                        <span className="text-sm">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Action URLs */}
            {Object.entries(enabledActions).some(([_, v]) => v) && (
                <div className="grid gap-2 mt-3">
                    {enabledActions.book && (
                        <input
                            value={actionUrls.book || ""}
                            onChange={(e) =>
                                setActionUrls((prev) => ({
                                    ...prev,
                                    book: e.target.value,
                                }))
                            }
                            placeholder="Booking/Waitlist URL..."
                            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    )}
                    {enabledActions.tickets && (
                        <input
                            value={actionUrls.tickets || ""}
                            onChange={(e) =>
                                setActionUrls((prev) => ({
                                    ...prev,
                                    tickets: e.target.value,
                                }))
                            }
                            placeholder="Ticket URL..."
                            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    )}
                    {enabledActions.link && (
                        <input
                            value={actionUrls.link || ""}
                            onChange={(e) =>
                                setActionUrls((prev) => ({
                                    ...prev,
                                    link: e.target.value,
                                }))
                            }
                            placeholder="External Link URL..."
                            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default ActionsSection;
