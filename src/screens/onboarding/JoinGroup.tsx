import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '../../components/ui/OnboardingHeader';
import Button from '../../components/ui/Button';
import { useJoinGroup } from '../../hooks/useGroups';
import { useAppStore } from '../../stores/useAppStore';

const JoinGroup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');
  const { mutateAsync: joinGroup, isPending } = useJoinGroup();
  const { setCurrentGroup, showToast } = useAppStore();
  
  const [inviteCode, setInviteCode] = useState('');
  const [isScanningQR, setIsScanningQR] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      showToast('招待コードを入力してください', 'error');
      return;
    }

    try {
      const result = await joinGroup(inviteCode.trim());
      setCurrentGroup(result.group.id, result.group);
      showToast('グループに参加しました', 'success');
      navigate('/');
    } catch (error) {
      console.error('Failed to join group:', error);
      showToast(t('joinGroup.invalidCode'), 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col min-h-screen bg-white"
    >
      <Header 
        step={2} 
        totalSteps={4}
        title={t('joinGroup.title')}
        subtitle={t('joinGroup.subtitle')}
        showBack={true}
      />

      <div className="flex-1 px-6 py-6 flex flex-col gap-6">
        
        {/* QR Code Scanner Option */}
        <div className="flex flex-col items-center gap-4 py-8">
          <button
            onClick={() => setIsScanningQR(!isScanningQR)}
            className="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-primary/5 hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">qr_code_scanner</span>
            <span className="text-xs font-semibold text-muted">{t('joinGroup.scanQR')}</span>
          </button>
          
          {isScanningQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="w-full p-4 bg-surface rounded-xl text-center"
            >
              <p className="text-sm text-muted">QRコードスキャン機能は実装予定です</p>
            </motion.div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs font-bold text-gray-300 uppercase">{t('groupSetup.or')}</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        {/* Invite Code Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-dark ml-1">{t('joinGroup.inviteCode')}</label>
          <div className="relative">
            <input 
              type="text" 
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t('joinGroup.inviteCodePlaceholder')}
              className="w-full h-14 pl-4 pr-12 rounded-xl border border-gray-200 text-lg font-medium text-dark placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">pin</span>
          </div>
        </div>

        <div className="mt-auto pb-6">
          <Button 
            onClick={handleJoin} 
            icon="arrow_forward"
            disabled={!inviteCode.trim() || isPending}
          >
            {isPending ? '参加中...' : t('joinGroup.join')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default JoinGroup;
