'use client';

import React, { useState, useEffect } from 'react';
import { FormDefinition, FormSession } from '../types';
import { FormService, buildFormDeploymentUrl } from '@/services/formService';
import { DataService } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
    Plus,
    Edit,
    Trash2,
    QrCode,
    BarChart2,
    ClipboardList,
    X,
    FileText,
    HelpCircle,
    Loader2,
} from 'lucide-react';
import FormBuilder from '../components/FormBuilder';
import FormReportsPage from './FormReportsPage';
import QRCodeDisplay from '@/components/common/QRCodeDisplay';
import type { Event } from '@/types/index';

const AdminFormsPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'BUILDER' | 'REPORTS'>('LIST');
    const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
    const [reportingFormId, setReportingFormId] = useState<string | null>(null);

    const [qrForm, setQrForm] = useState<FormDefinition | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionEventId, setNewSessionEventId] = useState('');
    const [addingSession, setAddingSession] = useState(false);

    const [sortField, setSortField] = useState<'title' | 'isQuiz' | 'questions' | 'active' | 'createdAt'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        void loadForms();
        void DataService.getEvents().then(setEvents);
    }, []);

    const loadForms = async () => {
        setLoading(true);
        try {
            const loadedForms = await FormService.getForms();
            setForms(loadedForms || []);
        } catch {
            showToast('Failed to load forms', 'error');
        } finally {
            setLoading(false);
        }
    };

    const refreshQrForm = async (formId: string) => {
        const fresh = await FormService.getFormById(formId);
        if (fresh) setQrForm(fresh);
    };

    const handleSort = (field: 'title' | 'isQuiz' | 'questions' | 'active' | 'createdAt') => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const sortedForms = [...forms].sort((a, b) => {
        let valA: string | number | boolean = a[sortField];
        let valB: string | number | boolean = b[sortField];

        if (sortField === 'questions') {
            valA = a.questions.length;
            valB = b.questions.length;
        } else if (sortField === 'createdAt') {
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleCreateForm = () => {
        setEditingForm({
            id: `FRM-${Date.now()}`,
            title: 'Untitled Form',
            isQuiz: false,
            questions: [],
            sessions: [],
            createdAt: new Date().toISOString(),
            createdBy: user?.id || 'system',
            active: true,
        });
        setView('BUILDER');
    };

    const handleEditForm = (form: FormDefinition) => {
        setEditingForm(form);
        setView('BUILDER');
    };

    const handleDeleteForm = async (id: string) => {
        if (!confirm('Delete this form and all its responses?')) return;
        try {
            await FormService.deleteForm(id);
            showToast('Form deleted', 'success');
            await loadForms();
        } catch {
            showToast('Failed to delete form', 'error');
        }
    };

    const handleSaveForm = async (form: FormDefinition) => {
        try {
            await FormService.updateForm(form);
            showToast('Form saved', 'success');
            setEditingForm(null);
            setView('LIST');
            await loadForms();
        } catch {
            showToast('Failed to save form', 'error');
        }
    };

    const handleAddSession = async () => {
        if (!qrForm || !newSessionName.trim()) return;
        setAddingSession(true);
        try {
            await FormService.addDeployment(qrForm.id, {
                name: newSessionName.trim(),
                eventId: newSessionEventId || undefined,
            });
            await refreshQrForm(qrForm.id);
            await loadForms();
            setNewSessionName('');
            setNewSessionEventId('');
            showToast('Deployment created', 'success');
        } catch {
            showToast('Failed to create deployment', 'error');
        } finally {
            setAddingSession(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!qrForm) return;
        if (!confirm('Delete this deployment?')) return;
        try {
            await FormService.deleteDeployment(qrForm.id, sessionId);
            await refreshQrForm(qrForm.id);
            await loadForms();
            showToast('Deployment removed', 'info');
        } catch {
            showToast('Failed to delete deployment', 'error');
        }
    };

    if (view === 'REPORTS' && reportingFormId) {
        return (
            <FormReportsPage
                formId={reportingFormId}
                onBack={() => {
                    setView('LIST');
                    setReportingFormId(null);
                }}
            />
        );
    }

    if (view === 'BUILDER' && editingForm) {
        return (
            <FormBuilder
                form={editingForm}
                onSave={handleSaveForm}
                onCancel={() => setView('LIST')}
            />
        );
    }

    return (
        <div className="page-container animate-fade-in relative min-w-0 space-y-5 pb-8 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:gap-3 sm:text-2xl">
                        <ClipboardList size={26} className="shrink-0 text-indigo-600" />
                        <span className="leading-tight">Forms & Quizzes</span>
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 sm:text-base">
                        Build surveys, feedback forms, and scored quizzes. Deploy via QR for events.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleCreateForm}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                >
                    <Plus size={18} />
                    Create Form
                </button>
            </div>

            <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin" />
                        Loading forms...
                    </div>
                ) : sortedForms.length === 0 ? (
                    <div className="p-12 text-center sm:p-16">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No forms yet</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Create your first form or quiz, then add deployments with QR codes for each event session.
                        </p>
                        <button
                            type="button"
                            onClick={handleCreateForm}
                            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            Create Form
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-scroll-touch">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th
                                        className="cursor-pointer px-5 py-3.5 font-bold hover:bg-slate-100"
                                        onClick={() => handleSort('title')}
                                    >
                                        Title {sortField === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="cursor-pointer px-5 py-3.5 font-bold hover:bg-slate-100"
                                        onClick={() => handleSort('isQuiz')}
                                    >
                                        Type {sortField === 'isQuiz' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="cursor-pointer px-5 py-3.5 font-bold hover:bg-slate-100"
                                        onClick={() => handleSort('questions')}
                                    >
                                        Questions {sortField === 'questions' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="cursor-pointer px-5 py-3.5 font-bold hover:bg-slate-100"
                                        onClick={() => handleSort('active')}
                                    >
                                        Status {sortField === 'active' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="cursor-pointer px-5 py-3.5 font-bold hover:bg-slate-100"
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        Created {sortField === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-5 py-3.5 text-right font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedForms.map((form) => (
                                    <tr key={form.id} className="transition hover:bg-slate-50/80">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-800">{form.title}</div>
                                            <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                                                {form.description || 'No description'}
                                            </div>
                                            <div className="mt-1 text-[10px] font-mono text-slate-400">{form.id}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                                                    form.isQuiz
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {form.isQuiz ? (
                                                    <HelpCircle size={12} />
                                                ) : (
                                                    <FileText size={12} />
                                                )}
                                                {form.isQuiz ? 'Quiz' : 'Form'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-medium text-slate-600">
                                            {form.questions.length}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                                                    form.active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        form.active ? 'bg-green-500' : 'bg-slate-400'
                                                    }`}
                                                />
                                                {form.active ? 'Active' : 'Paused'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {new Date(form.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setQrForm(form)}
                                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                    title="Deployments & QR"
                                                >
                                                    <QrCode size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReportingFormId(form.id);
                                                        setView('REPORTS');
                                                    }}
                                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                    title="Reports"
                                                >
                                                    <BarChart2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditForm(form)}
                                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteForm(form.id)}
                                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {qrForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Deployments
                                </p>
                                <h3 className="truncate text-lg font-bold text-slate-900">{qrForm.title}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrForm(null)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="shrink-0 border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
                            <p className="mb-3 text-xs text-slate-500">
                                Each deployment gets a unique QR link. Link an event to track participation against
                                attendees.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                        Session name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Workshop Batch 1"
                                        value={newSessionName}
                                        onChange={(e) => setNewSessionName(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                        Linked event (optional)
                                    </label>
                                    <select
                                        value={newSessionEventId}
                                        onChange={(e) => setNewSessionEventId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="">No linked event</option>
                                        {events.map((ev) => (
                                            <option key={ev.id} value={ev.id}>
                                                {ev.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleAddSession()}
                                    disabled={!newSessionName.trim() || addingSession}
                                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {addingSession ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                            {!qrForm.sessions || qrForm.sessions.length === 0 ? (
                                <div className="py-12 text-center text-sm italic text-slate-400">
                                    No deployments yet. Create one above to generate a QR code.
                                </div>
                            ) : (
                                qrForm.sessions.map((s: FormSession) => {
                                    const url = buildFormDeploymentUrl(qrForm.id, s.id);
                                    const linkedEvent = events.find((ev) => ev.id === s.eventId);
                                    const fileLabel = `${qrForm.title}-${s.name}`;
                                    return (
                                        <div
                                            key={s.id}
                                            className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 sm:flex-row sm:items-start"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteSession(s.id)}
                                                className="absolute right-2 top-2 rounded p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                                title="Delete deployment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <QRCodeDisplay
                                                data={url}
                                                size={96}
                                                downloadFileName={fileLabel}
                                                downloadLabel="Download QR"
                                            />
                                            <div className="min-w-0 flex-1 pr-8">
                                                <h4 className="font-bold text-slate-800">{s.name}</h4>
                                                {linkedEvent && (
                                                    <p className="mt-0.5 text-xs font-medium text-indigo-600">
                                                        Event: {linkedEvent.name}
                                                    </p>
                                                )}
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={url}
                                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFormsPage;
