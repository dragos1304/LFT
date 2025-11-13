// FIX: Switched to Firebase v8 compatibility syntax to address import errors.
import firebase from 'firebase/app';
import 'firebase/auth';

import { firebaseConfig } from './firebaseConfig';
import {
    User, StudySet, Keyword, Flashcard, PracticeQuestion, BloomLevel, QuestionType, OutlineNode, SRSData
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// INITIALIZE FIREBASE USING V8 COMPATIBILITY SYNTAX
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();


// MOCK DATABASE
// This simulates Firestore collections in memory.
let mockUsers: User[] = [
    { uid: 'user1', displayName: 'Alex Doe', email: 'alex@example.com' },
    { uid: 'user2', displayName: 'Beth Smith', email: 'beth@example.com' },
    { uid: 'user3', displayName: 'Charlie Brown', email: 'charlie@example.com' },
];
let mockStudySets: StudySet[] = [];
let mockKeywords: Keyword[] = [];
let mockFlashcards: Flashcard[] = [];
let mockPracticeQuestions: PracticeQuestion[] = [];
let mockClassGroups = [{ id: 'group1', groupName: 'Biology 101', joinCode: 'BIO101', memberIds: ['user1', 'user2', 'user3'] }];

let currentUserId: string | null = null;

const MOCK_LATENCY = 500;

// Helper to initialize data for a new study set
const initializeNewStudySetData = (userId: string, data: any): string => {
    const studySetId = uuidv4();

    const newStudySet: StudySet = {
        id: studySetId,
        userId,
        title: data.title,
        summaryText: data.summary_text,
        hierarchicalOutline: data.hierarchical_outline as OutlineNode,
        createdAt: new Date(),
    };
    mockStudySets.push(newStudySet);

    data.keywords.forEach((k: any) => {
        mockKeywords.push({
            id: uuidv4(),
            studySetId: studySetId,
            text: k.text,
            definition: k.definition,
            sourceSentence: k.source_sentence,
            aiImportanceScore: k.ai_importance_score,
            userImportanceScores: {},
        });
    });

    data.flashcards.forEach((f: any) => {
        mockFlashcards.push({
            id: uuidv4(),
            studySetId: studySetId,
            frontText: f.front_text,
            backText: f.back_text,
            isUserEdited: false,
            srsData: { interval: 1, easeFactor: 2.5, nextReviewDate: new Date().toISOString() },
        });
    });

    data.practice_questions.forEach((q: any) => {
        mockPracticeQuestions.push({
            id: uuidv4(),
            studySetId: studySetId,
            bloomLevel: q.bloom_level as BloomLevel,
            questionType: q.question_type as QuestionType,
            questionText: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            aiGradingRubric: q.ai_grading_rubric,
        });
    });

    return studySetId;
};

// FIREBASE SERVICE IMPLEMENTATION
export const firebaseService = {
    // --- AUTH (Now using REAL Firebase with v8 compatibility syntax) ---
    onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
        // Use Firebase v8 onAuthStateChanged
        return auth.onAuthStateChanged((firebaseUser: firebase.User | null) => {
            if (firebaseUser) {
                // Convert FirebaseUser to your app's custom User type
                const appUser: User = {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                };
                // Set current user ID for mock database operations
                currentUserId = appUser.uid;
                if (!mockUsers.some(u => u.uid === appUser.uid)) {
                    mockUsers.push(appUser);
                }
                callback(appUser);
            } else {
                currentUserId = null;
                callback(null);
            }
        });
    },
    signInWithGoogle: async (): Promise<User> => {
        // Use Firebase v8 signInWithPopup
        const result = await auth.signInWithPopup(provider);
        const firebaseUser = result.user;
        if (!firebaseUser) {
            throw new Error("Firebase sign-in failed: no user returned.");
        }
        // Convert FirebaseUser to your app's custom User type
        const appUser: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
        };
        return appUser;
    },
    signOut: (): Promise<void> => {
        // Use Firebase v8 signOut
        return auth.signOut();
    },

    // --- DATA (Still Mocked) ---
    getStudySets: (userId: string): Promise<StudySet[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(mockStudySets.filter(s => s.userId === userId));
            }, MOCK_LATENCY);
        });
    },
    addStudySet: (userId: string, data: any): Promise<string> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newId = initializeNewStudySetData(userId, data);
                resolve(newId);
            }, MOCK_LATENCY);
        });
    },
    getStudySetDetails: async (studySetId: string): Promise<{
        studySet: StudySet,
        keywords: Keyword[],
        flashcards: Flashcard[],
        questions: PracticeQuestion[]
    } | null> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const studySet = mockStudySets.find(s => s.id === studySetId);
                if (!studySet) {
                    resolve(null);
                    return;
                }
                const keywords = mockKeywords.filter(k => k.studySetId === studySetId);
                const flashcards = mockFlashcards.filter(f => f.studySetId === studySetId);
                const questions = mockPracticeQuestions.filter(q => q.studySetId === studySetId);
                resolve({ studySet, keywords, flashcards, questions });
            }, MOCK_LATENCY);
        });
    },
    updateKeywordScore: (keywordId: string, userId: string, score: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const keyword = mockKeywords.find(k => k.id === keywordId);
                if (keyword) {
                    keyword.userImportanceScores[userId] = score;
                    resolve();
                } else {
                    reject(new Error("Keyword not found"));
                }
            }, MOCK_LATENCY / 2);
        });
    },
    updateFlashcardSRS: (flashcardId: string, newSRSData: SRSData): Promise<void> => {
         return new Promise((resolve, reject) => {
            setTimeout(() => {
                const card = mockFlashcards.find(f => f.id === flashcardId);
                if (card) {
                    card.srsData = newSRSData;
                    resolve();
                } else {
                    reject(new Error("Flashcard not found"));
                }
            }, 100);
        });
    },
     updateSummaryText: (studySetId: string, newText: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const studySet = mockStudySets.find(s => s.id === studySetId);
                if (studySet) {
                    studySet.summaryText = newText;
                    resolve();
                } else {
                    reject(new Error("Study set not found"));
                }
            }, MOCK_LATENCY / 2);
        });
    },
    getGroupScoresForKeyword: (keywordId: string, currentUserId: string): Promise<{ avgScore: number, count: number }> => {
         return new Promise((resolve) => {
            setTimeout(() => {
                const group = mockClassGroups.find(g => g.memberIds.includes(currentUserId));
                if (!group) {
                    resolve({ avgScore: 0, count: 0 });
                    return;
                }
                const keyword = mockKeywords.find(k => k.id === keywordId);
                if (!keyword) {
                    resolve({ avgScore: 0, count: 0 });
                    return;
                }

                let totalScore = 0;
                let count = 0;
                group.memberIds.forEach(memberId => {
                    if (memberId !== currentUserId && keyword.userImportanceScores[memberId]) {
                        totalScore += keyword.userImportanceScores[memberId];
                        count++;
                    }
                });

                resolve({ avgScore: count > 0 ? totalScore / count : 0, count });
            }, MOCK_LATENCY / 2);
        });
    }
};

// Seed initial data for user1
initializeNewStudySetData('user1', {
  title: "Cellular Biology Basics",
  summary_text: "A foundational look at the structure and function of cells, the basic building blocks of life.",
  hierarchical_outline: { topic: "Cells", details: ["The basic unit of life"], children: [] },
  keywords: [{ text: "Nucleus", definition: "The control center of the cell.", source_sentence: "The nucleus contains the cell's genetic material.", ai_importance_score: 5 }],
  flashcards: [{ front_text: "What is the powerhouse of the cell?", back_text: "The Mitochondria" }],
  practice_questions: [{ bloom_level: BloomLevel.Remember, question_type: QuestionType.MCQ, question_text: "Which organelle is responsible for protein synthesis?", options: ["Nucleus", "Ribosome", "Mitochondria"], correct_answer: "Ribosome", ai_grading_rubric: "Ribosomes are the sites of protein synthesis." }],
});