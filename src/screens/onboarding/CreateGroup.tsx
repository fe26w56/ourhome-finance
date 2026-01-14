import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '../../components/ui/OnboardingHeader';
import Button from '../../components/ui/Button';
import { GroupType } from '../../types/domain';
import { useCreateGroup } from '../../hooks/useGroups';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';

const CreateGroup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');
  const { mutateAsync: createGroup, isPending } = useCreateGroup();
  const { setCurrentGroup, showToast } = useAppStore();
  const { user } = useAuthStore();
  
  const [activeType, setActiveType] = useState<GroupType>(GroupType.NEW);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('JPY');

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const handleCreateGroup = async (e?: React.MouseEvent) => {
    // イベントバブリングを防ぐ
    if (e) {
      e.stopPropagation();
    }

    if (!groupName.trim()) {
      showToast('グループ名を入力してください', 'error');
      return;
    }

    if (!user?.id) {
      showToast('ログインが必要です', 'error');
      navigate('/auth/login');
      return;
    }

    try {
      const result = await createGroup({
        name: groupName,
        currency: currency as string,
        monthStartDay: 1,
      });

      // グループを作成したら、それを現在のグループとして設定
      setCurrentGroup(result.group.id, result.group);
      showToast('グループを作成しました', 'success');
      
      // プロフィール設定画面へ
      navigate('/onboarding/profile-setup');
    } catch (error: any) {
      console.error('Failed to create group:', error);
      showToast('グループの作成に失敗しました', 'error');
    }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="flex flex-col min-h-screen bg-surface"
    >
      <Header 
        step={2} 
        totalSteps={4}
        title={
          <span dangerouslySetInnerHTML={{ __html: t('groupSetup.title') }} />
        }
        subtitle={t('groupSetup.subtitle')}
      />

      <div className="flex-1 px-6 py-6 flex flex-col gap-5 overflow-y-auto no-scrollbar">
        
        {/* Card 1: Create New Group */}
        <motion.div 
          layout
          onClick={() => setActiveType(GroupType.NEW)}
          className={`relative overflow-hidden rounded-3xl border-2 transition-colors duration-300 ${
            activeType === GroupType.NEW 
              ? 'bg-white border-primary shadow-card' 
              : 'bg-white border-transparent shadow-sm opacity-80'
          }`}
        >
          {activeType === GroupType.NEW && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 0.1 }}
              className="absolute -top-4 -right-4 text-primary pointer-events-none"
            >
              <span className="material-symbols-outlined text-[150px]">cottage</span>
            </motion.div>
          )}

          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  activeType === GroupType.NEW ? 'bg-primary text-dark' : 'bg-gray-100 text-muted'
                }`}>
                  <span className="material-symbols-outlined text-2xl">add</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dark">{t('groupSetup.createNew.title')}</h3>
                  <p className="text-sm text-muted">{t('groupSetup.createNew.subtitle')}</p>
                </div>
              </div>
              {activeType === GroupType.NEW && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                </div>
              )}
            </div>

            <motion.div 
              initial={false}
              animate={{ height: activeType === GroupType.NEW ? 'auto' : 0, opacity: activeType === GroupType.NEW ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">
                    {t('groupSetup.createNew.groupName')}
                  </label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder={t('groupSetup.createNew.groupNamePlaceholder')}
                    className="w-full h-14 bg-surface rounded-xl px-4 font-semibold text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">
                    {t('groupSetup.createNew.currency')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['JPY', 'USD', 'EUR', 'GBP'].map((curr) => (
                      <button
                        key={curr}
                        onClick={(e) => { e.stopPropagation(); setCurrency(curr); }}
                        className={`h-12 rounded-xl font-bold text-sm transition-all ${
                          currency === curr 
                            ? 'bg-primary text-dark shadow-glow' 
                            : 'bg-surface text-muted hover:bg-gray-100'
                        }`}
                      >
                        {t(`groupSetup.createNew.${curr.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                   <Button 
                     variant="primary" 
                     onClick={(e) => handleCreateGroup(e as React.MouseEvent)}
                     icon="arrow_forward"
                     disabled={isPending || !groupName.trim() || !user}
                   >
                     {isPending ? '作成中...' : t('groupSetup.createNew.continue')}
                   </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Separator */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs font-bold text-gray-300 uppercase">{t('groupSetup.or')}</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        {/* Card 2: Join Existing */}
        <motion.div 
          layout
          onClick={() => navigate('/onboarding/join-group')}
          className={`relative overflow-hidden rounded-3xl border transition-colors duration-300 cursor-pointer ${
             activeType === GroupType.EXISTING
              ? 'bg-white border-primary shadow-card' 
              : 'bg-white border-transparent shadow-sm'
          }`}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-muted">
                <span className="material-symbols-outlined text-2xl">link</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-dark">{t('groupSetup.joinExisting.title')}</h3>
                <p className="text-sm text-muted">{t('groupSetup.joinExisting.subtitle')}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-300">expand_more</span>
          </div>
          
           {/* Hint at actions for unselected state visual fidelity to original design */}
           {activeType !== GroupType.EXISTING && (
              <div className="px-6 pb-6 pl-[88px] flex gap-2">
                 <div className="px-3 py-1.5 rounded-lg bg-surface border border-gray-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-gray-400">qr_code_scanner</span>
                    <span className="text-xs font-medium text-gray-500">{t('groupSetup.joinExisting.scanQR')}</span>
                 </div>
                 <div className="px-3 py-1.5 rounded-lg bg-surface border border-gray-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-gray-400">pin</span>
                    <span className="text-xs font-medium text-gray-500">{t('groupSetup.joinExisting.enterCode')}</span>
                 </div>
              </div>
           )}
        </motion.div>

      </div>
    </motion.div>
  );
};

export default CreateGroup;
