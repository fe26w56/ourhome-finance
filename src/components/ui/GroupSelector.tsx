import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGroups } from '../../hooks/useGroups';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface GroupSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentGroupId, setCurrentGroup } = useAppStore();
  const { data: groups, isLoading } = useGroups();

  // Escapeキーでクローズ
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleGroupSelect = (groupId: string, groupData: any) => {
    setCurrentGroup(groupId, groupData);
    onClose();
  };

  const handleCreateGroup = () => {
    navigate('/onboarding/group-setup');
    onClose();
  };

  const handleJoinGroup = () => {
    navigate('/onboarding/join-group');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark rounded-t-3xl z-50 max-h-[70vh] overflow-hidden flex flex-col"
            role="menu"
            aria-label="グループ選択"
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* ヘッダー */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">グループを選択</h3>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500 text-[24px]">close</span>
              </button>
            </div>

            {/* グループ一覧 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 mt-2">読み込み中...</p>
                </div>
              ) : groups && groups.length > 0 ? (
                <div className="py-2">
                  {groups.map((group) => {
                    const isSelected = group.id === currentGroupId;
                    return (
                      <button
                        key={group.id}
                        onClick={() => handleGroupSelect(group.id, group)}
                        className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        role="menuitem"
                      >
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold ring-2 ${
                            isSelected ? 'ring-primary' : 'ring-white dark:ring-surface-dark'
                          }`}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-gray-900 dark:text-white">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.currency}</p>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-primary text-[24px]">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">
                    group
                  </span>
                  <p className="text-sm text-gray-500">グループがありません</p>
                </div>
              )}
            </div>

            {/* アクション */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <button
                onClick={handleCreateGroup}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-[24px]">add_circle</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  新しいグループを作成
                </span>
              </button>
              <button
                onClick={handleJoinGroup}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-[24px]">group_add</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  グループに参加
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GroupSelector;
