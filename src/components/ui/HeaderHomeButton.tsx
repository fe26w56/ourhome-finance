import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

export interface HeaderHomeButtonProps {
  groupName?: string;
  showDropdown?: boolean;
  onClick?: () => void;
}

const HeaderHomeButton: React.FC<HeaderHomeButtonProps> = ({ 
  groupName, 
  onClick 
}) => {
  const { currentGroup } = useAppStore();
  const displayName = groupName || currentGroup?.name || 'Our Home';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Open group selector: ${displayName}`}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-background-dark">
        {initial}
      </div>
    </button>
  );
};

export default HeaderHomeButton;
