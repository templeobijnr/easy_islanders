/**
 * EventFormSection - Title, description, category, dates, region
 */
import React from "react";
import { EVENT_CATEGORIES } from "../constants";

interface EventFormSectionProps {
    eventTitle: string;
    setEventTitle: (t: string) => void;
    eventDesc: string;
    setEventDesc: (d: string) => void;
    eventCategory: string;
    setEventCategory: (c: string) => void;
    startDate: string;
    setStartDate: (d: string) => void;
    startTime: string;
    setStartTime: (t: string) => void;
    endDate: string;
    setEndDate: (d: string) => void;
    endTime: string;
    setEndTime: (t: string) => void;
    region: string;
    setRegion: (r: string) => void;
}

const EventFormSection: React.FC<EventFormSectionProps> = ({
    eventTitle,
    setEventTitle,
    eventDesc,
    setEventDesc,
    eventCategory,
    setEventCategory,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    region,
    setRegion,
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="h-px bg-white/10" />

            {/* Title & Desc */}
            <div className="grid gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Event Name *
                    </label>
                    <input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Summer Sunset Session"
                        className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Description
                    </label>
                    <textarea
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        rows={3}
                        placeholder="What's happening? details, lineup, pricing info..."
                        className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                </div>
            </div>

            {/* Category */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Event Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {EVENT_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setEventCategory(cat.id)}
                            className={`p-3 rounded-xl text-center transition-all ${eventCategory === cat.id
                                    ? "bg-purple-500/20 border border-purple-500 text-purple-400"
                                    : "bg-slate-800 border border-transparent text-slate-400 hover:bg-slate-700"
                                }`}
                        >
                            <cat.icon size={20} className="mx-auto mb-1" />
                            <div className="text-xs">{cat.label.split("/")[0]}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Starts
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white"
                        />
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-24 bg-slate-800 rounded-xl px-3 py-2 text-white"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Ends
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white"
                        />
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-24 bg-slate-800 rounded-xl px-3 py-2 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Region */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Region
                </label>
                <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 rounded-xl text-white"
                >
                    <option value="kyrenia">Kyrenia</option>
                    <option value="famagusta">Famagusta</option>
                    <option value="nicosia">Nicosia</option>
                    <option value="karpaz">Karpaz</option>
                    <option value="lefke">Lefke</option>
                    <option value="guzelyurt">Guzelyurt</option>
                </select>
            </div>
        </div>
    );
};

export default EventFormSection;
