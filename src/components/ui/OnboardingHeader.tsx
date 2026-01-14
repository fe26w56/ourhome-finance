import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  step: number;
  totalSteps: number;
  title?: React.ReactNode;
  subtitle?: string;
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ step, totalSteps, title, subtitle, showBack = true }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 px-6 pt-8 pb-2 bg-white sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {showBack ? (
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-dark">arrow_back</span>
          </button>
        ) : <div className="w-10" />}
        
        <span className="text-sm font-semibold text-muted tracking-wide">
          Step {step} of {totalSteps}
        </span>
      </div>

      <div className="flex gap-2 w-full">
        {[...Array(totalSteps)].map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 <= step ? 'bg-primary flex-1' : 'bg-gray-100 flex-1'
            }`}
          />
        ))}
      </div>

      {(title || subtitle) && (
        <div className="space-y-2 mt-2">
          {title && <h1 className="text-3xl font-display font-bold leading-tight text-dark">{title}</h1>}
          {subtitle && <p className="text-muted leading-relaxed">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

export default Header;
