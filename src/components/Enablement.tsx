
import React, { useState, useEffect } from 'react';
import { EnablementService } from '../services/enablementService';
import { MentoringService } from '../services/mentoringService';
import { DigitalTwinService } from '../services/digitalTwinService';
import { KnowledgeArticle, Quiz, QuizAttempt } from '../types/index';
import { MentoringSession, MentorPersona } from '../types/mentoring';
import { useAuth } from '../context/AuthContext';
import { 
    ExternalLink, BookOpen, GraduationCap, CheckCircle, 
    ArrowRight, Clock, X, BrainCircuit, Target, Briefcase, FileText,
    Zap, ShieldCheck
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AiMentorChatComingSoon from './mentoring/AiMentorChatComingSoon';
import MenteeProgressDashboard from './mentoring/MenteeProgressDashboard';

const Enablement: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'TOOLKIT' | 'MENTORING' | 'VALIDATION'>('TOOLKIT');
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [history, setHistory] = useState<QuizAttempt[]>([]);
    
    // Mentoring State
    const [session, setSession] = useState<MentoringSession | null>(null);
    const [persona, setPersona] = useState<MentorPersona | null>(null);

    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        const [arts, qzs, hist] = await Promise.all([
            EnablementService.getArticles(),
            EnablementService.getQuizzes(),
            user ? EnablementService.getUserHistory(user.id) : []
        ]);
        setArticles(arts);
        setQuizzes(qzs);
        setHistory(hist);

        if (user) {
            const sess = await MentoringService.getSession(user.id);
            const pers = await DigitalTwinService.getPersona('fac-1');
            setSession(sess);
            setPersona(pers);
        }
    };

    const handleToggleAction = (id: string) => {
        if (!session) return;
        const updatedPlan = session.actionPlan.map(a => 
            a.id === id ? { ...a, status: a.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : a
        );
        setSession({ ...session, actionPlan: updatedPlan as any });
        showToast("Progress tracked!", "success");
    };

    const handleStartQuiz = (quiz: Quiz) => {
        setActiveQuiz(quiz);
        setQuizAnswers(new Array(quiz.questions.length).fill(-1));
        setQuizResult(null);
    };

    const handleAnswer = (questionIdx: number, optionIdx: number) => {
        const newAnswers = [...quizAnswers];
        newAnswers[questionIdx] = optionIdx;
        setQuizAnswers(newAnswers);
    };

    const handleSubmitQuiz = async () => {
        if (!activeQuiz || !user) return;
        if (quizAnswers.includes(-1)) {
            showToast("Please answer all questions.", "error");
            return;
        }
        const result = await EnablementService.submitQuiz(user.id, activeQuiz.id, quizAnswers);
        setQuizResult(result);
        loadData();
        if (result.passed) showToast(`Congratulations! You passed with ${result.score}%`, "success");
        else showToast(`You scored ${result.score}%. Try again!`, "error");
    };

    const getCategoryIcon = (cat: string) => {
        switch(cat) {
            case 'BUSINESS': return <Briefcase size={16} className="text-blue-600"/>;
            case 'SYSTEM': return <Zap size={16} className="text-amber-600"/>;
            case 'EVENT_RECAP': return <FileText size={16} className="text-purple-600"/>;
            default: return <BookOpen size={16} className="text-slate-600"/>;
        }
    };

    return (
        <div className="animate-fade-in bg-slate-50">
        <div className="page-container w-full">
            <div className="flex flex-col gap-5 sm:gap-6">
            {/* Header & Smart Banner */}
            <div className="space-y-4 sm:space-y-5">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                        <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                            Success Toolkit
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                            Operational guides, local business context, and competency validation.
                        </p>
                    </div>
                </div>

                {/* THE SMART BRIDGE BANNER */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-900 to-blue-900 p-4 text-white shadow-xl sm:rounded-2xl sm:p-5">
                    <div className="absolute right-0 top-0 h-full w-2/3 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" aria-hidden />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-100 sm:mb-3 sm:px-3 sm:py-1 sm:text-xs">
                                <GraduationCap size={12} className="mr-1.5 shrink-0 sm:mr-2" aria-hidden /> Official Curriculum
                            </div>
                            <h2 className="mb-1 text-base font-bold sm:text-xl lg:text-2xl">Looking for Core Certification Material?</h2>
                            <p className="max-w-xl text-xs text-indigo-200 sm:text-sm">
                                Access the John Maxwell video library, core teaching modules, and certification tracks on our Global LMS.
                            </p>
                        </div>
                        <a 
                            href="https://online.maxwellleadership.com" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-900 shadow-lg transition-transform hover:bg-indigo-50 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
                        >
                            Go to Official LMS <ExternalLink size={16} className="shrink-0" aria-hidden />
                        </a>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="w-full min-w-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-0.5 shadow-inner">
                <div className="flex w-full min-w-max gap-0.5 sm:min-w-0">
                <button type="button" onClick={() => setActiveTab('TOOLKIT')} className={`inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-2 text-[11px] font-bold transition-colors sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'TOOLKIT' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Briefcase size={14} className="mr-1.5 shrink-0 sm:mr-2 sm:size-4" aria-hidden />
                    <span className="sm:hidden">Resources</span>
                    <span className="hidden sm:inline">Operational Resources</span>
                </button>
                <button type="button" onClick={() => setActiveTab('MENTORING')} className={`inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-2 text-[11px] font-bold transition-colors sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'MENTORING' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <BrainCircuit size={14} className="mr-1.5 shrink-0 sm:mr-2 sm:size-4" aria-hidden />
                    AI Mentor
                </button>
                <button type="button" onClick={() => setActiveTab('VALIDATION')} className={`inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-2 text-[11px] font-bold transition-colors sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'VALIDATION' ? 'bg-white text-green-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ShieldCheck size={14} className="mr-1.5 shrink-0 sm:mr-2 sm:size-4" aria-hidden />
                    <span className="sm:hidden">Exams</span>
                    <span className="hidden sm:inline">Validation &amp; Exams</span>
                </button>
                </div>
            </div>

            <div className="w-full">
                {activeTab === 'TOOLKIT' && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                        {articles.length === 0 && (
                            <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                                Operational materials are not available yet.
                            </div>
                        )}
                        {articles.map(article => (
                            <div key={article.id} className="group flex h-full min-w-0 flex-col rounded-xl border border-slate-300 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase flex items-center gap-1">
                                        {getCategoryIcon(article.category)} {article.category.replace('_', ' ')}
                                    </span>
                                    {article.isFeatured && <span className="text-[10px] text-amber-600 font-bold flex items-center"><Target size={12} className="mr-1"/> Recommended</span>}
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">{article.title}</h4>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">{article.summary}</p>
                                <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
                                    <span className="flex items-center"><Clock size={12} className="mr-1"/> {article.readTimeMin} min read</span>
                                    <button type="button" className="flex items-center font-bold text-blue-600 hover:underline">Read Now <ArrowRight size={14} className="ml-1"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'MENTORING' && session && persona && (
                    <MenteeProgressDashboard
                        session={session}
                        onToggleAction={handleToggleAction}
                        chatSlot={
                            <AiMentorChatComingSoon
                                session={session}
                                persona={persona}
                                onUpdate={setSession}
                            />
                        }
                    />
                )}

                {activeTab === 'MENTORING' && (!session || !persona) && (
                    <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                        AI Mentor is not available yet.
                    </div>
                )}

                {activeTab === 'VALIDATION' && (
                    <div className="mx-auto w-full max-w-3xl space-y-3 sm:space-y-4">
                        <div className="mb-4 flex gap-2.5 rounded-xl border border-yellow-200 bg-yellow-50 p-3 sm:mb-6 sm:gap-3 sm:p-4">
                            <ShieldCheck className="shrink-0 text-yellow-600" size={18} />
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-yellow-800">Competency Validation</h4>
                                <p className="mt-0.5 text-xs text-yellow-700">
                                    Post-Tests validate your understanding of core material. Passing updates your Member Report Card.
                                </p>
                            </div>
                        </div>

                        {quizzes.length === 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                                Validation and exams are not available yet.
                            </div>
                        )}

                        {quizzes.map(quiz => {
                            const attempt = history.find(h => h.quizId === quiz.id);
                            return (
                                <div key={quiz.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-slate-900">{quiz.title}</h4>
                                            {attempt && attempt.passed && (
                                                <span className="flex items-center rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                                    <CheckCircle size={10} className="mr-1"/> PASSED
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{quiz.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleStartQuiz(quiz)} 
                                        disabled={!!attempt && attempt.passed}
                                        className={`w-full shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors sm:w-auto sm:py-2 ${attempt && attempt.passed ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                    >
                                        {attempt?.passed ? 'Completed' : attempt ? 'Retake' : 'Start Exam'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Assessment Overlays */}
            {activeQuiz && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
                        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{activeQuiz.title}</h2>
                                <p className="text-xs text-slate-500 sm:text-sm">Post-Test Assessment</p>
                            </div>
                            <button type="button" onClick={() => setActiveQuiz(null)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                        {!quizResult ? (
                            <div className="space-y-6 sm:space-y-8">
                                {activeQuiz.questions.map((q, idx) => (
                                    <div key={q.id} className="space-y-3">
                                        <p className="text-base font-bold text-slate-800 sm:text-lg">{idx + 1}. {q.text}</p>
                                        <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                            {q.options.map((opt, oIdx) => (
                                                <button key={oIdx} type="button" onClick={() => handleAnswer(idx, oIdx)} className={`rounded-xl border p-3 text-left text-sm transition-all sm:p-4 ${quizAnswers[idx] === oIdx ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center sm:py-16">
                                <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full sm:mb-6 sm:h-24 sm:w-24 ${quizResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {quizResult.passed ? <CheckCircle size={40}/> : <X size={40}/>}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">{quizResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}</h3>
                                <p className="mt-2 text-base text-slate-500 sm:text-lg">Your Score: <span className="font-bold">{quizResult.score}%</span></p>
                                <p className="mt-1 text-xs text-slate-400 sm:text-sm">{quizResult.passed ? 'This result has been recorded in your profile.' : 'Review the material and try again.'}</p>
                            </div>
                        )}
                        </div>
                        <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-6">
                        {!quizResult ? (
                            <button type="button" onClick={handleSubmitQuiz} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-slate-800 sm:rounded-2xl sm:py-4">Submit Assessment</button>
                        ) : (
                            <button type="button" onClick={() => setActiveQuiz(null)} className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800">Back to Toolkit</button>
                        )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
        </div>
    );
};

export default Enablement;
