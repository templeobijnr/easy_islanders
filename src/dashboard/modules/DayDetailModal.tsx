import React, { useState } from 'react';
import { X, Trash2, Clock, Ban, Calendar } from 'lucide-react';
import { BlockedDate, BlockedTimeRange } from '../../../types';
import { formatDate } from '../../utils/formatters';

interface DayDetailModalProps {
    date: Date;
    blockedDate: BlockedDate | null;
    defaultHours: { open: string; close: string };
    onClose: () => void;
    onSave: (updatedBlock: Partial<BlockedDate>) => void;
    onDelete: () => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
    date,
    blockedDate,
    defaultHours,
    onClose,
    onSave,
    onDelete
}) => {
    const [allDay, setAllDay] = useState(blockedDate?.allDay ?? false);
    // Initialize with first time block if exists, otherwise empty
    const existingBlock = blockedDate?.timeBlocks?.[0];
    const [blockStart, setBlockStart] = useState(existingBlock?.startTime || '');
    const [blockEnd, setBlockEnd] = useState(existingBlock?.endTime || '');
    const [reason, setReason] = useState(blockedDate?.reason || '');

    const formattedDate = formatDate(date, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const handleSave = () => {
        const data: Partial<BlockedDate> = {
            allDay,
            timeBlocks: [],
        };

        // Add time block if valid times are entered
        if (!allDay && blockStart && blockEnd && blockStart < blockEnd) {
            data.timeBlocks = [{ startTime: blockStart, endTime: blockEnd }];
        }

        // Only include reason if it has a value
        if (reason && reason.trim()) {
            data.reason = reason.trim();
        }

        onSave(data);
    };

    // Enable save when there are changes
    const hasValidTimeBlock = !allDay && blockStart && blockEnd && blockStart < blockEnd;
    const hasChanges = allDay || hasValidTimeBlock;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar size={24} />
                            <div>
                                <h2 className="text-xl font-bold">{formattedDate}</h2>
                                <p className="text-slate-300 text-sm">
                                    Default hours: {defaultHours.open} - {defaultHours.close}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* All Day Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Ban className="text-slate-400" size={20} />
                            <div>
                                <p className="font-bold text-slate-900">Block Entire Day</p>
                                <p className="text-xs text-slate-500">
                                    No bookings will be accepted
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allDay}
                                onChange={(e) => setAllDay(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>

                    {/* Time Block (only if not all day) */}
                    {!allDay && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-slate-400" />
                                <h3 className="font-bold text-slate-900">Block a Time Range</h3>
                            </div>
                            <p className="text-sm text-slate-500">
                                Select the hours you want to block on this day.
                            </p>

                            {/* Simple FROM/TO inputs */}
                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        From
                                    </label>
                                    <input
                                        type="time"
                                        value={blockStart}
                                        onChange={(e) => setBlockStart(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        To
                                    </label>
                                    <input
                                        type="time"
                                        value={blockEnd}
                                        onChange={(e) => setBlockEnd(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Validation message */}
                            {blockStart && blockEnd && blockStart >= blockEnd && (
                                <p className="text-xs text-red-500">
                                    End time must be after start time
                                </p>
                            )}
                        </div>
                    )}

                    {/* Reason (optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Reason (optional)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Private event, Holiday..."
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    {blockedDate && (
                        <button
                            onClick={onDelete}
                            className="text-red-600 hover:text-red-700 font-bold text-sm flex items-center gap-1"
                        >
                            <Trash2 size={16} /> Clear Block
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges && !blockedDate}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayDetailModal;
