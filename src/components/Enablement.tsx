
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
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in relative pb-24">
            {/* Header & Smart Banner */}
            <div className="space-y-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                            <GraduationCap className="mr-3 text-indigo-600" /> Success Toolkit
                        </h1>
                        <p className="text-slate-500 mt-1">Operational guides, local business context, and competency validation.</p>
                    </div>
                </div>

                {/* THE SMART BRIDGE BANNER */}
                <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-2/3 h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-xs font-bold mb-3">
                                <GraduationCap size={14} className="mr-2"/> Official Curriculum
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Looking for Core Certification Material?</h2>
                            <p className="text-indigo-200 text-sm max-w-xl">
                                Access the John Maxwell video library, core teaching modules, and certification tracks on our Global LMS.
                            </p>
                        </div>
                        <a 
                            href="https://online.maxwellleadership.com" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="shrink-0 flex items-center bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 shadow-lg transition-transform hover:scale-105"
                        >
                            Go to Official LMS <ExternalLink size={18} className="ml-2"/>
                        </a>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-6">
                <button onClick={() => setActiveTab('TOOLKIT')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'TOOLKIT' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                    <Briefcase size={16} className="mr-2"/> Operational Resources
                </button>
                <button onClick={() => setActiveTab('MENTORING')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'MENTORING' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>
                    <BrainCircuit size={16} className="mr-2"/> AI Mentor
                </button>
                <button onClick={() => setActiveTab('VALIDATION')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'VALIDATION' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>
                    <ShieldCheck size={16} className="mr-2"/> Validation & Exams
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'TOOLKIT' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map(article => (
                            <div key={article.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-full group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase flex items-center gap-1">
                                        {getCategoryIcon(article.category)} {article.category.replace('_', ' ')}
                                    </span>
                                    {article.isFeatured && <span className="text-[10px] text-amber-600 font-bold flex items-center"><Target size={12} className="mr-1"/> Recommended</span>}
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">{article.title}</h4>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">{article.summary}</p>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                                    <span className="flex items-center"><Clock size={12} className="mr-1"/> {article.readTimeMin} min read</span>
                                    <button className="text-blue-600 font-bold hover:underline flex items-center">Read Now <ArrowRight size={14} className="ml-1"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'MENTORING' && session && persona && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                        <div className="lg:col-span-8 space-y-8">
                            <MenteeProgressDashboard session={session} onToggleAction={handleToggleAction} />
                        </div>
                        <div className="lg:col-span-4 h-full sticky top-0">
                            <DigitalMentorChat session={session} persona={persona} onUpdate={setSession} />
                        </div>
                    </div>
                )}

                {activeTab === 'VALIDATION' && (
                    <div className="max-w-3xl mx-auto space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex gap-3 mb-6">
                            <ShieldCheck className="text-yellow-600 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-800">Competency Validation</h4>
                                <p className="text-xs text-yellow-700 mt-1">
                                    These Post-Tests validate your understanding of the core material. Passing these updates your Member Report Card in the Facilitator's view.
                                </p>
                            </div>
                        </div>

                        {quizzes.map(quiz => {
                            const attempt = history.find(h => h.quizId === quiz.id);
                            return (
                                <div key={quiz.id} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
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
    );
};

export default Enablement;
