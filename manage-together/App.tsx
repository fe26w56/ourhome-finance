import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import WelcomeScreen from './screens/WelcomeScreen';
import GroupSetupScreen from './screens/GroupSetupScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import TemplateSelectionScreen from './screens/TemplateSelectionScreen';
import LoginScreen from './screens/LoginScreen';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/group-setup" element={<GroupSetupScreen />} />
        <Route path="/profile-setup" element={<ProfileSetupScreen />} />
        <Route path="/template-selection" element={<TemplateSelectionScreen />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="mx-auto max-w-[480px] w-full min-h-screen bg-white relative shadow-2xl overflow-hidden flex flex-col">
        <AnimatedRoutes />
      </div>
    </HashRouter>
  );
};

export default App;