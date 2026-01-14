import React from 'react';
import { GroupMemberWithUser } from '../../services/memberService';

interface WhoPaidSelectorProps {
  members: GroupMemberWithUser[];
  selectedUserId: string | null;
  currentUserId: string;
  onSelect: (userId: string) => void;
}

const WhoPaidSelector: React.FC<WhoPaidSelectorProps> = ({
  members,
  selectedUserId,
  currentUserId,
  onSelect,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1">
        Who Paid
      </label>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {members.map((member) => {
          const isSelected = selectedUserId === member.userId;
          const isCurrentUser = member.userId === currentUserId;
          const displayName = member.user.displayName || 'Unknown';
          const initial = displayName.charAt(0).toUpperCase();

          return (
            <button
              key={member.userId}
              onClick={() => onSelect(member.userId)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all min-w-[140px] ${
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isCurrentUser
                    ? 'bg-primary text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {isCurrentUser ? 'ME' : initial}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-semibold text-gray-900 dark:text-white truncate">
                  {isCurrentUser ? 'Me' : displayName}
                </span>
                {isSelected && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    PAYER
                  </span>
                )}
              </div>
              {isSelected && (
                <span className="material-symbols-outlined text-primary ml-auto flex-shrink-0">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WhoPaidSelector;
