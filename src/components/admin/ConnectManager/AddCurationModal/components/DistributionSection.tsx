/**
 * DistributionSection - Feed distribution checkboxes
 */
import React from "react";
import { CheckCircle } from "lucide-react";
import { SECTIONS } from "../constants";

interface DistributionSectionProps {
    selectedSections: string[];
    onToggleSection: (sectionId: string) => void;
}

const DistributionSection: React.FC<DistributionSectionProps> = ({
    selectedSections,
    onToggleSection,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
                Distribute to Feeds
            </label>
            <div className="grid grid-cols-2 gap-3">
                {SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => onToggleSection(section.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedSections.includes(section.id)
                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                                : "bg-slate-800 border-white/5 text-slate-400 opacity-50 hover:opacity-100"
                            }`}
                    >
                        <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedSections.includes(section.id)
                                    ? "border-cyan-500 bg-cyan-500"
                                    : "border-slate-500"
                                }`}
                        >
                            {selectedSections.includes(section.id) && (
                                <CheckCircle size={12} className="text-black" />
                            )}
                        </div>
                        <span className="font-medium text-sm">{section.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DistributionSection;
