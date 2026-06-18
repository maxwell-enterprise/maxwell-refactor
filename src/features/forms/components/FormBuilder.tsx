import React, { useState, useEffect } from 'react';
import { FormDefinition, Question, QuestionType, DataSource } from '../types';
import {
    Plus,
    Trash2,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    Type,
    CircleDot,
    CheckSquare,
    ChevronDown as DropdownIcon,
    SlidersHorizontal,
    Calendar,
    Clock,
    GripVertical,
    ClipboardList,
    Sparkles,
    MessageSquare,
} from 'lucide-react';
import { DataService } from '@/services/dataService';

interface FormBuilderProps {
    form: FormDefinition;
    onSave: (form: FormDefinition) => void;
    onCancel: () => void;
}

const QUESTION_TYPE_META: Record<
    QuestionType,
    { label: string; description: string; icon: React.ReactNode }
> = {
    [QuestionType.SHORT_ANSWER]: {
        label: 'Short Answer',
        description: 'Free text response',
        icon: <Type size={18} />,
    },
    [QuestionType.MULTIPLE_CHOICE]: {
        label: 'Multiple Choice',
        description: 'Pick one option',
        icon: <CircleDot size={18} />,
    },
    [QuestionType.CHECKBOX]: {
        label: 'Checkboxes',
        description: 'Select multiple options',
        icon: <CheckSquare size={18} />,
    },
    [QuestionType.DROPDOWN]: {
        label: 'Dropdown',
        description: 'Choose from a list',
        icon: <DropdownIcon size={18} />,
    },
    [QuestionType.LINEAR_SCALE]: {
        label: 'Linear Scale',
        description: 'Rating scale (e.g. 1–5)',
        icon: <SlidersHorizontal size={18} />,
    },
    [QuestionType.DATE]: {
        label: 'Date',
        description: 'Date picker',
        icon: <Calendar size={18} />,
    },
    [QuestionType.TIME]: {
        label: 'Time',
        description: 'Time picker',
        icon: <Clock size={18} />,
    },
};

