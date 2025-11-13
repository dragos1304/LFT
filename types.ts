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

export type StudySet = {
  id: string;
  userId: string;
  title: string;
  summaryText: string;
  hierarchicalOutline: OutlineNode;
  createdAt: Date;
};

export type OutlineNode = {
  topic: string;
  details: string[];
  children?: OutlineNode[];
};

export type Keyword = {
  id: string;
  studySetId: string;
  text: string;
  definition: string;
  sourceSentence: string;
  aiImportanceScore: number;
  userImportanceScores: { [userId: string]: number };
  timestampStart?: number;
};

export type SRSData = {
  interval: number; // in days
  easeFactor: number;
  nextReviewDate: string;
};

export type Flashcard = {
  id: string;
  studySetId: string;
  frontText: string;
  backText: string;
  isUserEdited: boolean;
  srsData: SRSData;
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

export type PracticeQuestion = {
  id:string;
  studySetId: string;
  bloomLevel: BloomLevel;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  aiGradingRubric: string;
};

export type ClassGroup = {
  id: string;
  groupName: string;
  joinCode: string;
  memberIds: string[];
};

export type ConceptLink = {
  id: string;
  studySetId: string;
  userExplanation: string; // The "story"
  createdAt: Date;
};

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};
