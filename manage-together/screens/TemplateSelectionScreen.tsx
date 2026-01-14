import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Button from '../components/Button';

const TemplateSelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState('couple');
  const [setBudget, setSetBudget] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-screen bg-surface"
    >
      <div className="bg-white pb-4 shadow-sm z-10">
        <Header 
            step={4} 
            totalSteps={4}
            title={
                <span>How do you <br/> <span className="relative">manage money?<span className="absolute bottom-1 left-0 w-full h-3 bg-primary/20 -z-10 -rotate-1"></span></span></span>
            }
            subtitle="Select a template structure to set up your shared categories instantly."
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 pb-32 space-y-4">
        
        {/* Template: Couple */}
        <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTemplate('couple')}
            className={`relative p-5 rounded-3xl border-2 transition-all duration-200 cursor-pointer ${
                selectedTemplate === 'couple' 
                ? 'bg-white border-primary shadow-card ring-1 ring-primary/20' 
                : 'bg-white border-transparent shadow-sm opacity-80'
            }`}
        >
            {selectedTemplate === 'couple' && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full border-2 border-surface flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-dark text-sm font-bold">check</span>
                </div>
            )}
            
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-dark text-2xl filled">favorite</span>
                </div>
                <div>
                    <h3 className="font-bold text-dark text-lg">Couple</h3>
                    <p className="text-sm text-muted">Partners sharing life</p>
                </div>
            </div>
            
            <div className="h-px bg-gray-100 mb-4" />
            
            <div className="flex flex-wrap gap-2">
                {['Date Night', 'Groceries', 'Rent', 'Savings'].map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-surface border border-gray-100 text-xs font-semibold text-muted flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                            {tag === 'Date Night' ? 'local_dining' : tag === 'Groceries' ? 'shopping_cart' : tag === 'Rent' ? 'home' : 'savings'}
                        </span>
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>

        {/* Template: Room Share */}
        <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTemplate('roomshare')}
            className={`relative p-5 rounded-3xl border-2 transition-all duration-200 cursor-pointer ${
                selectedTemplate === 'roomshare' 
                ? 'bg-white border-primary shadow-card ring-1 ring-primary/20' 
                : 'bg-white border-transparent shadow-sm opacity-80'
            }`}
        >
             {selectedTemplate === 'roomshare' && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full border-2 border-surface flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-dark text-sm font-bold">check</span>
                </div>
            )}
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-muted text-2xl">cottage</span>
                </div>
                <div>
                    <h3 className="font-bold text-dark text-lg">Room Share</h3>
                    <p className="text-sm text-muted">Housemates splitting bills</p>
                </div>
            </div>
            
            <div className="h-px bg-gray-100 mb-4" />
            
            <div className="flex flex-wrap gap-2 opacity-70">
                {['Rent', 'Internet', 'Supplies'].map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-surface border border-gray-100 text-xs font-semibold text-muted flex items-center gap-1">
                         <span className="material-symbols-outlined text-[14px]">
                            {tag === 'Rent' ? 'home' : tag === 'Internet' ? 'wifi' : 'cleaning_services'}
                        </span>
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>

        <div className="text-center pt-2">
            <button className="text-sm font-semibold text-muted underline decoration-dotted decoration-2 underline-offset-4 hover:text-dark transition-colors">
                Or build from scratch
            </button>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-6 z-20">
        <div className="flex items-center justify-between mb-6">
            <div>
                <p className="font-bold text-dark">Set monthly budget</p>
                <p className="text-xs text-muted">Configure limits for each category now</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={setBudget} onChange={() => setSetBudget(!setBudget)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
        <Button onClick={() => alert("Welcome to the App!")} icon="arrow_forward">Start App</Button>
      </div>
    </motion.div>
  );
};

export default TemplateSelectionScreen;