import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col min-h-screen bg-white relative overflow-hidden"
    >
        {/* Background Decor */}
        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-6 w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors z-30 bg-white/50 backdrop-blur-sm"
        >
          <span className="material-symbols-outlined text-dark">arrow_back</span>
        </button>

        <div className="flex-1 flex flex-col justify-center px-6 py-8 w-full z-10">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-[0_8px_16px_-6px_rgba(115,245,144,0.4)] transform rotate-3 transition-transform hover:rotate-0 duration-300">
                    <span className="material-symbols-outlined text-[#111812] text-[32px]">
                        account_balance_wallet
                    </span>
                </div>
                <h1 className="text-[#111812] tracking-tight text-[32px] md:text-[36px] font-bold leading-[1.1] text-center font-display">
                    Welcome back
                </h1>
            </div>

            <form className="w-full space-y-6 mb-8" onSubmit={(e) => { e.preventDefault(); navigate('/template-selection'); }}>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-[#111812]" htmlFor="email">
                            Email Address
                        </label>
                        <input 
                            className="w-full h-14 rounded-xl border border-gray-200 bg-white text-[#111812] text-base px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none placeholder:text-gray-400" 
                            id="email" 
                            placeholder="name@example.com" 
                            type="email" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-[#111812]" htmlFor="password">
                            Password
                        </label>
                        <input 
                            className="w-full h-14 rounded-xl border border-gray-200 bg-white text-[#111812] text-base px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none placeholder:text-gray-400" 
                            id="password" 
                            placeholder="Enter your password" 
                            type="password" 
                        />
                    </div>
                    <div className="flex justify-end pt-1">
                        <a className="text-sm font-medium text-gray-500 hover:text-[#111812] transition-colors" href="#">
                            Forgot password?
                        </a>
                    </div>
                </div>
                
                <button className="relative w-full group overflow-hidden rounded-xl h-14 bg-primary text-[#111812] text-base font-bold leading-normal tracking-[0.015em] shadow-sm hover:shadow-md transition-all active:scale-[0.98]" type="submit">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        Log In
                    </span>
                </button>
            </form>

            <div className="relative flex py-2 items-center mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-medium text-gray-400 uppercase tracking-wider">or continue with</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <button className="flex items-center justify-center h-12 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent group" type="button">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" fill="#FBBC05"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                    </svg>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">Google</span>
                </button>
                <button className="flex items-center justify-center h-12 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent group" type="button">
                    <svg className="h-5 w-5 mr-2 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.02 3.65-.95.66.03 2.53.31 3.53 1.69-3.1 1.61-2.58 5.86.34 7.15-.65 1.73-1.6 3.42-2.6 4.34zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"></path>
                    </svg>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">Apple</span>
                </button>
            </div>

            <div className="mt-auto text-center">
                <p className="text-xs text-gray-400">
                    By logging in you agree to our <a href="#" className="underline decoration-dotted hover:text-gray-600">Terms of Service</a> and <a href="#" className="underline decoration-dotted hover:text-gray-600">Privacy Policy</a>.
                </p>
            </div>
        </div>
    </motion.div>
  );
};

export default LoginScreen;