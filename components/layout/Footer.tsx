
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-400 py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Easy Islanders</h3>
            <p className="text-sm leading-relaxed">
              {t('footer_desc')}
            </p>
          </div>
          <div>
             <h4 className="text-white font-semibold mb-4">{t('company')}</h4>
             <ul className="space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">About Us</li>
                <li className="hover:text-white cursor-pointer">Careers</li>
                <li className="hover:text-white cursor-pointer">Press</li>
             </ul>
          </div>
          <div>
             <h4 className="text-white font-semibold mb-4">{t('support')}</h4>
             <ul className="space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">{t('help')}</li>
                <li className="hover:text-white cursor-pointer">Safety</li>
                <li className="hover:text-white cursor-pointer">Cancellation Options</li>
             </ul>
          </div>
          <div>
             <h4 className="text-white font-semibold mb-4">{t('legal')}</h4>
             <ul className="space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Terms of Service</li>
                <li className="hover:text-white cursor-pointer">Privacy Policy</li>
             </ul>
          </div>
        </div>
        <div className="text-center text-xs">
          &copy; {new Date().getFullYear()} Easy Islanders. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
