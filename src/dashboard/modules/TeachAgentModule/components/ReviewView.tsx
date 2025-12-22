/**
 * ReviewView - Success/review view after import
 */
import React from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import type { TeachAgentView } from "../types";

interface ReviewViewProps {
    extractedCount: number;
    setActiveView: (view: TeachAgentView) => void;
}

const ReviewView: React.FC<ReviewViewProps> = ({ extractedCount, setActiveView }) => {
    return (
        <div className="p-6 max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
            <p className="text-slate-600 mb-8">
                We're processing your {extractedCount > 0 ? `${extractedCount} item(s)` : "content"}. Your agent is learning...
            </p>

            <button
                onClick={() => setActiveView("options")}
                className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-700 inline-flex items-center gap-2"
            >
                Add More <ChevronRight size={20} />
            </button>

            <p className="text-slate-400 text-sm mt-6">You can test your agent now—it'll improve as processing completes.</p>
        </div>
    );
};

export default ReviewView;
