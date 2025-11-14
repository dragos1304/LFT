import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { StudySet, Keyword, Flashcard, PracticeQuestion, OutlineNode, ChatMessage, BloomLevel, QuestionType, SRSData } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { GoogleGenAI, Chat } from "@google/genai";
import { Button, Spinner, Card, StarRating, Modal } from './Shared';
import { ArrowLeftIcon, StarIcon, ChevronDownIcon } from './Icons';

type StudySetData = {
  studySet: StudySet;
  keywords: Keyword[];
  flashcards: Flashcard[];
  questions: PracticeQuestion[];
};

type Tab = 'summary' | 'keywords' | 'flashcards' | 'quiz' | 'links';


// --- TAB SUB-COMPONENTS ---

const SummaryTab: React.FC<{ studySet: StudySet }> = ({ studySet }) => {
  const [summary, setSummary] = useState(studySet.summaryText);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await firestoreService.updateSummaryText(studySet.id, summary);
    setIsSaving(false);
  };
  
  return (
    <Card>
      <h3 className="text-xl font-bold mb-4">AI-Generated Summary</h3>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="w-full h-64 p-3 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="text-right mt-4">
        <Button onClick={handleSave} disabled={isSaving || summary === studySet.summaryText}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
};

const KeywordsTab: React.FC<{ studySetId: string, keywords: Keyword[] }> = ({ studySetId, keywords }) => {
    const { user } = useAuth();

    const handleSetScore = (keywordId: string, score: number) => {
        if (user) {
            firestoreService.updateKeywordScore(studySetId, keywordId, user.uid, score);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keywords.map(kw => (
                <Card key={kw.id}>
                    <h4 className="text-lg font-semibold text-indigo-400">{kw.text}</h4>
                    <p className="text-slate-300 mt-1">{kw.definition}</p>
                    <p className="text-sm text-slate-500 mt-2 italic">"{kw.sourceSentence}"</p>
                    <div className="flex justify-between items-center mt-4">
                        <div>
                            <p className="text-sm font-medium">Your Importance:</p>
                            <StarRating 
                                score={user ? kw.userImportanceScores[user.uid] || 0 : 0} 
                                setScore={(s) => handleSetScore(kw.id, s)}
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">AI Score:</p>
                            <span className="font-bold text-lg">{kw.aiImportanceScore}/5</span>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};

const FlashcardsTab: React.FC<{ studySetId: string, initialFlashcards: Flashcard[] }> = ({ studySetId, initialFlashcards }) => {
  const [isStudying, setIsStudying] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const studyDeck = useMemo(() => initialFlashcards.sort((a, b) => a.srsData.nextReviewDate.toMillis() - b.srsData.nextReviewDate.toMillis()), [initialFlashcards]);

  const startStudySession = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
  };
  
  const handleSRSUpdate = (difficulty: 'again' | 'hard' | 'good' | 'easy') => {
    const card = studyDeck[currentCardIndex];
    let { interval, easeFactor } = card.srsData;
    
    switch (difficulty) {
        case 'again': interval = 1; easeFactor = Math.max(1.3, easeFactor - 0.2); break;
        case 'hard': interval = Math.max(1, interval * 0.8); easeFactor = Math.max(1.3, easeFactor - 0.15); break;
        case 'good': interval *= easeFactor; break;
        case 'easy': interval *= easeFactor * 1.3; easeFactor += 0.15; break;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(interval));

    const newSrsData: SRSData = { interval, easeFactor, nextReviewDate: Timestamp.fromDate(nextReviewDate) };
    
    firestoreService.updateFlashcardSRS(studySetId, card.id, newSrsData);
    
    if (currentCardIndex < studyDeck.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsStudying(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <Button onClick={startStudySession} disabled={studyDeck.length === 0}>Study Deck</Button>
      </div>
      <Modal isOpen={isStudying} onClose={() => setIsStudying(false)} title={`Studying Flashcards (${currentCardIndex + 1}/${studyDeck.length})`}>
        {studyDeck.length > 0 && (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <div 
                    onClick={() => setIsFlipped(f => !f)} 
                    className="w-full h-64 flex items-center justify-center p-6 bg-slate-700 rounded-lg cursor-pointer text-center text-2xl font-semibold"
                >
                    {isFlipped ? studyDeck[currentCardIndex].backText : studyDeck[currentCardIndex].frontText}
                </div>
                {isFlipped && (
                    <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <Button variant="danger" onClick={() => handleSRSUpdate('again')}>Again</Button>
                        <Button variant="secondary" onClick={() => handleSRSUpdate('hard')}>Hard</Button>
                        <Button variant="primary" onClick={() => handleSRSUpdate('good')}>Good</Button>
                        <Button variant="primary" onClick={() => handleSRSUpdate('easy')}>Easy</Button>
                    </div>
                )}
            </div>
        )}
      </Modal>
    </>
  );
};

const QuizTab: React.FC<{ questions: PracticeQuestion[] }> = ({ questions }) => {
  const [quizState, setQuizState] = useState<'idle' | 'active' | 'finished'>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean, text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const sortedQuestions = useMemo(() => {
    const bloomOrder = Object.values(BloomLevel);
    return [...questions].sort((a,b) => bloomOrder.indexOf(a.bloomLevel) - bloomOrder.indexOf(b.bloomLevel));
  }, [questions]);
  
  const currentQuestion = sortedQuestions[currentQuestionIndex];

  const startQuiz = () => {
    setQuizState('active');
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setUserAnswer('');
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setFeedback(null);
        setUserAnswer('');
    } else {
        setQuizState('finished');
    }
  };

  const handleSubmitAnswer = async () => {
    setIsSubmitting(true);
    if (currentQuestion.questionType === QuestionType.MCQ) {
      const isCorrect = userAnswer === currentQuestion.correctAnswer;
      if (isCorrect) setScore(s => s + 1);
      setFeedback({ correct: isCorrect, text: isCorrect ? 'Correct!' : `The correct answer is ${currentQuestion.correctAnswer}` });
    } else {
      const result = await geminiService.gradeOpenEndedQuestion(currentQuestion.questionText, currentQuestion.aiGradingRubric, userAnswer);
      if (result.is_correct) setScore(s => s + 1);
      setFeedback({ correct: result.is_correct, text: result.feedback_text });
    }
    setIsSubmitting(false);
  };
  
  if (quizState === 'idle') {
    return <div className="text-center"><Button onClick={startQuiz}>Start Practice Quiz</Button></div>;
  }
  
  if (quizState === 'finished') {
    return (
        <Card className="text-center">
            <h3 className="text-2xl font-bold">Quiz Complete!</h3>
            <p className="text-lg mt-2">Your score: {score} / {sortedQuestions.length}</p>
            <Button onClick={startQuiz} className="mt-6">Try Again</Button>
        </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-baseline">
        <h3 className="text-lg font-bold">Question {currentQuestionIndex + 1}/{sortedQuestions.length}</h3>
        <span className="text-sm px-2 py-1 bg-indigo-500/50 text-indigo-200 rounded">{currentQuestion.bloomLevel}</span>
      </div>
      <p className="mt-4 text-xl">{currentQuestion.questionText}</p>
      <div className="my-6">
        {currentQuestion.questionType === QuestionType.MCQ ? (
          <div className="space-y-3">
            {currentQuestion.options?.map(opt => (
              <button key={opt} onClick={() => setUserAnswer(opt)} disabled={!!feedback} className={`block w-full text-left p-3 rounded-md border-2 transition-colors ${userAnswer === opt ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'} disabled:cursor-not-allowed`}>{opt}</button>
            ))}
          </div>
        ) : (
          <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={!!feedback} className="w-full h-32 p-3 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70" placeholder="Type your answer here..."/>
        )}
      </div>

      {feedback && <div className={`p-4 rounded-md mb-4 text-white ${feedback.correct ? 'bg-green-600/50' : 'bg-red-600/50'}`}><p className="font-bold">{feedback.correct ? 'Correct!' : 'Needs Review'}</p><p>{feedback.text}</p></div>}

      <div className="text-right">
        {feedback ? (<Button onClick={handleNextQuestion}>Next Question</Button>) : (<Button onClick={handleSubmitAnswer} disabled={!userAnswer || isSubmitting}>{isSubmitting ? <Spinner/> : 'Submit Answer'}</Button>)}
      </div>
    </Card>
  );
};

const OutlineRenderer: React.FC<{ node: OutlineNode }> = ({ node }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <li className="ml-4">
            <div onClick={() => setIsOpen(o => !o)} className="flex items-center cursor-pointer">
                {node.children && node.children.length > 0 && <ChevronDownIcon className={`w-4 h-4 mr-1 transition-transform ${isOpen ? '' : '-rotate-90'}`} />}
                <span className="font-semibold">{node.topic}</span>
            </div>
            {isOpen && (
                <ul className="pl-4 border-l border-slate-700">
                    {node.details.map((detail, i) => <li key={i} className="text-slate-400">{detail}</li>)}
                    {node.children?.map((child, i) => <OutlineRenderer key={i} node={child} />)}
                </ul>
            )}
        </li>
    );
};

const LinksTab: React.FC<{ outline: OutlineNode }> = ({ outline }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'ai', text: "Hello! I'm your Socratic tutor. What concepts from the outline seem most interesting to you?" }]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!process.env.API_KEY) return;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: "You are a Socratic tutor. Your goal is to help the user discover connections between concepts in their study set. Ask guiding questions, do not give the answer." },
        });
    }, []);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    const handleSendMessage = async () => {
        if (!userInput.trim() || !chatRef.current) return;
        
        const userMessage = userInput;
        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: userMessage });
            setMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <h3 className="text-xl font-bold mb-4">Top-Down View</h3>
                <ul className="space-y-2"><OutlineRenderer node={outline} /></ul>
            </Card>
            <Card className="flex flex-col h-[70vh]">
                <h3 className="text-xl font-bold mb-4">Socratic Tutor</h3>
                <div className="flex-grow space-y-4 overflow-y-auto pr-2 mb-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.sender === 'ai' ? 'bg-slate-700' : 'bg-indigo-600'}`}>{msg.text}</div>
                        </div>
                    ))}
                    {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-slate-700"><Spinner /></div></div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="flex mt-auto">
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-grow bg-slate-700 border border-slate-600 rounded-l-md px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ask a question..." />
                    <Button onClick={handleSendMessage} disabled={isLoading} className="rounded-l-none">Send</Button>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN VIEW COMPONENT ---
const StudySetView: React.FC<{
  studySetId: string;
  onBack: () => void;
}> = ({ studySetId, onBack }) => {
  const [data, setData] = useState<StudySetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const details = await firestoreService.getStudySetDetails(studySetId);
        setData(details);
      } catch (error) {
        console.error("Failed to fetch study set details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [studySetId]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'summary', label: 'Summary' }, { id: 'keywords', label: 'Exam Keywords' },
    { id: 'flashcards', label: 'Flashcards' }, { id: 'quiz', label: 'Practice Quiz' },
    { id: 'links', label: 'Conceptual Links' },
  ];

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  if (!data) return <div className="flex flex-col items-center justify-center min-h-screen text-center"><h2 className="text-2xl text-red-400">Study Set Not Found</h2><Button onClick={onBack} className="mt-4">Back to Dashboard</Button></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <button onClick={onBack} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-4">
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold text-white">{data.studySet.title}</h1>
      </header>

      <div className="border-b border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'summary' && <SummaryTab studySet={data.studySet} />}
        {activeTab === 'keywords' && <KeywordsTab studySetId={studySetId} keywords={data.keywords} />}
        {activeTab === 'flashcards' && <FlashcardsTab studySetId={studySetId} initialFlashcards={data.flashcards} />}
        {activeTab === 'quiz' && <QuizTab questions={data.questions} />}
        {activeTab === 'links' && <LinksTab outline={data.studySet.hierarchicalOutline} />}
      </div>
    </div>
  );
};

export default StudySetView;