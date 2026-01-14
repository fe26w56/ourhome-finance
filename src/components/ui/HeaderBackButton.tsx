import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderBackButtonProps {
  onClick?: () => void;
}

const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({ onClick }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors"
      aria-label="戻る"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
};

export default HeaderBackButton;
