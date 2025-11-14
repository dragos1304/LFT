import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/client";
import {
  StudySet,
  Keyword,
  Flashcard,
  PracticeQuestion,
  User,
  SRSData,
  OutlineNode
} from "../types";
import { v4 as uuidv4 } from 'uuid';

// --- Converters to ensure type safety between Firestore and the app ---
const studySetConverter = {
  toFirestore: (studySet: StudySet) => ({ ...studySet }),
  fromFirestore: (snapshot: any, options: any): StudySet => {
    const data = snapshot.data(options);
    return { ...data, id: snapshot.id } as StudySet;
  },
};

// --- Service Functions ---

export const firestoreService = {
  getStudySetsForUser: async (userId: string): Promise<StudySet[]> => {
    const setsRef = collection(db, "studySets").withConverter(studySetConverter);
    const q = query(setsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  },

  addStudySet: async (userId: string, data: any): Promise<string> => {
    const batch = writeBatch(db);

    // 1. Create Study Set
    const studySetRef = doc(collection(db, "studySets"));
    const newStudySet: Omit<StudySet, 'id'> = {
      userId,
      title: data.title,
      summaryText: data.summary_text,
      hierarchicalOutline: data.hierarchical_outline as OutlineNode,
      createdAt: Timestamp.now(),
    };
    batch.set(studySetRef, newStudySet);
    const studySetId = studySetRef.id;

    // 2. Create Keywords
    data.keywords.forEach((k: any) => {
      const keywordRef = doc(collection(db, `studySets/${studySetId}/keywords`));
      const newKeyword: Omit<Keyword, 'id'> = {
        studySetId,
        text: k.text,
        definition: k.definition,
        sourceSentence: k.source_sentence,
        aiImportanceScore: k.ai_importance_score,
        userImportanceScores: {},
      };
      batch.set(keywordRef, newKeyword);
    });

    // 3. Create Flashcards
    data.flashcards.forEach((f: any) => {
      const flashcardRef = doc(collection(db, `studySets/${studySetId}/flashcards`));
      const newFlashcard: Omit<Flashcard, 'id'> = {
        studySetId,
        frontText: f.front_text,
        backText: f.back_text,
        isUserEdited: false,
        srsData: {
          interval: 1,
          easeFactor: 2.5,
          nextReviewDate: Timestamp.now(),
        },
      };
      batch.set(flashcardRef, newFlashcard);
    });

    // 4. Create Practice Questions
    data.practice_questions.forEach((q: any) => {
      const questionRef = doc(collection(db, `studySets/${studySetId}/practiceQuestions`));
       const newQuestion: Omit<PracticeQuestion, 'id'> = {
            studySetId: studySetId,
            bloomLevel: q.bloom_level,
            questionType: q.question_type,
            questionText: q.question_text,
            options: q.options || [],
            correctAnswer: q.correct_answer,
            aiGradingRubric: q.ai_grading_rubric
        };
      batch.set(questionRef, newQuestion);
    });

    await batch.commit();
    return studySetId;
  },
  
  getStudySetDetails: async (studySetId: string): Promise<{
    studySet: StudySet;
    keywords: Keyword[];
    flashcards: Flashcard[];
    questions: PracticeQuestion[];
  } | null> => {
      const studySetRef = doc(db, "studySets", studySetId).withConverter(studySetConverter);
      const studySetSnap = await getDoc(studySetRef);
      if (!studySetSnap.exists()) return null;
      
      const keywordsRef = collection(db, `studySets/${studySetId}/keywords`);
      const flashcardsRef = collection(db, `studySets/${studySetId}/flashcards`);
      const questionsRef = collection(db, `studySets/${studySetId}/practiceQuestions`);

      const [keywordsSnap, flashcardsSnap, questionsSnap] = await Promise.all([
          getDocs(keywordsRef),
          getDocs(flashcardsRef),
          getDocs(questionsRef)
      ]);

      return {
          studySet: studySetSnap.data(),
          keywords: keywordsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Keyword)),
          flashcards: flashcardsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Flashcard)),
          questions: questionsSnap.docs.map(d => ({ ...d.data(), id: d.id } as PracticeQuestion)),
      };
  },

  updateSummaryText: (studySetId: string, newText: string): Promise<void> => {
    const studySetRef = doc(db, "studySets", studySetId);
    return updateDoc(studySetRef, { summaryText: newText });
  },

  updateKeywordScore: (studySetId: string, keywordId: string, userId: string, score: number): Promise<void> => {
      const keywordRef = doc(db, `studySets/${studySetId}/keywords`, keywordId);
      // Use dot notation to update a specific field in a map
      return updateDoc(keywordRef, {
          [`userImportanceScores.${userId}`]: score
      });
  },

  updateFlashcardSRS: (studySetId: string, flashcardId: string, newSRSData: SRSData): Promise<void> => {
      const flashcardRef = doc(db, `studySets/${studySetId}/flashcards`, flashcardId);
      return updateDoc(flashcardRef, { srsData: newSRSData });
  },
};