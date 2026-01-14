import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../components/ui/OnboardingHeader';
import Button from '../../components/ui/Button';
import { ProfileView } from '../../types/domain';

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ProfileView>(ProfileView.SHARED);
  const [name, setName] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-screen bg-white"
    >
      <Header 
        step={3} 
        totalSteps={4}
        title="プロフィール設定"
        subtitle="グループ内での表示名を設定してください"
      />

      <div className="flex-1 px-6 py-4 flex flex-col items-center overflow-y-auto no-scrollbar">
        
        {/* Photo Upload */}
        <div className="mt-6 mb-10 relative group cursor-pointer">
          <div className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-primary/5 hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-primary">add_a_photo</span>
          </div>
          <div className="absolute bottom-1 right-1 w-10 h-10 bg-dark rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <span className="material-symbols-outlined text-white text-sm">edit</span>
          </div>
        </div>

        <div className="w-full space-y-8">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-dark ml-1">表示名</label>
            <div className="relative">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full h-14 pl-4 pr-12 rounded-xl border border-gray-200 text-lg font-medium text-dark placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="space-y-3">
             <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-dark">Default View</label>
                <span className="material-symbols-outlined text-gray-400 text-sm">info</span>
             </div>
             
             <div className="bg-surface p-1.5 rounded-2xl flex relative">
                <button 
                  onClick={() => setView(ProfileView.SHARED)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    view === ProfileView.SHARED 
                      ? 'bg-white text-dark shadow-sm border border-gray-100' 
                      : 'text-muted hover:text-dark'
                  }`}
                >
                  <span className={`material-symbols-outlined ${view === ProfileView.SHARED ? 'text-primary' : ''}`}>group</span>
                  Shared
                </button>
                <button 
                  onClick={() => setView(ProfileView.PERSONAL)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    view === ProfileView.PERSONAL 
                      ? 'bg-white text-dark shadow-sm border border-gray-100' 
                      : 'text-muted hover:text-dark'
                  }`}
                >
                  <span className={`material-symbols-outlined ${view === ProfileView.PERSONAL ? 'text-primary' : ''}`}>person</span>
                  Personal
                </button>
             </div>
             
             <p className="text-xs text-muted leading-relaxed px-1">
                Choosing <strong>Shared</strong> means you'll see the household budget first. You can always switch tabs later.
             </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-50 space-y-3">
        <Button onClick={() => navigate('/onboarding/template-selection')}>次へ</Button>
        <button 
          onClick={() => navigate('/')}
          className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          スキップしてホームへ
        </button>
      </div>
    </motion.div>
  );
};

export default ProfileSetup;
