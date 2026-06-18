'use client';

import React, { useState, useEffect } from 'react';
import { FormDefinition, FormResponse } from '../types';
import { FormService, normalizeFormResponse } from '@/services/formService';
import { DataService } from '@/services/dataService';
import { ChevronLeft, Users, BarChart3, Loader2, Eye, X, Clock } from 'lucide-react';
import type { Event } from '@/types/index';

interface FormReportsPageProps {
    formId: string;
    onBack: () => void;
}

type SessionStat = {
    id: string;
    name: string;
    eventId?: string;
    responseCount: number;
    attendanceRatio: number | null;
    linkedEvent?: { id: string; name: string; attendees: number } | null;
    sessionAvgScore: number | null;
};

function formatAnswerValue(value: unknown): string {
    if (value == null || value === '') return '-';
    if (Array.isArray(value)) return value.map(String).join(', ');
    return String(value);
}

const FormReportsPage: React.FC<FormReportsPageProps> = ({ formId, onBack }) => {
    const [form, setForm] = useState<FormDefinition | null>(null);
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
    const [summary, setSummary] = useState<{ totalResponses: number; avgScore: number | null; directResponses: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
    const [previewResponse, setPreviewResponse] = useState<FormResponse | null>(null);

    useEffect(() => {
        void loadData();
    }, [formId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const report = await FormService.getFormReports(formId);
            const formRow = report.form as FormDefinition;
            setForm(formRow);
            const rawResponses = Array.isArray(report.responses) ? report.responses : [];
            setResponses(
                rawResponses.map((row) =>
                    normalizeFormResponse(row as Record<string, unknown>),
                ),
            );
            setSessionStats((Array.isArray(report.deployments) ? report.deployments : []) as SessionStat[]);
            setSummary((report.summary as typeof summary) ?? null);

            const events = await DataService.getEvents();
            const eMap: Record<string, Event> = {};
            events.forEach((e) => { eMap[e.id] = e; });
            setEventsMap(eMap);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center gap-2 py-20 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                Loading reports...
            </div>
        );
    }
    if (!form) {
        return (
            <div className="page-container py-20 text-center text-red-500">Form not found.</div>
        );
    }

    const avgScore = summary?.avgScore ?? null;
    const directResponses = summary?.directResponses ?? responses.filter((r) => !r.sessionId).length;

    const getSessionDisplayName = (r: FormResponse) => {
        if (r.sessionId) {
            const session = sessionStats.find((s) => s.id === r.sessionId);
            if (session) {
                if (session.eventId && eventsMap[session.eventId]) {
                    return `${session.name} · ${eventsMap[session.eventId].name}`;
                }
                return session.name;
            }
        }

        if (r.deploymentName) {
            if (r.eventId && eventsMap[r.eventId]) {
                return `${r.deploymentName} · ${eventsMap[r.eventId].name}`;
            }
            return r.deploymentName;
        }

        if (r.eventId && eventsMap[r.eventId]) {
            return eventsMap[r.eventId].name;
        }

        if (!r.sessionId) return 'Direct Link (No Session)';
        return r.sessionId;
    };

    return (
        <div className="page-container animate-fade-in relative min-w-0 space-y-5 pb-8 sm:space-y-6">
            <div className="flex items-start gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{form.title}</h1>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                form.isQuiz ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                        >
                            {form.isQuiz ? 'Quiz' : 'Form'}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Response analytics and respondent details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500">Total Responses</div>
                        <div className="text-2xl font-black text-slate-800">{summary?.totalResponses ?? responses.length}</div>
                    </div>
                </div>
                {form.isQuiz && (
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-500">Average Score</div>
                            <div className="text-2xl font-black text-slate-800">
                                {avgScore ?? '-'} <span className="text-sm font-normal text-slate-400">pts</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3.5">
                    <h2 className="font-bold text-slate-800">Deployment Performance</h2>
                    <p className="text-xs text-slate-500">Responses grouped by session / event deployment</p>
                </div>
                <div className="overflow-x-scroll-touch">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Session</th>
                                <th className="px-6 py-3">Responses</th>
                                <th className="px-6 py-3">Event Participation</th>
                                {form.isQuiz && <th className="px-6 py-3">Avg Score</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessionStats.length === 0 ? (
                                <tr>
                                    <td colSpan={form.isQuiz ? 4 : 3} className="px-6 py-6 text-center italic text-slate-500">
                                        No deployments yet
                                    </td>
                                </tr>
                            ) : (
                                sessionStats.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/80">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{s.name}</div>
                                            {s.linkedEvent && (
                                                <div className="mt-0.5 text-xs text-indigo-600">Event: {s.linkedEvent.name}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{s.responseCount}</td>
                                        <td className="px-6 py-4">
                                            {s.attendanceRatio != null ? `${s.attendanceRatio}%` : '-'}
                                        </td>
                                        {form.isQuiz && <td className="px-6 py-4">{s.sessionAvgScore ?? '-'}</td>}
                                    </tr>
                                ))
                            )}
                            {directResponses > 0 && (
                                <tr className="bg-slate-50/80">
                                    <td className="px-6 py-4 font-medium text-slate-700">Direct Link (No Session)</td>
                                    <td className="px-6 py-4">{directResponses}</td>
                                    <td className="px-6 py-4 text-slate-400">-</td>
                                    {form.isQuiz && <td className="px-6 py-4 text-slate-400">-</td>}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3.5">
                    <h2 className="font-bold text-slate-800">Respondent Details</h2>
                </div>
                <div className="overflow-x-scroll-touch">
                    <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Submitted</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">WhatsApp</th>
                                <th className="px-6 py-3">Session / Event</th>
                                {form.isQuiz && <th className="px-6 py-3">Score</th>}
                                <th className="px-6 py-3 text-right">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {responses.length === 0 ? (
                                <tr>
                                    <td colSpan={form.isQuiz ? 7 : 6} className="px-6 py-6 text-center italic text-slate-500">
                                        No responses yet
                                    </td>
                                </tr>
                            ) : (
                                responses.map((r) => (
                                    <tr key={r.id} className="transition hover:bg-slate-50/80">
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <Clock size={13} className="shrink-0" />
                                                {new Date(r.submittedAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{r.userName || '-'}</td>
                                        <td className="px-6 py-4">{r.userEmail || '-'}</td>
                                        <td className="px-6 py-4">{r.userPhone || '-'}</td>
                                        <td className="max-w-[200px] truncate px-6 py-4 text-xs text-slate-600" title={getSessionDisplayName(r)}>
                                            {getSessionDisplayName(r)}
                                        </td>
                                        {form.isQuiz && (
                                            <td className="px-6 py-4">
                                                <span className="rounded bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                                                    {r.score ?? 0}/{r.maxScore ?? 0}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewResponse(r)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
                                            >
                                                <Eye size={14} />
                                                View Answers
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {previewResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold text-slate-900">
                                    {previewResponse.userName || previewResponse.userEmail || 'Respondent'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {new Date(previewResponse.submittedAt).toLocaleString()}
                                    {' · '}
                                    {getSessionDisplayName(previewResponse)}
                                </p>
                                {(previewResponse.userEmail || previewResponse.userPhone) && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        {[previewResponse.userEmail, previewResponse.userPhone].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewResponse(null)}
                                className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-6">
                            {form.questions.length === 0 ? (
                                <p className="text-sm italic text-slate-400">No questions configured on this form.</p>
                            ) : (
                                form.questions.map((q, idx) => (
                                    <div key={q.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                                        <div className="mb-1 text-xs font-bold uppercase text-slate-400">
                                            Question {idx + 1}
                                        </div>
                                        <div className="mb-2 text-sm font-bold text-slate-800">{q.text}</div>
                                        <div className="text-sm text-slate-700">
                                            {formatAnswerValue(previewResponse.answers[q.id])}
                                        </div>
                                    </div>
                                ))
                            )}
                            {form.isQuiz && typeof previewResponse.score === 'number' && (
                                <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-sm">
                                    <span className="font-bold text-purple-800">Quiz score: </span>
                                    <span className="font-black text-purple-900">
                                        {previewResponse.score} / {previewResponse.maxScore ?? 0}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormReportsPage;
