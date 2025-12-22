
import React from 'react';
import { Search, Scale, CalendarCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ValueProps: React.FC = () => {
    const { t } = useLanguage();

    const features = [
        {
            icon: Search,
            title: "Ask Any Question",
            desc: "Local knowledge at your fingertips. Ask about hidden gems, best beaches, or local tips 24/7.",
            color: "bg-blue-50 text-blue-600"
        },
        {
            icon: Scale,
            title: "Compare & Decide",
            desc: "See prices, availability, and details side-by-side without browsing dozens of websites.",
            color: "bg-purple-50 text-purple-600"
        },
        {
            icon: CalendarCheck,
            title: "Book Instantly",
            desc: "Your personal assistant is ready 24/7 to secure reservations, rentals, and tickets instantly.",
            color: "bg-teal-50 text-teal-600"
        }
    ];

    return (
        <section className="relative z-10 -mt-20 md:-mt-32 pb-12 px-4 container mx-auto">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-10">
                <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800 mb-8">
                    {t('value_title')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${feature.color}`}>
                                <feature.icon size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ValueProps;
