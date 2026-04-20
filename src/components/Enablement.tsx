
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
import DigitalMentorChat from './mentoring/DigitalMentorChat';
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
        <div className="relative flex min-h-0 flex-1 flex-col animate-fade-in bg-slate-50">
            {/* Wider than default page-container on desktop so AI Mentor 3-col workbench matches reference */}
            <div className="mx-auto box-border flex min-h-0 w-full min-w-0 max-w-[min(100%,100rem)] flex-1 flex-col gap-6 px-3 py-4 sm:gap-8 sm:px-5 sm:py-6 lg:px-10 lg:py-6">
            {/* Header & Smart Banner */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <GraduationCap className="h-6 w-6" strokeWidth={2} aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                                Success Toolkit
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                Operational guides, local business context, and competency validation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* THE SMART BRIDGE BANNER */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-blue-900 p-5 text-white shadow-xl sm:p-6">
                    <div className="absolute right-0 top-0 h-full w-2/3 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" aria-hidden />
                    <div className="relative z-10 flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-center">
                        <div className="min-w-0">
                            <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100">
                                <GraduationCap size={14} className="mr-2 shrink-0" aria-hidden /> Official Curriculum
                            </div>
                            <h2 className="mb-1 text-xl font-bold sm:text-2xl">Looking for Core Certification Material?</h2>
                            <p className="max-w-xl text-sm text-indigo-200">
                                Access the John Maxwell video library, core teaching modules, and certification tracks on our Global LMS.
                            </p>
                        </div>
                        <a 
                            href="https://online.maxwellleadership.com" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-900 shadow-lg transition-transform hover:scale-[1.02] hover:bg-indigo-50 md:self-center"
                        >
                            Go to Official LMS <ExternalLink size={18} className="shrink-0" aria-hidden />
                        </a>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="max-w-full min-w-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-0.5 shadow-inner">
                <div className="inline-flex min-w-0 flex-nowrap gap-0.5 sm:w-full sm:min-w-0">
                <button type="button" onClick={() => setActiveTab('TOOLKIT')} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'TOOLKIT' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Briefcase size={16} className="mr-2 shrink-0" aria-hidden /> Operational Resources
                </button>
                <button type="button" onClick={() => setActiveTab('MENTORING')} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'MENTORING' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <BrainCircuit size={16} className="mr-2 shrink-0" aria-hidden /> AI Mentor
                </button>
                <button type="button" onClick={() => setActiveTab('VALIDATION')} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:px-4 sm:py-2.5 sm:text-sm ${activeTab === 'VALIDATION' ? 'bg-white text-green-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ShieldCheck size={16} className="mr-2 shrink-0" aria-hidden /> Validation &amp; Exams
                </button>
                </div>
            </div>

            <div className="min-h-0 flex-1">
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
                                <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                                    <span className="flex items-center"><Clock size={12} className="mr-1"/> {article.readTimeMin} min read</span>
                                    <button className="text-blue-600 font-bold hover:underline flex items-center">Read Now <ArrowRight size={14} className="ml-1"/></button>
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
                            <DigitalMentorChat session={session} persona={persona} onUpdate={setSession} />
                        }
                    />
                )}

                {activeTab === 'MENTORING' && (!session || !persona) && (
                    <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                        AI Mentor is not available yet.
                    </div>
                )}

                {activeTab === 'VALIDATION' && (
                    <div className="mx-auto w-full max-w-3xl space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex gap-3 mb-6">
                            <ShieldCheck className="text-yellow-600 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-800">Competency Validation</h4>
                                <p className="text-xs text-yellow-700 mt-1">
                                    These Post-Tests validate your understanding of the core material. Passing these updates your Member Report Card in the Facilitator's view.
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
                                <div key={quiz.id} className="flex items-center justify-between rounded-xl border border-slate-300 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900">{quiz.title}</h4>
                                            {attempt && attempt.passed && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center"><CheckCircle size={10} className="mr-1"/> PASSED</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 max-w-md">{quiz.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleStartQuiz(quiz)} 
                                        disabled={!!attempt && attempt.passed}
                                        className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${attempt && attempt.passed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
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
                <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-8 animate-fade-in">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{activeQuiz.title}</h2>
                                <p className="text-sm text-slate-500">Post-Test Assessment</p>
                            </div>
                            <button onClick={() => setActiveQuiz(null)}><X size={24} className="text-slate-400 hover:text-slate-800"/></button>
                        </div>
                        {!quizResult ? (
                            <div className="space-y-8">
                                {activeQuiz.questions.map((q, idx) => (
                                    <div key={q.id} className="space-y-4">
                                        <p className="font-bold text-lg text-slate-800">{idx + 1}. {q.text}</p>
                                        <div className="grid grid-cols-1 gap-3">
                                            {q.options.map((opt, oIdx) => (
                                                <button key={oIdx} onClick={() => handleAnswer(idx, oIdx)} className={`p-4 text-left rounded-xl border transition-all ${quizAnswers[idx] === oIdx ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={handleSubmitQuiz} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-colors">Submit Assessment</button>
                            </div>
                        ) : (
                            <div className="text-center py-20 animate-scale-in">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${quizResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {quizResult.passed ? <CheckCircle size={48}/> : <X size={48}/>}
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{quizResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}</h3>
                                <p className="text-slate-500 mt-2 text-lg">Your Score: <span className="font-bold">{quizResult.score}%</span></p>
                                <p className="text-sm text-slate-400 mt-1">{quizResult.passed ? 'This result has been recorded in your profile.' : 'Review the material and try again.'}</p>
                                <button onClick={() => setActiveQuiz(null)} className="mt-10 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800">Back to Toolkit</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Enablement;
