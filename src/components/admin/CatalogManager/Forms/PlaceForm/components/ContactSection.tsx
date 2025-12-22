/**
 * ContactSection - Phone and website fields
 */
import React from 'react';
import { Phone, Globe } from 'lucide-react';
import type { PlaceFormState } from '../types';

interface ContactSectionProps {
    form: PlaceFormState;
    setForm: React.Dispatch<React.SetStateAction<PlaceFormState>>;
}

const ContactSection: React.FC<ContactSectionProps> = ({ form, setForm }) => {
    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">📞 Contact</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Phone
                        className="absolute left-3 top-3.5 text-slate-500"
                        size={16}
                    />
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                    />
                </div>
                <div className="relative">
                    <Globe
                        className="absolute left-3 top-3.5 text-slate-500"
                        size={16}
                    />
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                        placeholder="Website"
                        value={form.website}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, website: e.target.value }))
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default ContactSection;
