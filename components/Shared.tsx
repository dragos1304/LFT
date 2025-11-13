import React from 'react';
import { StarIcon } from './Icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 focus:ring-slate-500 text-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {children}
    </button>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  const clickableClasses = onClick ? 'cursor-pointer transition-all duration-200 hover:bg-slate-700 hover:shadow-lg hover:-translate-y-1' : '';
  return (
    <div
      className={`bg-slate-800 rounded-lg shadow-md p-6 ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface StarRatingProps {
  score: number;
  setScore: (score: number) => void;
  maxScore?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ score, setScore, maxScore = 5 }) => {
  return (
    <div className="flex items-center space-x-1">
      {[...Array(maxScore)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={ratingValue}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => setScore(ratingValue)}
              className="hidden"
            />
            <StarIcon className={`cursor-pointer h-5 w-5 ${ratingValue <= score ? 'text-yellow-400' : 'text-slate-600'}`} />
          </label>
        );
      })}
    </div>
  );
};