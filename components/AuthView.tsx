import React from 'react';
import { Button } from './Shared';
import { GoogleIcon, BookOpenIcon } from './Icons';

interface AuthViewProps {
  onLogin: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-md text-center">
        <BookOpenIcon className="w-24 h-24 mx-auto text-indigo-400" />
        <h1 className="mt-6 text-4xl font-extrabold text-white tracking-tight">
          Learning Fast-Track
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          Your personal AI-powered study partner.
        </p>
        <div className="mt-10">
          <Button onClick={onLogin} variant="primary" className="w-full flex items-center justify-center text-lg !py-3">
            <GoogleIcon className="w-6 h-6 mr-3" />
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
