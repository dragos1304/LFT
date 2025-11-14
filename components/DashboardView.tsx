import React, { useState, useEffect, useCallback } from 'react';
import { StudySet } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { Button, Modal, Spinner, Card } from './Shared';
import { PlusIcon, BookOpenIcon } from './Icons';

// Modal for adding a new source, now part of the Dashboard component
const AddNewSourceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStudySetAdded: () => void;
}> = ({ isOpen, onClose, onStudySetAdded }) => {
  const { user } = useAuth();
  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to add a source.");
      return;
    }
    if ((sourceType === 'upload' && !file) || (sourceType === 'youtube' && !youtubeUrl)) {
      setError('Please provide a source.');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const source = sourceType === 'upload' ? file! : youtubeUrl;
      const studySetData = await geminiService.processSourceMaterial(source);
      await firestoreService.addStudySet(user.uid, studySetData);
      onStudySetAdded();
      handleClose();
    } catch (err) {
      setError('Failed to create study set. The AI model may be overloaded. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setFile(null);
    setYoutubeUrl('');
    setError(null);
    setIsLoading(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Source">
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
  onSelectStudySet: (id: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onSelectStudySet }) => {
  const { user, users, switchUser } = useAuth();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStudySets = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const sets = await firestoreService.getStudySetsForUser(user.uid);
      setStudySets(sets);
    } catch (error) {
      console.error("Failed to fetch study sets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudySets();
  }, [fetchStudySets]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-4">
            <span className="text-slate-400">Current User:</span>
            <select
                value={user?.uid || ''}
                onChange={(e) => switchUser(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {users.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                ))}
            </select>
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
              <p className="text-xs text-slate-500 mt-4">Created: {set.createdAt.toDate().toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}

      <AddNewSourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onStudySetAdded={fetchStudySets} />
    </div>
  );
};

export default DashboardView;