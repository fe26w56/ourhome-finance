import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  fullWidth?: boolean;
  icon?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  fullWidth = true, 
  icon, 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyles = "h-14 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-primary text-dark shadow-[0_8px_16px_-6px_rgba(117,245,145,0.5)] hover:bg-[#6af088]",
    secondary: "bg-dark text-white shadow-lg",
    outline: "bg-transparent border border-gray-200 text-dark hover:bg-gray-50",
    ghost: "bg-transparent text-muted hover:text-dark hover:bg-gray-50",
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
      {icon && <span className="material-symbols-outlined text-[20px] font-bold">{icon}</span>}
    </motion.button>
  );
};

export default Button;