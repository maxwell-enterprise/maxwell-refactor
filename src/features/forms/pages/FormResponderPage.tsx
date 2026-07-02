'use client';

import React, { useState, useEffect } from 'react';
import { FormDefinition, QuestionType, DataSource } from '../types';
import { FormService } from '@/services/formService';
import { DataService } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { ApiRequestError } from '@/repositories/api/apiClient';
import {
    GUEST_PHONE_MIN_LENGTH,
    validateGuestContact,
    mapApiGuestContactErrors,
    type GuestFieldErrors,
} from '../guestContactValidation';
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
    const { alert } = useDialog();
    const [form, setForm] = useState<FormDefinition | null>(null);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestErrors, setGuestErrors] = useState<GuestFieldErrors>({});
    const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

    const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<Product | Event>>>({});
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sessionWarning, setSessionWarning] = useState<string | null>(null);

    const isGuest = !isAuthenticated || !user;

    const buildSubmitContact = () => {
        if (isGuest) {
            return {
                name: guestName.trim(),
                email: guestEmail.trim() || undefined,
                phone: guestPhone.trim(),
            };
        }
        if (!user) return undefined;
        const name = user.fullName?.trim() || user.email?.split('@')[0] || 'User';
        const email = user.email?.trim() || undefined;
        const phone = user.phone?.trim() || undefined;
        return { name, email, phone };
    };

    useEffect(() => {
        void loadForm();
    }, [formId, sessionId]);

    const loadForm = async () => {
        setLoading(true);
        setLoadError(null);
        setSessionWarning(null);
        try {
            const payload = await FormService.getPublicForm(formId, sessionId);
            const f = payload.form;
            if (!f.active) {
                setLoadError('Form ini tidak menerima respons saat ini.');
                setForm(null);
                return;
            }
            setForm(f);
            setSessionWarning(payload.sessionWarning ?? null);

            const opts: Record<string, Array<Product | Event>> = {};
            for (const q of f.questions) {
                try {
                    if (q.dataSource === DataSource.PRODUCTS) {
                        let products = await DataService.getProducts();
                        if (q.dataSourceFilter && q.dataSourceFilter.length > 0) {
                            products = products.filter((p) =>
                                q.dataSourceFilter!.includes(p.id),
                            );
                        }
                        opts[q.id] = products;
                    } else if (q.dataSource === DataSource.EVENTS) {
                        let events = await DataService.getEvents();
                        if (q.dataSourceFilter && q.dataSourceFilter.length > 0) {
                            events = events.filter((e) =>
                                q.dataSourceFilter!.includes(e.id),
                            );
                        }
                        opts[q.id] = events;
                    }
                } catch (err) {
                    console.warn(`Form question ${q.id} options failed to load`, err);
                    opts[q.id] = [];
                }
            }
            setDynamicOptions(opts);

            if (payload.respondentContact) {
                const c = payload.respondentContact;
                if (c.name) setGuestName(c.name);
                if (c.email) setGuestEmail(c.email);
                if (c.phone) setGuestPhone(c.phone);
            }
        } catch (error) {
            console.error('Load form error', error);
            setForm(null);
            if (error instanceof ApiRequestError) {
                if (error.status === 404) {
                    setLoadError('Form tidak ditemukan atau sudah tidak tersedia.');
                } else if (error.status === 429) {
                    setLoadError('Terlalu banyak permintaan. Coba lagi dalam satu menit.');
                } else {
                    setLoadError(error.message);
                }
            } else {
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : 'Gagal memuat form. Periksa koneksi Anda.',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, value: unknown) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        setQuestionErrors((prev) => {
            if (!prev[questionId]) return prev;
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    };

    const isAnswerEmpty = (value: unknown): boolean => {
        if (value === undefined || value === null) return true;
        if (typeof value === 'string') return !value.trim();
        if (Array.isArray(value)) return value.length === 0;
        return false;
    };

    const validateRequiredQuestions = (): Record<string, string> => {
        if (!form) return {};
        const errors: Record<string, string> = {};
        for (const q of form.questions) {
            if (!q.required) continue;
            if (isAnswerEmpty(answers[q.id])) {
                errors[q.id] = 'Pertanyaan ini wajib dijawab.';
            }
        }
        return errors;
    };

    const showValidationDialog = async (title: string, message: React.ReactNode) => {
        await alert({
            title,
            message,
            variant: 'warning',
            confirmLabel: 'Mengerti',
        });
    };

    const applyWorkspaceContactMatch = async (input: {
        phone?: string;
        email?: string;
    }) => {
        const phone = input.phone?.trim() ?? '';
        const email = input.email?.trim() ?? '';
        if (!phone && !email) return;
        if (phone && phone.length < GUEST_PHONE_MIN_LENGTH && !email) return;
        try {
            const hit = await FormService.lookupRespondentContact({
                phone: phone || undefined,
                email: email || undefined,
            });
            if (!hit.matched) return;
            if (hit.name) setGuestName(hit.name);
            if (hit.email) setGuestEmail(hit.email);
            if (hit.phone) setGuestPhone(hit.phone);
        } catch {
            // lookup is best-effort; guest can still submit manually
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        const nextGuestErrors = isGuest
            ? validateGuestContact({
                  name: guestName,
                  email: guestEmail,
                  phone: guestPhone,
              })
            : {};
        const nextQuestionErrors = validateRequiredQuestions();

        setGuestErrors(nextGuestErrors);
        setQuestionErrors(nextQuestionErrors);

        const guestErrorCount = Object.keys(nextGuestErrors).length;
        const questionErrorCount = Object.keys(nextQuestionErrors).length;

        if (guestErrorCount > 0 || questionErrorCount > 0) {
            const lines: string[] = [];
            if (nextGuestErrors.name) lines.push(nextGuestErrors.name);
            if (nextGuestErrors.email) lines.push(nextGuestErrors.email);
            if (nextGuestErrors.phone) lines.push(nextGuestErrors.phone);
            if (questionErrorCount > 0) {
                lines.push(`${questionErrorCount} pertanyaan wajib belum dijawab.`);
            }

            await showValidationDialog(
                'Form belum lengkap',
                <div className="space-y-2">
                    <p>Periksa kembali data berikut sebelum mengirim:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        {lines.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                </div>,
            );
            return;
        }

        setSubmitting(true);
        try {
            const contact = buildSubmitContact();
            const result = await FormService.submitResponse({
                formId: form.id,
                sessionId,
                answers,
                guestContact: contact,
            });
            setSuccessMessage(result.successMessage || form.successMessage || 'Thank you for your response.');
            if (result.sessionWarning) {
                setSessionWarning(result.sessionWarning);
            }
            setTimeout(() => {
                onComplete?.();
            }, 3000);
        } catch (error) {
            console.error('Submit error', error);

            if (error instanceof ApiRequestError) {
                const apiGuestErrors = mapApiGuestContactErrors(error.message);
                if (Object.keys(apiGuestErrors).length > 0) {
                    setGuestErrors(apiGuestErrors);
                    await showValidationDialog(
                        'Data kontak tidak valid',
                        <div className="space-y-2">
                            <p>Mohon perbaiki informasi kontak Anda:</p>
                            <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                {apiGuestErrors.name ? <li>{apiGuestErrors.name}</li> : null}
                                {apiGuestErrors.email ? <li>{apiGuestErrors.email}</li> : null}
                                {apiGuestErrors.phone ? <li>{apiGuestErrors.phone}</li> : null}
                            </ul>
                        </div>,
                    );
                    return;
                }

                if (
                    error.message.includes('answers.') ||
                    error.message.toLowerCase().includes('required')
                ) {
                    const nextQuestionErrors = validateRequiredQuestions();
                    if (Object.keys(nextQuestionErrors).length > 0) {
                        setQuestionErrors(nextQuestionErrors);
                    }
                }
            }

            const fallbackMessage =
                error instanceof ApiRequestError
                    ? error.message
                    : 'Gagal mengirim form. Silakan coba lagi.';

            await showValidationDialog('Gagal mengirim form', fallbackMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const guestInputClass = (field: keyof GuestFieldErrors) =>
        `w-full border-b py-2 focus:outline-none transition-colors ${
            guestErrors[field]
                ? 'border-red-400 focus:border-red-500'
                : 'border-slate-300 focus:border-indigo-600'
        }`;

    if (loading) return <div className="p-8 text-center">Loading form...</div>;
    if (loadError || !form || !form.active) {
        return (
            <div className="p-8 text-center text-red-600 max-w-lg mx-auto">
                {loadError || 'Form is not available.'}
            </div>
        );
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
                {sessionWarning ? (
                    <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {sessionWarning}
                    </p>
                ) : null}
                <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">* Required</div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
                {isGuest && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 border-b pb-2 mb-4">Contact Information</h2>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={(e) => {
                                    setGuestName(e.target.value);
                                    if (guestErrors.name) {
                                        setGuestErrors((prev) => ({ ...prev, name: undefined }));
                                    }
                                }}
                                className={guestInputClass('name')}
                                placeholder="Enter your full name"
                                aria-invalid={Boolean(guestErrors.name)}
                            />
                            {guestErrors.name ? (
                                <p className="mt-1 text-xs font-medium text-red-600">{guestErrors.name}</p>
                            ) : null}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={guestEmail}
                                onChange={(e) => {
                                    setGuestEmail(e.target.value);
                                    if (guestErrors.email) {
                                        setGuestErrors((prev) => ({ ...prev, email: undefined }));
                                    }
                                }}
                                className={guestInputClass('email')}
                                placeholder="Enter your email (optional)"
                                onBlur={() => {
                                    void applyWorkspaceContactMatch({
                                        phone: guestPhone,
                                        email: guestEmail,
                                    });
                                }}
                                aria-invalid={Boolean(guestErrors.email)}
                            />
                            {guestErrors.email ? (
                                <p className="mt-1 text-xs font-medium text-red-600">{guestErrors.email}</p>
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">Opsional — isi jika ingin menerima update via email.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp / Phone <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                value={guestPhone}
                                onChange={(e) => {
                                    setGuestPhone(e.target.value);
                                    if (guestErrors.phone) {
                                        setGuestErrors((prev) => ({ ...prev, phone: undefined }));
                                    }
                                }}
                                className={guestInputClass('phone')}
                                placeholder="Contoh: 08123456789"
                                onBlur={() => {
                                    void applyWorkspaceContactMatch({ phone: guestPhone });
                                }}
                                aria-invalid={Boolean(guestErrors.phone)}
                            />
                            {guestErrors.phone ? (
                                <p className="mt-1 text-xs font-medium text-red-600">{guestErrors.phone}</p>
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">
                                    Wajib diisi. Minimal {GUEST_PHONE_MIN_LENGTH} karakter.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {form.questions.map((q) => (
                    <div
                        key={q.id}
                        className={`bg-white p-8 rounded-2xl shadow-sm border ${
                            questionErrors[q.id] ? 'border-red-300' : 'border-slate-200'
                        }`}
                    >
                        <label className="block text-lg font-bold text-slate-800 mb-4">
                            {q.text} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        {questionErrors[q.id] ? (
                            <p className="mb-3 text-xs font-medium text-red-600">{questionErrors[q.id]}</p>
                        ) : null}

                        {q.type === QuestionType.SHORT_ANSWER && (
                            <input
                                type="text"
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className={`w-full border-b py-2 focus:outline-none transition-colors ${
                                    questionErrors[q.id]
                                        ? 'border-red-400 focus:border-red-500'
                                        : 'border-slate-300 focus:border-indigo-600'
                                }`}
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
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className="border border-slate-300 rounded p-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        )}
                        {q.type === QuestionType.TIME && (
                            <input
                                type="time"
                                value={String(answers[q.id] ?? '')}
                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                className="border border-slate-300 rounded p-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        )}
                    </div>
                ))}

                <div className="flex justify-between items-center pt-6">
                    <button type="button" onClick={() => { setAnswers({}); setQuestionErrors({}); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Clear Form</button>
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
