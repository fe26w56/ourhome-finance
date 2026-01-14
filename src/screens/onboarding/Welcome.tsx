import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');
  const { signInWithOAuth } = useAuth();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col px-6 py-8 justify-between bg-white relative"
    >
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 3 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-glow rotate-3"
        >
          <span className="material-symbols-outlined text-4xl text-dark">account_balance_wallet</span>
        </motion.div>

        <h1 className="font-display text-4xl font-bold text-dark mb-4 tracking-tight">
          {t('welcome.title')}
        </h1>
        <p className="text-muted text-lg max-w-[280px] leading-relaxed">
          {t('welcome.subtitle')}
        </p>
      </div>

      <div className="w-full space-y-4 mb-4">
        <Button onClick={() => navigate('/auth/signup')} icon="arrow_forward">
          {t('welcome.createAccount')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/auth/login')}>
          {t('welcome.logIn')}
        </Button>
        
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-muted font-medium tracking-wider">
              {t('welcome.continueWith')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => signInWithOAuth('google')}
            className="h-12 flex items-center justify-center bg-surface hover:bg-gray-100 rounded-xl transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
            <span className="ml-2 font-bold text-sm text-dark">{t('welcome.google')}</span>
          </button>
          <button 
            onClick={() => signInWithOAuth('apple')}
            className="h-12 flex items-center justify-center bg-surface hover:bg-gray-100 rounded-xl transition-colors"
          >
            <img src="https://www.svgrepo.com/show/511330/apple-173.svg" alt="Apple" className="w-6 h-6" />
            <span className="ml-2 font-bold text-sm text-dark">{t('welcome.apple')}</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('welcome.terms')}<a href="#" className="underline">{t('welcome.termsLink')}</a>{t('welcome.and')}<a href="#" className="underline">{t('welcome.privacyLink')}</a>{t('welcome.agree')}
        </p>
      </div>
    </motion.div>
  );
};

export default Welcome;
