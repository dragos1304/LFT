import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { View } from './types';
import DashboardView from './components/DashboardView';
import StudySetView from './components/StudySetView';
import { Spinner } from './components/Shared';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [selectedStudySetId, setSelectedStudySetId] = useState<string | null>(null);

  const handleSelectStudySet = (id: string) => {
    setSelectedStudySetId(id);
    setCurrentView(View.StudySet);
  };

  const handleBackToDashboard = () => {
    setSelectedStudySetId(null);
    setCurrentView(View.Dashboard);
  };
  
  if (loading || !user) { // Keep loading check until default user is set
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {currentView === View.Dashboard && <DashboardView onSelectStudySet={handleSelectStudySet} />}
      {currentView === View.StudySet && selectedStudySetId && (
        <StudySetView studySetId={selectedStudySetId} onBack={handleBackToDashboard} />
      )}
    </div>
  );
};

export default App;