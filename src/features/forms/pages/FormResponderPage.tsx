'use client';

import React, { useState, useEffect } from 'react';
import { FormDefinition, QuestionType, DataSource } from '../types';
import { FormService } from '@/services/formService';
import { DataService } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';
import type { Product, Event } from '@/types/index';

interface FormResponderPageProps {
    formId: string;
    sessionId?: string;
    onComplete?: () => void;
}

const FormResponderPage: React.FC<FormResponderPageProps> = ({
    formId,
    sessionId,
    onComplete,
}) => {
    const { user, isAuthenticated } = useAuth();
    const [form, setForm] = useState<FormDefinition | null>(null);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<Product | Event>>>({});

    const isGuest = !isAuthenticated || !user;

    useEffect(() => {
        void loadForm();
    }, [formId, sessionId]);

    const loadForm = async () => {
        setLoading(true);
        try {
            const payload = await FormService.getPublicForm(formId, sessionId);
            const f = payload.form;
            setForm(f);

            const opts: Record<string, Array<Product | Event>> = {};
            for (const q of f.questions) {
                if (q.dataSource === DataSource.PRODUCTS) {
                    let products = await DataService.getProducts();
                    if (q.dataSourceFilter && q.dataSourceFilter.length > 0) {
                        products = products.filter((p) => q.dataSourceFilter!.includes(p.id));
                    }
                    opts[q.id] = products;
                } else if (q.dataSource === DataSource.EVENTS) {
                    let events = await DataService.getEvents();
                    if (q.dataSourceFilter && q.dataSourceFilter.length > 0) {
                        events = events.filter((e) => q.dataSourceFilter!.includes(e.id));
                    }
                    opts[q.id] = events;
                }
            }
            setDynamicOptions(opts);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, value: unknown) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        if (isGuest) {
            if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
                alert('Nama, email, dan WhatsApp wajib diisi.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await FormService.submitResponse({
                formId: form.id,
                sessionId,
                answers,
                guestContact: isGuest
                    ? {
                          name: guestName.trim(),
                          email: guestEmail.trim(),
                          phone: guestPhone.trim(),
                      }
                    : undefined,
            });
            setSuccessMessage(result.successMessage || form.successMessage || 'Thank you for your response.');
            setTimeout(() => {
                onComplete?.();
            }, 3000);
        } catch (error) {
            console.error('Submit error', error);
            alert('Failed to submit form.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading form...</div>;
    if (!form || !form.active) {
        return <div className="p-8 text-center text-red-600">Form is not available.</div>;
    }

    if (successMessage) {
        return (
            <div className="max-w-3xl mx-auto mt-20 bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-4">Submitted Successfully</h1>
                <p className="text-slate-600">{successMessage}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-10 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-t-8 border-t-indigo-600 mb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">{form.title}</h1>
                {form.description && <p className="text-slate-600 whitespace-pre-wrap">{form.description}</p>}
                <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">* Required</div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                {isGuest && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Contact Information</h2>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full border-b border-slate-300 py-2 focus:border-indigo-600 focus:outline-none" placeholder="Enter your full name" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                            <input type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full border-b border-slate-300 py-2 focus:border-indigo-600 focus:outline-none" placeholder="Enter your email" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp / Phone <span className="text-red-500">*</span></label>
                            <input type="tel" required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full border-b border-slate-300 py-2 focus:border-indigo-600 focus:outline-none" placeholder="Enter your WhatsApp number" />
                        </div>
                    </div>
                )}

                {form.questions.map((q) => (
                    <div key={q.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <label className="block text-lg font-bold text-slate-800 mb-4">
                            {q.text} {q.required && <span className="text-red-500">*</span>}
                        </label>

                        {q.type === QuestionType.SHORT_ANSWER && (
                            <input
                                type="text"
                                required={q.required}
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className="w-full border-b border-slate-300 py-2 focus:border-indigo-600 focus:outline-none transition-colors"
                                placeholder="Your answer"
                            />
                        )}

                        {q.type === QuestionType.LINEAR_SCALE && q.scaleConfig && (
                            <div className="flex flex-col items-center max-w-xl mx-auto">
                                <div className="flex justify-between w-full mb-2 px-2 text-sm font-bold text-slate-500">
                                    <span>{q.scaleConfig.minLabel || String(q.scaleConfig.min)}</span>
                                    <span>{q.scaleConfig.maxLabel || String(q.scaleConfig.max)}</span>
                                </div>
                                <div className="flex justify-between w-full">
                                    {Array.from({ length: q.scaleConfig.max - q.scaleConfig.min + 1 }).map((_, i) => {
                                        const val = q.scaleConfig!.min + i;
                                        return (
                                            <label key={val} className="flex flex-col items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    required={q.required}
                                                    value={val}
                                                    checked={answers[q.id] === String(val)}
                                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                    className="w-5 h-5 text-indigo-600 mb-2"
                                                />
                                                <span className="text-sm">{val}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.CHECKBOX || q.type === QuestionType.DROPDOWN) && (
                            <div className="space-y-3">
                                {(() => {
                                    let optionsStr: string[] = [];
                                    if (q.dataSource === DataSource.CUSTOM) {
                                        optionsStr = q.options || [];
                                    } else if (q.dataSource === DataSource.PRODUCTS) {
                                        optionsStr = (dynamicOptions[q.id] || []).map((p) => (p as Product).title);
                                    } else if (q.dataSource === DataSource.EVENTS) {
                                        optionsStr = (dynamicOptions[q.id] || []).map((ev) => (ev as Event).name);
                                    }

                                    if (q.type === QuestionType.DROPDOWN) {
                                        return (
                                            <select
                                                required={q.required}
                                                value={String(answers[q.id] ?? '')}
                                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                className="w-full border border-slate-300 rounded p-3 focus:ring-2 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="" disabled>Choose</option>
                                                {optionsStr.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        );
                                    }

                                    return optionsStr.map((opt) => (
                                        <label key={opt} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                            {q.type === QuestionType.MULTIPLE_CHOICE ? (
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    required={q.required && !answers[q.id]}
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    name={q.id}
                                                    value={opt}
                                                    checked={Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)}
                                                    onChange={(e) => {
                                                        const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                                                        if (e.target.checked) {
                                                            handleAnswer(q.id, [...current, opt]);
                                                        } else {
                                                            handleAnswer(q.id, current.filter((x) => x !== opt));
                                                        }
                                                    }}
                                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
                                                />
                                            )}
                                            <span className="text-slate-700">{opt}</span>
                                        </label>
                                    ));
                                })()}
                            </div>
                        )}

                        {q.type === QuestionType.DATE && (
                            <input
                                type="date"
                                required={q.required}
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className="border border-slate-300 rounded p-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        )}
                        {q.type === QuestionType.TIME && (
                            <input
                                type="time"
                                required={q.required}
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className="border border-slate-300 rounded p-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        )}
                    </div>
                ))}

                <div className="flex justify-between items-center pt-6">
                    <button type="button" onClick={() => setAnswers({})} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Clear Form</button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormResponderPage;
