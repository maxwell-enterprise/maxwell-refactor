'use client';

import React, { useState, useEffect } from 'react';
import { FormResponse, FormDefinition } from '../types';
import { FormService } from '@/services/formService';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, Clock, Eye, ClipboardList, X, Loader2 } from 'lucide-react';
import { ViewState } from '@/types/index';
import PageBackButton from '@/components/common/PageBackButton';

type EnrichedResponse = FormResponse & {
    formTitle?: string;
    isQuiz: boolean;
    formObj?: FormDefinition;
};

const FormHistoryPage: React.FC<{ onNavigate?: (view: ViewState) => void }> = ({
    onNavigate,
}) => {
    const { user } = useAuth();
    const [responses, setResponses] = useState<EnrichedResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewResp, setViewResp] = useState<EnrichedResponse | null>(null);

    useEffect(() => {
        void loadHistory();
    }, [user]);

    const loadHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const rows = await FormService.getResponsesByUserId(user.id);
            const enriched: EnrichedResponse[] = rows.map((resp) => {
                const extra = resp as EnrichedResponse;
                return {
                    ...resp,
                    formTitle: extra.formTitle || 'Unknown Form',
                    isQuiz: extra.isQuiz ?? false,
                    formObj: extra.formObj,
                };
            });
            enriched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            setResponses(enriched);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in relative min-w-0 space-y-6 pb-8">
                <div className="flex items-center gap-2">
                    <PageBackButton view={ViewState.MY_FORMS} onNavigate={onNavigate} />
                    <div className="flex items-center gap-2 py-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin" />
                        Loading history...
                    </div>
                </div>
            </div>
        );
    }

    if (responses.length === 0) {
        return (
            <div className="page-container animate-fade-in relative min-w-0 space-y-6 pb-8">
                <div className="flex items-center gap-2">
                    <PageBackButton view={ViewState.MY_FORMS} onNavigate={onNavigate} />
                    <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                        <ClipboardList size={24} className="text-indigo-600" />
                        My Quizzes & Forms
                    </h1>
                </div>
                <div className="py-10 text-center sm:py-14">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">No submissions yet</h2>
                    <p className="mx-auto mt-2 max-w-md text-slate-500">
                        Forms and quizzes you complete will appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in relative min-w-0 space-y-6 pb-8">
            <div className="flex items-start gap-2">
                <PageBackButton view={ViewState.MY_FORMS} onNavigate={onNavigate} className="mt-0.5" />
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                        <ClipboardList size={24} className="text-indigo-600" />
                        My Quizzes & Forms
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Your submitted responses and quiz scores</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {responses.map((resp) => (
                    <div
                        key={resp.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                        <div className="mb-4 flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 flex-1 font-bold text-slate-800">{resp.formTitle}</h3>
                            <button
                                type="button"
                                onClick={() => setViewResp(resp)}
                                className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 transition hover:bg-indigo-100"
                                title="View answers"
                            >
                                <Eye size={16} />
                            </button>
                        </div>

                        <div className="mb-3 flex items-center text-xs text-slate-500">
                            <CheckCircle size={14} className="mr-1.5 text-green-500" />
                            {new Date(resp.submittedAt).toLocaleString()}
                        </div>

                        {resp.isQuiz && typeof resp.score === 'number' && (
                            <div className="mt-4 flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 p-4">
                                <span className="text-sm font-bold text-purple-800">Score</span>
                                <span className="text-xl font-black text-purple-900">
                                    {resp.score}{' '}
                                    <span className="text-sm font-medium text-purple-600">/ {resp.maxScore}</span>
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {viewResp && (
                <div className="modal-overlay z-50">
                    <div className="modal-panel sm:max-w-2xl sm:h-auto sm:max-h-[90dvh]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{viewResp.formTitle}</h2>
                                <p className="text-sm text-slate-500">
                                    {new Date(viewResp.submittedAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewResp(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                            {(viewResp.formObj?.questions || []).map((q) => (
                                <div key={q.id} className="border-b border-slate-100 pb-3">
                                    <div className="mb-1 text-sm font-bold text-slate-800">{q.text}</div>
                                    <div className="text-sm text-slate-600">
                                        {Array.isArray(viewResp.answers[q.id])
                                            ? (viewResp.answers[q.id] as string[]).join(', ')
                                            : String(viewResp.answers[q.id] ?? '-')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormHistoryPage;
