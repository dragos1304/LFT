import React, { useState, useEffect, useCallback } from 'react';
import { User, StudySet } from '../types';
import { firebaseService } from '../services/firebaseService';
import { geminiService } from '../services/geminiService';
import { Button, Modal, Spinner, Card } from './Shared';
import { PlusIcon, BookOpenIcon } from './Icons';

// Sub-component for the modal, defined within the same file
const AddNewSourceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStudySetAdded: () => void;
  user: User;
}> = ({ isOpen, onClose, onStudySetAdded, user }) => {
  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((sourceType === 'upload' && !file) || (sourceType === 'youtube' && !youtubeUrl)) {
      setError('Please provide a source.');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const source = sourceType === 'upload' ? file! : youtubeUrl;
      const studySetData = await geminiService.processSourceMaterial(source);
      await firebaseService.addStudySet(user.uid, studySetData);
      onStudySetAdded();
      onClose();
    } catch (err) {
      setError('Failed to create study set. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setFile(null);
      setYoutubeUrl('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Source">
      <form onSubmit={handleSubmit}>
        <div className="flex border border-slate-600 rounded-md p-1 mb-6">
          <button type="button" onClick={() => setSourceType('upload')} className={`w-1/2 p-2 rounded ${sourceType === 'upload' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}>Upload File</button>
          <button type="button" onClick={() => setSourceType('youtube')} className={`w-1/2 p-2 rounded ${sourceType === 'youtube' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}>YouTube URL</button>
        </div>

        {sourceType === 'upload' ? (
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-slate-300 mb-2">PDF, MP3, MP4</label>
            <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.mp3,.mp4" className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-100 hover:file:bg-slate-600" />
          </div>
        ) : (
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-300 mb-2">YouTube Video URL</label>
            <input id="youtube-url" type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}
        
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        
        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : 'Generate Study Set'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};


interface DashboardViewProps {
  user: User;
  onSelectStudySet: (id: string) => void;
  onLogout: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onSelectStudySet, onLogout }) => {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStudySets = useCallback(() => {
    setIsLoading(true);
    firebaseService.getStudySets(user.uid)
      .then(sets => {
        setStudySets(sets);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [user.uid]);

  useEffect(() => {
    fetchStudySets();
  }, [fetchStudySets]);

  const handleStudySetAdded = () => {
    fetchStudySets(); // Refresh the list
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div>
            <span className="text-slate-400 mr-4 hidden sm:inline">Welcome, {user.displayName}</span>
            <Button onClick={onLogout} variant='secondary'>Logout</Button>
        </div>
      </header>

      <div className="mb-8">
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2 inline-block" />
          Add New Source
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-16">
          <Spinner />
        </div>
      ) : studySets.length === 0 ? (
        <div className="text-center py-16 px-6 bg-slate-800 rounded-lg">
          <BookOpenIcon className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-2 text-xl font-medium text-white">No study sets yet</h3>
          <p className="mt-1 text-slate-400">Get started by adding a new source.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studySets.map(set => (
            <Card key={set.id} onClick={() => onSelectStudySet(set.id)}>
              <h2 className="text-xl font-bold text-indigo-400 truncate">{set.title}</h2>
              <p className="text-slate-400 mt-2 text-sm line-clamp-3">{set.summaryText}</p>
              <p className="text-xs text-slate-500 mt-4">Created: {new Date(set.createdAt).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}

      <AddNewSourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onStudySetAdded={handleStudySetAdded} user={user} />
    </div>
  );
};

export default DashboardView;
