import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderHomeButton, { HeaderHomeButtonProps } from './HeaderHomeButton';
import HeaderBackButton from './HeaderBackButton';

interface HeaderProps {
  variant: 'main' | 'sub' | 'modal';
  title?: React.ReactNode;
  leftElement?: 'home' | 'back' | 'close' | 'none' | React.ReactNode;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  className?: string;
  children?: React.ReactNode;
  homeButtonProps?: HeaderHomeButtonProps;
}

const Header: React.FC<HeaderProps> = ({
  variant,
  title,
  leftElement = variant === 'main' ? 'home' : 'back',
  rightElement,
  onBack,
  className = '',
  children,
  homeButtonProps,
}) => {
  const navigate = useNavigate();
  
  const baseStyles = 'sticky top-0 backdrop-blur-md flex items-center justify-between transition-all duration-200';
  const variantStyles = {
    main: 'z-40 bg-background-light/95 dark:bg-background-dark/95 pt-12 pb-3 px-4',
    sub: 'z-40 bg-background-light/90 dark:bg-background-dark/90 py-4 px-6',
    modal: 'z-50 bg-background-light/90 dark:bg-background-dark/90 pt-4 pb-2 px-6',
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const renderLeftElement = () => {
    if (leftElement === 'home') return <HeaderHomeButton {...homeButtonProps} />;
    if (leftElement === 'back') return <HeaderBackButton onClick={handleBack} />;
    if (leftElement === 'close') {
       return (
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">close</span>
        </button>
       );
    }
    if (leftElement === 'none') return <div className="w-10" />;
    return leftElement;
  };

  return (
    <header className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {renderLeftElement()}
      {title && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
          {typeof title === 'string' ? (
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          ) : (
            <div className="pointer-events-auto">{title}</div>
          )}
        </div>
      )}
      {rightElement || <div className="w-10" />}
      {children}
    </header>
  );
};

export default Header;
