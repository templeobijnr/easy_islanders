import React from 'react';
import { X, Award } from 'lucide-react';
import { SocialUser } from '../../types';

interface StampsModalProps {
    user: SocialUser;
    onClose: () => void;
}

const StampsModal: React.FC<StampsModalProps> = ({ user, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                            <Award size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Passport Stamps</h2>
                            <p className="text-sm text-slate-500">{user.passportStamps.length} collected</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto grid grid-cols-3 md:grid-cols-4 gap-4">
                    {user.passportStamps.map(stamp => (
                        <div key={stamp.id} className="aspect-square rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center p-4 text-center hover:bg-amber-100 transition-colors cursor-pointer group relative">
                            <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform">{stamp.icon}</div>
                            <div className="font-bold text-slate-900 text-sm line-clamp-1">{stamp.locationName}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stamp.category}</div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-amber-700 font-mono">
                                {new Date(stamp.date).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {user.passportStamps.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            <Award size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No stamps yet. Go explore the island!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StampsModal;
