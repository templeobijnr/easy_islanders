/**
 * ManualView - Manual item entry view
 */
import React from "react";
import { Plus, ChevronRight, Loader2, X } from "lucide-react";
import type { ManualItem, TeachAgentView } from "../types";

interface ManualViewProps {
    manualItems: ManualItem[];
    addManualItem: () => void;
    updateManualItem: (index: number, field: keyof ManualItem, value: string) => void;
    isSubmitting: boolean;
    handleSaveManualItems: () => void;
    setActiveView: (view: TeachAgentView) => void;
}

const ManualView: React.FC<ManualViewProps> = ({ manualItems, addManualItem, updateManualItem, isSubmitting, handleSaveManualItems, setActiveView }) => {
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <button onClick={() => setActiveView("options")} className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back to options
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Add Products & Services</h2>
            <p className="text-slate-600 mb-6">Add items one by one. You can always add more later.</p>

            <div className="space-y-4">
                {manualItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex gap-3 mb-3">
                            <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateManualItem(index, "name", e.target.value)}
                                placeholder="Item name (e.g., Haircut, Kebab Plate)"
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-400"
                            />
                            <input
                                type="text"
                                value={item.price}
                                onChange={(e) => updateManualItem(index, "price", e.target.value)}
                                placeholder="Price"
                                className="w-24 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-400"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={item.type === "product"}
                                    onChange={() => updateManualItem(index, "type", "product")}
                                    className="accent-purple-600"
                                />
                                <span className="text-sm text-slate-600">Product</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={item.type === "service"}
                                    onChange={() => updateManualItem(index, "type", "service")}
                                    className="accent-purple-600"
                                />
                                <span className="text-sm text-slate-600">Service</span>
                            </label>
                            <input
                                type="text"
                                value={item.note}
                                onChange={(e) => updateManualItem(index, "note", e.target.value)}
                                placeholder="Optional note"
                                className="flex-1 px-3 py-1 text-sm rounded-lg border border-slate-100 outline-none focus:border-purple-300"
                            />
                        </div>
                    </div>
                ))}

                <button onClick={addManualItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-slate-300 hover:text-slate-700 flex items-center justify-center gap-2">
                    <Plus size={18} /> Add another item
                </button>
            </div>

            <button
                onClick={handleSaveManualItems}
                disabled={isSubmitting || !manualItems.some((i) => i.name.trim())}
                className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : <>Save Items <ChevronRight size={20} /></>}
            </button>
        </div>
    );
};

export default ManualView;
