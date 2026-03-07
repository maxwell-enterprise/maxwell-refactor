
import React, { useState, useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { ViewState, UserRole } from './types/index';
import { SeedService } from './services/seedService';
import LandingPage from './components/LandingPage';
import BackgroundWorker from './components/system/BackgroundWorker';
import { resolveView } from './features/dashboard/logic/viewResolver';

const App: React.FC = () => {
  const { user, userRole, isAuthenticated, login } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const [isPersonalZone, setIsPersonalZone] = useState(false);

  useEffect(() => {
    SeedService.init().catch(err => console.error("Seeding failed", err));
  }, []);

  useEffect(() => {
    if (userRole === UserRole.MEMBER) {
      setIsPersonalZone(true);
    }
  }, [userRole]);

  if (!isAuthenticated) {
    return <LandingPage onLogin={login} />;
  }

  return (
    <>
      <BackgroundWorker /> 
      <DashboardLayout 
        currentView={currentView} 
        onNavigate={setCurrentView}
        isPersonalZone={isPersonalZone}
        onToggleZone={setIsPersonalZone}
      >
        {resolveView(currentView, userRole, isPersonalZone, setCurrentView)}
      </DashboardLayout>
    </>
  );
};

export default App;
