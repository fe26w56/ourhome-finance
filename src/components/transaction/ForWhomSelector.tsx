import React from 'react';
import { GroupMemberWithUser } from '../../services/memberService';

interface ForWhomSelectorProps {
  members: GroupMemberWithUser[];
  selectedUserIds: string[];
  currentUserId: string;
  onToggle: (userId: string) => void;
  onSelectAll: () => void;
}

const ForWhomSelector: React.FC<ForWhomSelectorProps> = ({
  members,
  selectedUserIds,
  currentUserId,
  onToggle,
  onSelectAll,
}) => {
  const allSelected = members.length > 0 && members.every((m) => selectedUserIds.includes(m.userId));
  const allLabel = members.length === 2 ? 'Both' : 'All';

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1">
        For Whom
      </label>
      <div className="flex gap-2 flex-wrap">
        {/* All/Both ボタン */}
        <button
          onClick={onSelectAll}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all ${
            allSelected
              ? 'bg-primary text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-lg">group</span>
          {allLabel}
        </button>

        {/* 各メンバーボタン */}
        {members.map((member) => {
          const isSelected = selectedUserIds.includes(member.userId);
          const isCurrentUser = member.userId === currentUserId;
          const displayName = member.user.displayName || 'Unknown';

          // All が選択されている場合は個別ボタンは非選択表示
          const showAsSelected = isSelected && !allSelected;

          return (
            <button
              key={member.userId}
              onClick={() => onToggle(member.userId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all ${
                showAsSelected
                  ? 'bg-primary text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isCurrentUser ? 'person' : 'favorite'}
              </span>
              {isCurrentUser ? 'Me' : displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ForWhomSelector;