const FormBuilder: React.FC<FormBuilderProps> = ({ form: initialForm, onSave, onCancel }) => {
    const [form, setForm] = useState<FormDefinition>(initialForm);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState<Record<string, { id: string; name?: string; title?: string }[]>>({});

    useEffect(() => {
        void loadDynamicOptions();
    }, []);

    const loadDynamicOptions = async () => {
        const products = await DataService.getProducts();
        const events = await DataService.getEvents();
        setDynamicOptions({
            [DataSource.PRODUCTS]: products,
            [DataSource.EVENTS]: events,
        });
    };

    const addQuestion = (type: QuestionType) => {
        const newQuestion: Question = {
            id: `q_${Date.now()}`,
            type,
            text: 'New Question',
            required: false,
            options:
                type === QuestionType.MULTIPLE_CHOICE ||
                type === QuestionType.CHECKBOX ||
                type === QuestionType.DROPDOWN
                    ? ['Option 1']
                    : undefined,
            dataSource: DataSource.CUSTOM,
            correctAnswer: type === QuestionType.CHECKBOX ? [] : '',
            points: form.isQuiz ? 10 : 0,
        };
        setForm({ ...form, questions: [...form.questions, newQuestion] });
        setShowAddMenu(false);
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setForm({
            ...form,
            questions: form.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
        });
    };

    const removeQuestion = (id: string) => {
        setForm({ ...form, questions: form.questions.filter((q) => q.id !== id) });
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        const newQuestions = [...form.questions];
        if (direction === 'up' && index > 0) {
            [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
        } else if (direction === 'down' && index < newQuestions.length - 1) {
            [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]];
        }
        setForm({ ...form, questions: newQuestions });
    };

    const isNewForm = !initialForm.questions.length && initialForm.title === 'Untitled Form';

    return (
        <div className="page-container animate-fade-in relative min-w-0 pb-24">
            {/* Toolbar */}
            <div className="sticky top-0 z-20 -mx-3 mb-6 border-b border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Back to list"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                {isNewForm ? 'New Form' : 'Edit Form'}
                            </p>
                            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                                {form.title || 'Untitled Form'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => onSave(form)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:flex-none"
                        >
                            <Save size={16} />
                            Save Form
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                {/* Main builder */}
                <div className="space-y-5 lg:col-span-2">
                    {/* Form header card */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500" />
                        <div className="space-y-4 p-5 sm:p-6">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Form Title
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-2xl"
                                    placeholder="e.g. Post-Event Survey"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Description
                                </label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                    placeholder="Brief instructions for respondents..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Questions */}
                    {form.questions.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <ClipboardList size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No questions yet</h3>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                Add your first question below. You can mix surveys, feedback forms, or scored quizzes.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {form.questions.map((q, index) => (
                                <QuestionEditor
                                    key={q.id}
                                    index={index}
                                    question={q}
                                    isQuiz={form.isQuiz}
                                    onChange={(updates) => updateQuestion(q.id, updates)}
                                    onRemove={() => removeQuestion(q.id)}
                                    onMoveUp={index > 0 ? () => moveQuestion(index, 'up') : undefined}
                                    onMoveDown={
                                        index < form.questions.length - 1
                                            ? () => moveQuestion(index, 'down')
                                            : undefined
                                    }
                                    dynamicOptions={dynamicOptions}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add question */}
                    <div className="flex flex-col items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                        >
                            {showAddMenu ? <X size={20} /> : <Plus size={20} />}
                            {showAddMenu ? 'Close' : 'Add Question'}
                        </button>

                        {showAddMenu && (
                            <div className="grid w-full max-w-2xl grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:grid-cols-2">
                                {Object.values(QuestionType).map((type) => {
                                    const meta = QUESTION_TYPE_META[type];
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => addQuestion(type)}
                                            className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                                        >
                                            <span className="mt-0.5 shrink-0 text-blue-600">{meta.icon}</span>
                                            <span>
                                                <span className="block text-sm font-bold text-slate-800">
                                                    {meta.label}
                                                </span>
                                                <span className="block text-xs text-slate-500">
                                                    {meta.description}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings sidebar */}
                <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Sparkles size={16} className="text-indigo-600" />
                            Form Settings
                        </h3>

                        <div className="space-y-3">
                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-purple-200 hover:bg-purple-50/50">
                                <input
                                    type="checkbox"
                                    checked={form.isQuiz}
                                    onChange={(e) => setForm({ ...form, isQuiz: e.target.checked })}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-800">
                                        Quiz mode
                                    </span>
                                    <span className="block text-xs text-slate-500">
                                        Enable scoring and correct answers
                                    </span>
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-green-200 hover:bg-green-50/50">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-800">
                                        Accepting responses
                                    </span>
                                    <span className="block text-xs text-slate-500">
                                        Turn off to pause submissions
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <MessageSquare size={16} className="text-blue-600" />
                            Success Message
                        </h3>
                        <textarea
                            value={form.successMessage || ''}
                            onChange={(e) => setForm({ ...form, successMessage: e.target.value })}
                            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            placeholder="Thank you! Your response has been recorded."
                            rows={3}
                        />
                        <p className="mt-2 text-xs text-slate-400">
                            Shown after a successful submission.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                        <p className="font-bold text-slate-600">Summary</p>
                        <ul className="mt-2 space-y-1">
                            <li>{form.questions.length} question{form.questions.length !== 1 ? 's' : ''}</li>
                            <li>{form.isQuiz ? 'Quiz with scoring' : 'Standard form'}</li>
                            <li>{form.active ? 'Open for responses' : 'Paused'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuestionEditor: React.FC<{
    index: number;
    question: Question;
    isQuiz: boolean;
    onChange: (updates: Partial<Question>) => void;
    onRemove: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    dynamicOptions: Record<string, { id: string; name?: string; title?: string }[]>;
}> = ({ index, question, isQuiz, onChange, onRemove, onMoveUp, onMoveDown, dynamicOptions }) => {
    const typeMeta = QUESTION_TYPE_META[question.type];

    const handleOptionChange = (idx: number, val: string) => {
        const newOps = [...(question.options || [])];
        newOps[idx] = val;
        onChange({ options: newOps });
    };

    const addOption = () => {
        onChange({ options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
    };

    const removeOption = (idx: number) => {
        onChange({ options: question.options?.filter((_, i) => i !== idx) });
    };

    const toggleDataSourceFilter = (id: string) => {
        const currentDataFilters = question.dataSourceFilter || [];
        if (currentDataFilters.includes(id)) {
            onChange({ dataSourceFilter: currentDataFilters.filter((val) => val !== id) });
        } else {
            onChange({ dataSourceFilter: [...currentDataFilters, id] });
        }
    };

    const getAvailableOptions = () => {
        if (question.type === QuestionType.SHORT_ANSWER || question.type === QuestionType.LINEAR_SCALE) {
            return [];
        }
        if (question.dataSource === DataSource.CUSTOM) return question.options || [];

        const rawItems = dynamicOptions[question.dataSource || ''] || [];
        const filteredItems =
            question.dataSourceFilter && question.dataSourceFilter.length > 0
                ? rawItems.filter((i) => question.dataSourceFilter!.includes(i.id))
                : rawItems;

        if (question.dataSource === DataSource.PRODUCTS) {
            return filteredItems.map((i) => i.title || 'Unnamed');
        }
        if (question.dataSource === DataSource.EVENTS) {
            return filteredItems.map((i) => i.name || 'Unnamed');
        }
        return [];
    };

    const availableOptions = getAvailableOptions();

    return (
        <div className="group relative rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {index + 1}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {typeMeta.icon}
                        {typeMeta.label}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {onMoveUp && (
                        <button
                            type="button"
                            onClick={onMoveUp}
                            className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-blue-600"
                            title="Move up"
                        >
                            <ChevronUp size={16} />
                        </button>
                    )}
                    {onMoveDown && (
                        <button
                            type="button"
                            onClick={onMoveDown}
                            className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-blue-600"
                            title="Move down"
                        >
                            <ChevronDown size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete question"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
                <div className="flex gap-3">
                    <GripVertical size={18} className="mt-3 hidden shrink-0 text-slate-300 sm:block" />
                    <input
                        type="text"
                        value={question.text}
                        onChange={(e) => onChange({ text: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Question text"
                    />
                </div>

                {(question.type === QuestionType.MULTIPLE_CHOICE ||
                    question.type === QuestionType.CHECKBOX ||
                    question.type === QuestionType.DROPDOWN) && (
                    <div className="ml-0 space-y-3 border-l-2 border-slate-100 pl-4 sm:ml-7">
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="text-xs font-bold uppercase text-slate-500">Options from</label>
                            <select
                                value={question.dataSource}
                                onChange={(e) => onChange({ dataSource: e.target.value as DataSource })}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                            >
                                <option value={DataSource.CUSTOM}>Custom list</option>
                                <option value={DataSource.PRODUCTS}>Products (database)</option>
                                <option value={DataSource.EVENTS}>Events (database)</option>
                            </select>
                        </div>

                        {question.dataSource === DataSource.CUSTOM &&
                            question.options?.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        className="flex-1 rounded border border-transparent bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(idx)}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        {question.dataSource === DataSource.CUSTOM && (
                            <button
                                type="button"
                                onClick={addOption}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                            >
                                <Plus size={14} /> Add option
                            </button>
                        )}
                        {question.dataSource !== DataSource.CUSTOM && (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">
                                    Select items to include (leave empty for all)
                                </p>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                                    {(dynamicOptions[question.dataSource || ''] || []).length === 0 ? (
                                        <p className="p-2 text-xs italic text-slate-400">No items in database.</p>
                                    ) : (
                                        (dynamicOptions[question.dataSource || ''] || []).map((item) => (
                                            <label
                                                key={item.id}
                                                className="flex cursor-pointer items-center gap-2 rounded p-2 transition hover:bg-white"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={(question.dataSourceFilter || []).includes(item.id)}
                                                    onChange={() => toggleDataSourceFilter(item.id)}
                                                    className="h-4 w-4 rounded text-blue-600"
                                                />
                                                <span className="text-sm text-slate-700">
                                                    {item.name || item.title || 'Unnamed'}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {question.type === QuestionType.SHORT_ANSWER && (
                    <div className="ml-0 border-b border-dashed border-slate-200 py-2 text-sm text-slate-400 sm:ml-7">
                        Short answer preview
                    </div>
                )}

                {(question.type === QuestionType.DATE || question.type === QuestionType.TIME) && (
                    <div className="ml-0 text-sm text-slate-400 sm:ml-7">
                        {question.type === QuestionType.DATE ? 'Date picker' : 'Time picker'} — shown to respondents
                    </div>
                )}

                {question.type === QuestionType.LINEAR_SCALE && (
                    <div className="ml-0 flex flex-wrap items-center gap-3 sm:ml-7">
                        <input
                            type="number"
                            min="0"
                            max="1"
                            value={question.scaleConfig?.min || 1}
                            onChange={(e) =>
                                onChange({
                                    scaleConfig: {
                                        min: parseInt(e.target.value, 10),
                                        max: question.scaleConfig?.max ?? 5,
                                        minLabel: question.scaleConfig?.minLabel,
                                        maxLabel: question.scaleConfig?.maxLabel,
                                    },
                                })
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                        <span className="text-sm text-slate-500">to</span>
                        <input
                            type="number"
                            min="2"
                            max="10"
                            value={question.scaleConfig?.max || 5}
                            onChange={(e) =>
                                onChange({
                                    scaleConfig: {
                                        min: question.scaleConfig?.min ?? 1,
                                        max: parseInt(e.target.value, 10),
                                        minLabel: question.scaleConfig?.minLabel,
                                        maxLabel: question.scaleConfig?.maxLabel,
                                    },
                                })
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Min label"
                            value={question.scaleConfig?.minLabel || ''}
                            onChange={(e) =>
                                onChange({
                                    scaleConfig: {
                                        min: question.scaleConfig?.min ?? 1,
                                        max: question.scaleConfig?.max ?? 5,
                                        minLabel: e.target.value,
                                        maxLabel: question.scaleConfig?.maxLabel,
                                    },
                                })
                            }
                            className="border-b border-slate-200 text-sm outline-none focus:border-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Max label"
                            value={question.scaleConfig?.maxLabel || ''}
                            onChange={(e) =>
                                onChange({
                                    scaleConfig: {
                                        min: question.scaleConfig?.min ?? 1,
                                        max: question.scaleConfig?.max ?? 5,
                                        minLabel: question.scaleConfig?.minLabel,
                                        maxLabel: e.target.value,
                                    },
                                })
                            }
                            className="border-b border-slate-200 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => onChange({ required: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Required
                    </label>

                    {isQuiz && (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
                            <span className="text-xs font-bold uppercase text-purple-700">Correct</span>
                            {question.type === QuestionType.SHORT_ANSWER ? (
                                <input
                                    type="text"
                                    value={
                                        typeof question.correctAnswer === 'string'
                                            ? question.correctAnswer
                                            : question.correctAnswer?.join(',') || ''
                                    }
                                    onChange={(e) => onChange({ correctAnswer: e.target.value })}
                                    className="w-40 rounded border border-purple-200 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="Exact answer"
                                />
                            ) : question.type === QuestionType.LINEAR_SCALE ? (
                                <input
                                    type="number"
                                    value={(question.correctAnswer as unknown as number) || ''}
                                    onChange={(e) => onChange({ correctAnswer: e.target.value })}
                                    className="w-20 rounded border border-purple-200 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            ) : availableOptions.length > 0 ? (
                                question.type === QuestionType.CHECKBOX ? (
                                    <div className="flex max-h-16 max-w-[240px] flex-wrap gap-2 overflow-y-auto">
                                        {availableOptions.map((opt) => {
                                            const isChecked = Array.isArray(question.correctAnswer)
                                                ? question.correctAnswer.includes(opt)
                                                : question.correctAnswer === opt;
                                            return (
                                                <label
                                                    key={opt}
                                                    className="flex cursor-pointer items-center gap-1 text-xs"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            let current = Array.isArray(question.correctAnswer)
                                                                ? question.correctAnswer
                                                                : question.correctAnswer
                                                                  ? [question.correctAnswer]
                                                                  : [];
                                                            if (e.target.checked) current = [...current, opt];
                                                            else current = current.filter((c: string) => c !== opt);
                                                            onChange({ correctAnswer: current });
                                                        }}
                                                        className="h-3 w-3 rounded text-purple-600"
                                                    />
                                                    <span className="max-w-[80px] truncate" title={opt}>
                                                        {opt}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <select
                                        value={
                                            typeof question.correctAnswer === 'string'
                                                ? question.correctAnswer
                                                : ''
                                        }
                                        onChange={(e) => onChange({ correctAnswer: e.target.value })}
                                        className="max-w-[200px] truncate rounded border border-purple-200 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        <option value="" disabled>
                                            Select answer
                                        </option>
                                        {availableOptions.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                )
                            ) : (
                                <span className="text-xs italic text-purple-400">Set options first</span>
                            )}
                            <span className="text-xs font-bold uppercase text-purple-700">Pts</span>
                            <input
                                type="number"
                                value={question.points || 0}
                                onChange={(e) => onChange({ points: parseInt(e.target.value, 10) || 0 })}
                                className="w-14 rounded border border-purple-200 bg-white px-2 py-1 text-center text-sm outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormBuilder;
