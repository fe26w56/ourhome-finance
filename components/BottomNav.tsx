import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-light dark:bg-background-dark border-t border-gray-100 dark:border-gray-800 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-end justify-between px-2 h-16 max-w-md mx-auto relative">
        
        <button 
          onClick={() => navigate('/')}
          className={`flex flex-1 flex-col items-center gap-1 pb-2 transition-colors group ${isActive('/') ? 'text-slate-900 dark:text-white' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${isActive('/') ? 'font-variation-settings-filled' : ''}`} style={isActive('/') ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button 
          onClick={() => navigate('/calendar')}
          className={`flex flex-1 flex-col items-center gap-1 pb-2 transition-colors group ${isActive('/calendar') ? 'text-slate-900 dark:text-white' : 'text-gray-400'}`}
        >
          <span className="material-symbols-outlined text-[26px]">calendar_month</span>
          <span className="text-[10px] font-medium">Calendar</span>
        </button>

        <div className="relative -top-6 flex flex-col items-center justify-center w-20">
          <button 
            onClick={() => navigate('/add')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-green-500/30 text-black hover:scale-105 transition-transform border-[4px] border-background-light dark:border-background-dark"
          >
            <span className="material-symbols-outlined text-[32px] font-medium">add</span>
          </button>
        </div>

        <button 
          onClick={() => navigate('/reports')}
          className={`flex flex-1 flex-col items-center gap-1 pb-2 transition-colors group ${isActive('/reports') ? 'text-slate-900 dark:text-white' : 'text-gray-400'}`}
        >
          <span className="material-symbols-outlined text-[26px]">pie_chart</span>
          <span className="text-[10px] font-medium">Reports</span>
        </button>

        <button 
          onClick={() => navigate('/settings')}
          className={`flex flex-1 flex-col items-center gap-1 pb-2 transition-colors group ${isActive('/settings') ? 'text-slate-900 dark:text-white' : 'text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-[26px] ${isActive('/settings') ? 'font-variation-settings-filled' : ''}`} style={isActive('/settings') ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
          <span className="text-[10px] font-medium">Settings</span>
        </button>

      </div>
    </nav>
  );
};

export default BottomNav;