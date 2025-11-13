import React, { useState, useEffect } from 'react';
import { firebaseService } from './services/firebaseService';
import { User, View } from './types';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import StudySetView from './components/StudySetView';
import { Spinner } from './components/Shared';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<View>(View.Auth);
  const [selectedStudySetId, setSelectedStudySetId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setCurrentView(View.Dashboard);
      } else {
        setCurrentView(View.Auth);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setLoading(true);
    firebaseService.signInWithGoogle().then(firebaseUser => {
      setUser(firebaseUser);
      setCurrentView(View.Dashboard);
      setLoading(false);
    });
  };

  const handleLogout = () => {
    firebaseService.signOut().then(() => {
      setUser(null);
      setCurrentView(View.Auth);
      setSelectedStudySetId(null);
    });
  };
  
  const handleSelectStudySet = (id: string) => {
    setSelectedStudySetId(id);
    setCurrentView(View.StudySet);
  };

  const handleBackToDashboard = () => {
    setSelectedStudySetId(null);
    setCurrentView(View.Dashboard);
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      );
    }

    switch (currentView) {
      case View.Auth:
        return <AuthView onLogin={handleLogin} />;
      case View.Dashboard:
        if (user) {
          return <DashboardView user={user} onSelectStudySet={handleSelectStudySet} onLogout={handleLogout} />;
        }
        return <AuthView onLogin={handleLogin} />; // Should not happen if logic is correct, but as a fallback
      case View.StudySet:
        if (user && selectedStudySetId) {
          return <StudySetView user={user} studySetId={selectedStudySetId} onBack={handleBackToDashboard} />;
        }
        return <DashboardView user={user!} onSelectStudySet={handleSelectStudySet} onLogout={handleLogout} />; // Fallback to dashboard
      default:
        return <AuthView onLogin={handleLogin} />;
    }
  };

  return <div className="min-h-screen bg-slate-900">{renderContent()}</div>;
};

export default App;
