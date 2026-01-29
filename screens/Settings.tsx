import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useMembers, useUpdateMember, useRemoveMember } from '../src/hooks/useMembers';
import { useGroups, useLeaveGroup, useUpdateGroup } from '../src/hooks/useGroups';
import { usePermissions } from '../src/hooks/usePermissions';
import { useTransactions } from '../src/hooks/useTransactions';
import { regenerateInviteCode } from '../src/services/groupService';
import { formatAmount, formatDate, getMonthRange } from '../src/lib/utils';
import { TransactionWithDetails } from '../src/services/transactionService';
import { motion, AnimatePresence } from 'framer-motion';

import Header from '../src/components/ui/Header';
import GroupSelector from '../src/components/ui/GroupSelector';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroupId, currentGroup, showToast, clearCurrentGroup, setCurrentGroup } = useAppStore();
  const { user, signOut: authSignOut } = useAuthStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState(false);
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; userId: string; role: string } | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const { data: members = [], isLoading: isLoadingMembers } = useMembers(currentGroupId || '');
  const { data: groups = [] } = useGroups();
  const permissions = usePermissions(currentGroupId || '');
  const updateMemberMutation = useUpdateMember();
  const removeMemberMutation = useRemoveMember();
  const leaveGroupMutation = useLeaveGroup();
  const updateGroupMutation = useUpdateGroup();

  const currentMember = members.find((m) => m.userId === user?.id);
  const canManageMembers = permissions.canManageMembers;
  const canEditSettings = permissions.canManageBudgets; // admin以上

  // グループ設定の更新ハンドラー
  const handleSettingChange = async (key: 'carryOverBalance' | 'budgetCarryOver', value: boolean) => {
    if (!currentGroupId || !currentGroup) return;
    try {
      const updatedGroup = await updateGroupMutation.mutateAsync({
        groupId: currentGroupId,
        updates: { [key]: value },
      });
      // ストアを更新
      setCurrentGroup(currentGroupId, updatedGroup);
      showToast('設定を更新しました', 'success');
    } catch (error) {
      showToast('設定の更新に失敗しました', 'error');
    }
  };

  const handleInviteClick = async () => {
    if (!currentGroupId) return;
    
    // invite_codeがNULLの場合、自動発行を試みる
    if (!currentGroup?.inviteCode) {
      try {
        const newCode = await regenerateInviteCode(currentGroupId);
        // グループ情報を更新
        setCurrentGroup(currentGroupId, { ...currentGroup!, inviteCode: newCode });
      } catch (error) {
        console.error('Failed to generate invite code:', error);
        // エラーが発生してもモーダルは開く（Regenerateボタンで再試行可能）
      }
    }
    
    setIsInviteModalOpen(true);
  };

  const handleRegenerateInviteCode = async () => {
    if (!currentGroupId || !currentGroup) return;
    try {
      const newCode = await regenerateInviteCode(currentGroupId);
      // グループ情報を更新
      setCurrentGroup(currentGroupId, { ...currentGroup, inviteCode: newCode });
      showToast('招待コードを再生成しました', 'success');
    } catch (error) {
      showToast('招待コードの再生成に失敗しました', 'error');
    }
  };

  const handleMemberClick = (member: { id: string; userId: string; role: string }) => {
    if (canManageMembers && member.userId !== user?.id) {
      setSelectedMember(member);
      setIsMemberModalOpen(true);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    if (!currentGroupId) return;
    try {
      await updateMemberMutation.mutateAsync({
        memberId,
        updates: { role: newRole },
        groupId: currentGroupId,
      });
      setIsMemberModalOpen(false);
      setSelectedMember(null);
      showToast('Member role updated', 'success');
    } catch (error) {
      showToast('Failed to update member role', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentGroupId) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeMemberMutation.mutateAsync({ memberId, groupId: currentGroupId });
      setIsMemberModalOpen(false);
      setSelectedMember(null);
      showToast('Member removed', 'success');
    } catch (error) {
      showToast('Failed to remove member', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentGroupId) return;
    try {
      await leaveGroupMutation.mutateAsync(currentGroupId);
      clearCurrentGroup();
      setIsLeaveGroupModalOpen(false);
      showToast('グループから退会しました', 'success');
      // 他のグループがあればそちらに切り替え、なければオンボーディングへ
      if (groups.length > 1) {
        const nextGroup = groups.find(g => g.id !== currentGroupId);
        if (nextGroup) {
          navigate('/');
        }
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'グループからの退会に失敗しました', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      navigate('/auth/login');
    } catch (error) {
      showToast('Failed to sign out', 'error');
    }
  };

  const inviteCode = currentGroup?.inviteCode || '';
  const inviteUrl = inviteCode ? `${window.location.origin}/join/${inviteCode}` : '';
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black pb-28">
      <Header
        variant="main"
        title="Settings"
        homeButtonProps={{
          showDropdown: true,
          onClick: () => setIsGroupSelectorOpen(!isGroupSelectorOpen),
        }}
      />

      <GroupSelector
        isOpen={isGroupSelectorOpen}
        onClose={() => setIsGroupSelectorOpen(false)}
      />

      <main className="flex flex-col w-full max-w-md mx-auto px-4 mt-6">
        <h3 className="px-2 pb-2 text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">The Household</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden mb-6">
          <div className="p-4 flex flex-col items-center justify-center border-b border-gray-50 dark:border-zinc-800/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
            <div className="relative z-10 flex -space-x-3 mb-3">
              {members.slice(0, 3).map((member, index) => (
                <div
                  key={member.id}
                  className="relative inline-block w-14 h-14 rounded-full ring-4 ring-white dark:ring-zinc-900 bg-gray-200 bg-center bg-cover overflow-hidden"
                  style={{
                    backgroundImage: member.user.avatarUrl
                      ? `url('${member.user.avatarUrl}')`
                      : undefined,
                  }}
                >
                  {!member.user.avatarUrl && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold">
                      {member.user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {members.length > 3 && (
                <div className="relative flex items-center justify-center w-14 h-14 rounded-full ring-4 ring-white dark:ring-zinc-900 bg-primary text-slate-900 font-bold text-lg">
                  +{members.length - 3}
                </div>
              )}
            </div>
            <div className="relative z-10 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {currentGroup?.name || 'Our Home'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={handleInviteClick}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-center justify-center shrink-0 size-10 rounded-full bg-primary/20 text-emerald-800 dark:text-emerald-200">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-slate-900 dark:text-white">Invite Member</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Share QR code or link</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 dark:text-zinc-600">qr_code_2</span>
          </button>
        </div>

        {/* Members List */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Members</h3>
          </div>
          {isLoadingMembers ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left ${
                    !canManageMembers || member.userId === user?.id ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full bg-gray-200 bg-center bg-cover overflow-hidden flex items-center justify-center"
                    style={{
                      backgroundImage: member.user.avatarUrl ? `url('${member.user.avatarUrl}')` : undefined,
                    }}
                  >
                    {!member.user.avatarUrl && (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold">
                        {member.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-slate-900 dark:text-white">
                      {member.user.displayName}
                      {member.userId === user?.id && ' (You)'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
                  </div>
                  {canManageMembers && member.userId !== user?.id && (
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {/* グループから退会ボタン */}
          <button
            onClick={() => setIsLeaveGroupModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
          >
            <div className="flex items-center justify-center size-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-red-500">このグループから退会</p>
            </div>
          </button>
        </div>

        <h3 className="px-2 pb-2 text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Configuration</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800 mb-6">
           <MenuItem icon="category" label="Categories" hasArrow onClick={() => navigate('/categories')} />
           <MenuItem icon="flag" label="Goals" hasArrow onClick={() => navigate('/goals')} />
           <ToggleItem
             icon="account_balance_wallet"
             label="Carry-over Balance"
             sub="Roll remaining funds to next month"
             checked={currentGroup?.carryOverBalance ?? true}
             onChange={(checked) => handleSettingChange('carryOverBalance', checked)}
             disabled={!canEditSettings || updateGroupMutation.isPending}
           />
           <ToggleItem
             icon="savings"
             label="Budget Carry-over"
             sub="Allow negative balances"
             checked={currentGroup?.budgetCarryOver ?? false}
             onChange={(checked) => handleSettingChange('budgetCarryOver', checked)}
             disabled={!canEditSettings || updateGroupMutation.isPending}
           />
        </div>

        <h3 className="px-2 pb-2 text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Data</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800 mb-6">
           <MenuItem icon="download" label="Export Transactions" hasArrow onClick={() => setIsExportModalOpen(true)} />
        </div>

        <h3 className="px-2 pb-2 text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Notifications</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800 mb-6">
           <MenuItem icon="notifications_active" label="Input Reminders" hasArrow extra="Daily 8PM" />
           <ToggleItem icon="warning" label="Budget Alerts" checked />
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 text-red-500 font-medium py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mb-4"
        >
          Sign Out
        </button>
      </main>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteCode={inviteCode}
        inviteUrl={inviteUrl}
        onRegenerate={handleRegenerateInviteCode}
      />

      {/* Member Management Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onUpdateRole={handleUpdateRole}
        onRemove={handleRemoveMember}
        isLoading={updateMemberMutation.isPending || removeMemberMutation.isPending}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportStartDate('');
          setExportEndDate('');
        }}
        groupId={currentGroupId || ''}
        members={members}
        startDate={exportStartDate}
        endDate={exportEndDate}
        onStartDateChange={setExportStartDate}
        onEndDateChange={setExportEndDate}
        onSuccess={() => {
          setIsExportModalOpen(false);
          showToast('CSV exported successfully', 'success');
        }}
      />

      {/* Leave Group Confirmation Modal */}
      <LeaveGroupModal
        isOpen={isLeaveGroupModalOpen}
        onClose={() => setIsLeaveGroupModalOpen(false)}
        groupName={currentGroup?.name || ''}
        isOwner={currentMember?.role === 'owner'}
        memberCount={members.length}
        onConfirm={handleLeaveGroup}
        isLoading={leaveGroupMutation.isPending}
      />
    </div>
  );
};

const MenuItem: React.FC<{icon: string, label: string, hasArrow?: boolean, extra?: string, onClick?: () => void}> = ({icon, label, hasArrow, extra, onClick}) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
    <div className="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <span className="flex-1 text-base font-medium text-slate-900 dark:text-white">{label}</span>
    {extra && <span className="text-sm text-gray-400 dark:text-gray-500 font-medium mr-1">{extra}</span>}
    {hasArrow && <span className="material-symbols-outlined text-primary group-hover:translate-x-0.5 transition-transform">chevron_right</span>}
  </button>
);

const ToggleItem: React.FC<{
  icon: string;
  label: string;
  sub?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}> = ({icon, label, sub, checked, onChange, disabled}) => (
  <div className={`flex items-center gap-3 px-4 py-3.5 ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div className="flex-1 pr-2">
      <p className="text-base font-medium text-slate-900 dark:text-white">{label}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary peer-disabled:opacity-50"></div>
    </label>
  </div>
);

const InviteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  inviteUrl: string;
  onRegenerate: () => void;
}> = ({ isOpen, onClose, inviteCode, inviteUrl, onRegenerate }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl || inviteCode);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invite Members</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invite Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-3 rounded-xl bg-primary text-black font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {inviteUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invite Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-slate-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 rounded-xl bg-primary text-black font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={onRegenerate}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
              >
                Regenerate Code
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: { id: string; userId: string; role: string } | null;
  onUpdateRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => void;
  onRemove: (memberId: string) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, member, onUpdateRole, onRemove, isLoading }) => {
  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Member Settings</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <div className="flex flex-col gap-2">
                  {(['admin', 'member', 'viewer'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => onUpdateRole(member.id, role)}
                      disabled={isLoading}
                      className={`px-4 py-3 rounded-xl font-medium text-left ${
                        member.role === role
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      } disabled:opacity-50`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onRemove(member.id)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium disabled:opacity-50"
              >
                Remove Member
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const LeaveGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  isOwner: boolean;
  memberCount: number;
  onConfirm: () => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, groupName, isOwner, memberCount, onConfirm, isLoading }) => {
  const canLeave = !isOwner || memberCount <= 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-20 left-0 right-0 bg-white dark:bg-surface-dark rounded-3xl z-50 mx-4 overflow-hidden flex flex-col shadow-xl"
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* ヘッダー */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">グループから退会</h3>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500 text-[24px]">close</span>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-[32px]">warning</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  「{groupName}」から退会しますか？
                </h3>
                {canLeave ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isOwner && memberCount <= 1
                      ? 'あなたが最後のメンバーのため、グループも削除されます。'
                      : 'このグループのデータにアクセスできなくなります。'}
                  </p>
                ) : (
                  <p className="text-sm text-red-500">
                    オーナーは他のメンバーがいる間は退会できません。
                    <br />
                    先にオーナー権限を他のメンバーに移譲してください。
                  </p>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={onConfirm}
                disabled={!canLeave || isLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
              >
                {isLoading ? '処理中...' : '退会する'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Array<{ userId: string; user: { displayName: string } }>;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, groupId, members, startDate, endDate, onStartDateChange, onEndDateChange, onSuccess }) => {
  const { selectedMonth } = useAppStore();
  const { data: transactions = [], isLoading } = useTransactions(groupId);

  // デフォルト日付設定（今月）
  React.useEffect(() => {
    if (!startDate && !endDate && selectedMonth) {
      const { start, end } = getMonthRange(selectedMonth);
      onStartDateChange(start);
      onEndDateChange(end);
    }
  }, [selectedMonth, startDate, endDate, onStartDateChange, onEndDateChange]);

  const handleExport = () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    // 期間内の取引をフィルタ
    const filteredTransactions = transactions.filter(
      (tx) => tx.date >= startDate && tx.date <= endDate
    );

    // CSV生成
    const csvRows: string[] = [];
    
    // ヘッダー
    csvRows.push('日付,種別,カテゴリ,金額,メモ,支払者,共有,負担内訳');

    // データ行
    filteredTransactions.forEach((tx) => {
      const paidByMember = members.find((m) => m.userId === tx.paidBy);
      const paidByName = paidByMember?.user.displayName || 'Unknown';
      
      // 負担内訳を生成
      let splitsText = '';
      if (tx.splits && tx.splits.length > 0) {
        const splitParts = tx.splits.map((split) => {
          const splitMember = members.find((m) => m.userId === split.userId);
          const splitName = splitMember?.user.displayName || 'Unknown';
          return `${splitName}:${split.amount}`;
        });
        splitsText = `"${splitParts.join(',')}"`;
      }

      // CSVエスケープ（メモ内のカンマやダブルクォートを処理）
      const escapeCsv = (value: string | null | undefined): string => {
        if (!value) return '';
        // ダブルクォートをエスケープ
        const escaped = value.replace(/"/g, '""');
        // カンマや改行が含まれる場合はダブルクォートで囲む
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
          return `"${escaped}"`;
        }
        return escaped;
      };

      const row = [
        tx.date,
        tx.type,
        escapeCsv(tx.category.name),
        tx.amount.toString(),
        escapeCsv(tx.memo),
        escapeCsv(paidByName),
        tx.isShared ? 'true' : 'false',
        splitsText,
      ].join(',');

      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM付きUTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${startDate}_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export Transactions</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  required
                />
              </div>

              {isLoading ? (
                <div className="text-center py-4 text-gray-400">Loading transactions...</div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate).length} transactions
                  will be exported
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={!startDate || !endDate || isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-medium disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Settings;