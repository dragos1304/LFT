import { Timestamp } from 'firebase/firestore';

// --- Core Models ---
export type User = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

export enum View {
  Auth = 'auth',
  Dashboard = 'dashboard',
  StudySet = 'studySet',
}

// --- Firestore Document Models ---
export type StudySet = {
  id: string; // Firestore document ID
  userId: string;
  title: string;
  summaryText: string;
  hierarchicalOutline: OutlineNode;
  createdAt: Timestamp;
};

export type Keyword = {
  id: string; // Firestore document ID
  studySetId: string;
  text: string;
  definition: string;
  sourceSentence: string;
  aiImportanceScore: number;
  userImportanceScores: { [userId: string]: number }; // Map of userId -> score
};

export type Flashcard = {
  id: string; // Firestore document ID
  studySetId: string;
  frontText: string;
  backText: string;
  isUserEdited: boolean;
  srsData: SRSData;
};

export type PracticeQuestion = {
  id: string; // Firestore document ID
  studySetId: string;
  bloomLevel: BloomLevel;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  aiGradingRubric: string;
};

// --- Complex Types & Enums ---
export type OutlineNode = {
  topic: string;
  details: string[];
  children?: OutlineNode[];
};

export type SRSData = {
  interval: number; // in days
  easeFactor: number;
  nextReviewDate: Timestamp;
};

export enum BloomLevel {
  Remember = 'Remember',
  Understand = 'Understand',
  Apply = 'Apply',
  Analyze = 'Analyze',
  Evaluate = 'Evaluate',
  Create = 'Create',
}

export enum QuestionType {
  MCQ = 'mcq',
  OpenEnded = 'open_ended',
}

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};