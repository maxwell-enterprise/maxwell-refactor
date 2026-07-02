
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Bell, Camera, Save, LogOut, Trash2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { UserNotificationPreferencesService } from '../../services/userNotificationPreferencesService';
import { workspaceFetch } from '../../lib/workspaceApi';
import { UserRole } from '../../types/index';
import { useAccountDeletionRealtime } from '../../hooks/useAccountDeletionRealtime';
import {
  formatIndonesianPhoneInput,
  hasIndonesianPhoneNumber,
} from '../../lib/indonesianPhone';
import {
  capitalizeProfileWords,
  type ProfileCapitalizeField,
} from '../../lib/formatProfileText';
import {
  getProfileValidationError,
  getMissingProfileFieldLabels,
  type ProfileCompletionInput,
} from '../../lib/profileCompletion';
import ProfileCompletionBanner from './ProfileCompletionBanner';
import { useOnboardingOptional } from '../onboarding/OnboardingProvider';

const NOTIF_DEV_MSG =
  'These notification toggles cannot be enabled yet. This feature is still in development.';

const MIN_DELETION_REASON_LEN = 80;

type ProfileFormData = ProfileCompletionInput & {
  instagram: string;
  linkedinUrl: string;
};

function validateRequiredProfileFields(data: ProfileFormData): string | null {
  return getProfileValidationError(data);
}

function applyProfileTextFormatting(data: ProfileFormData): ProfileFormData {
  return {
    ...data,
    fullName: capitalizeProfileWords(data.fullName),
    jobTitle: capitalizeProfileWords(data.jobTitle),
    company: capitalizeProfileWords(data.company),
    domicile: capitalizeProfileWords(data.domicile),
  };
}

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
    {children} <span className="text-red-500 normal-case">*</span>
  </label>
);

const profileInputClass = (hasError: boolean) =>
  `w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400'
      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
  }`;

type DeletionStatus =
  | { status: 'NONE' }
  | { status: 'PENDING'; requestId?: string; submittedAt?: string }
  | {
      status: 'REJECTED';
      requestId?: string;
      reviewNote?: string | null;
      rejectedAt?: string | null;
    };

const ProfileSettings: React.FC = () => {
    const { user, logout, refreshSession, isProfileComplete } = useAuth();
    const { showToast } = useToast();
    const onboarding = useOnboardingOptional();
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS'>('PROFILE');
    const [isLoading, setIsLoading] = useState(false);

    // Profile State
    const [formData, setFormData] = useState({
        fullName: capitalizeProfileWords(user?.fullName || ''),
        email: user?.email || '',
        phone: formatIndonesianPhoneInput(user?.phone || ''),
        jobTitle: capitalizeProfileWords(user?.jobTitle || ''),
        company: capitalizeProfileWords(user?.company || ''),
        domicile: capitalizeProfileWords(user?.domicile || ''),
        instagram: user?.instagram || '',
        linkedinUrl: user?.linkedinUrl || '',
    });
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
    const [avatarPayload, setAvatarPayload] = useState<string | null | undefined>(undefined);
    const [isAvatarBroken, setIsAvatarBroken] = useState(false);
    const [profileShowErrors, setProfileShowErrors] = useState(false);

    const [deletionModalOpen, setDeletionModalOpen] = useState(false);
    const [deletionReason, setDeletionReason] = useState('');
    const [deletionStatus, setDeletionStatus] = useState<DeletionStatus>({ status: 'NONE' });

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    /** Defaults off; hydrated from Nest `/fe/account-settings/...` when API is up. */
    const [notifications, setNotifications] = useState({
        emailTransactional: false,
        emailMarketing: false,
        smsAlerts: false,
    });

  useEffect(() => {
    if (activeTab !== 'PROFILE') return;
    onboarding?.markViewReady();
  }, [activeTab, onboarding]);

  useEffect(() => {
    onboarding?.markViewReady();
  }, [onboarding]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            fullName: capitalizeProfileWords(user?.fullName || ''),
            email: user?.email || '',
            phone: formatIndonesianPhoneInput(user?.phone || ''),
            jobTitle: capitalizeProfileWords(user?.jobTitle || ''),
            company: capitalizeProfileWords(user?.company || ''),
            domicile: capitalizeProfileWords(user?.domicile || ''),
            instagram: user?.instagram || '',
            linkedinUrl: user?.linkedinUrl || '',
        }));
        setAvatarPreview(user?.avatarUrl ?? null);
        setIsAvatarBroken(false);
    }, [
        user?.fullName,
        user?.email,
        user?.avatarUrl,
        user?.phone,
        user?.jobTitle,
        user?.company,
        user?.domicile,
        user?.instagram,
        user?.linkedinUrl,
    ]);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const prefs = await UserNotificationPreferencesService.getMe();
                if (cancelled) return;
                setNotifications({
                    emailTransactional: prefs.emailTransactional,
                    emailMarketing: prefs.emailMarketing,
                    smsAlerts: prefs.smsAlerts,
                });
            } catch {
                /* keep defaults — local FE or Nest not running */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const loadDeletionStatus = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await workspaceFetch('/me/account/deletion-status');
            if (!res.ok) return;
            const data = (await res.json()) as DeletionStatus;
            if (
                data &&
                (data.status === 'NONE' ||
                    data.status === 'PENDING' ||
                    data.status === 'REJECTED')
            ) {
                setDeletionStatus(data);
            }
        } catch {
            /* offline */
        }
    }, [user?.id]);

    useEffect(() => {
        void loadDeletionStatus();
    }, [loadDeletionStatus]);

    useAccountDeletionRealtime(!!user?.id, () => {
        void loadDeletionStatus();
    });

    // Security tab is intentionally disabled for now.
    useEffect(() => {
        if (activeTab === 'SECURITY') {
            setActiveTab('PROFILE');
        }
    }, [activeTab]);

    const fileToCompressedDataUrl = async (file: File): Promise<string> => {
        const bitmap = await createImageBitmap(file);
        const maxSide = 512;
        const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * ratio));
        const h = Math.max(1, Math.round(bitmap.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is not supported');
        ctx.drawImage(bitmap, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', 0.85);
        bitmap.close();
        return out;
    };

    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file.', 'error');
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image is too large. Max 5MB.', 'error');
            e.target.value = '';
            return;
        }
        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            setAvatarPreview(dataUrl);
            setAvatarPayload(dataUrl);
            setIsAvatarBroken(false);
            showToast('Photo selected. Click Save Changes.', 'success');
        } catch {
            showToast('Failed to process image.', 'error');
        } finally {
            e.target.value = '';
        }
    };

    const flipNotification = (
        key: 'emailTransactional' | 'emailMarketing' | 'smsAlerts',
    ) => {
        const current = notifications[key];
        if (!current) {
            showToast(NOTIF_DEV_MSG, 'info');
            return;
        }
        const next = { ...notifications, [key]: false };
        setNotifications(next);
        if (user?.id) {
            void UserNotificationPreferencesService.patchMe({ [key]: false }).catch(
                () => showToast('Could not save notification preferences.', 'error'),
            );
        }
    };

    const handleCapitalizedFieldBlur = (field: ProfileCapitalizeField) => {
        setFormData((prev) => ({
            ...prev,
            [field]: capitalizeProfileWords(prev[field]),
        }));
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        const normalized = applyProfileTextFormatting(formData);
        setFormData(normalized);

        const validationError = validateRequiredProfileFields(normalized);
        if (validationError) {
            setProfileShowErrors(true);
            showToast(validationError, 'error');
            return;
        }

        setIsLoading(true);
        try {
            const res = await workspaceFetch('/me/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: normalized.fullName,
                    email: normalized.email,
                    phone: normalized.phone,
                    jobTitle: normalized.jobTitle,
                    company: normalized.company,
                    domicile: normalized.domicile,
                    instagram: normalized.instagram,
                    linkedinUrl: normalized.linkedinUrl,
                    image: avatarPayload,
                }),
            });
            if (!res.ok) {
                let msg = 'Failed to update profile';
                try {
                    const data = (await res.json()) as { message?: string | string[] };
                    if (typeof data?.message === 'string') msg = data.message;
                    else if (Array.isArray(data?.message)) msg = data.message.join(', ');
                } catch {
                    /* ignore */
                }
                showToast(msg, 'error');
                return;
            }
            setAvatarPayload(undefined);
            setProfileShowErrors(false);
            await refreshSession();
            showToast('Profile updated successfully', 'success');
            onboarding?.notifyProfileSaved();
        } catch {
            showToast('Network error — could not reach the server. Profile was not saved.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePassword = () => {
        if (passwords.new !== passwords.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setPasswords({ current: '', new: '', confirm: '' });
            showToast('Password changed successfully (Mock)', 'success');
        }, 800);
    };

    const openDeletionModal = () => {
        if (!user?.id) return;
        if (user.role === UserRole.SUPER_ADMIN) {
            showToast('Super Admin accounts cannot be deleted.', 'error');
            return;
        }
        if (deletionStatus.status === 'PENDING') {
            showToast('Your deletion request is already pending Super Admin review.', 'info');
            return;
        }
        setDeletionReason('');
        setDeletionModalOpen(true);
    };

    const submitDeletionRequest = async () => {
        if (!user?.id) return;
        const trimmed = deletionReason.trim();
        if (trimmed.length < MIN_DELETION_REASON_LEN) {
            showToast(
                `Please enter at least ${MIN_DELETION_REASON_LEN} characters and explain your decision clearly.`,
                'error',
            );
            return;
        }
        setIsLoading(true);
        try {
            const res = await workspaceFetch('/me/account/deletion-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: trimmed }),
            });
            if (!res.ok) {
                let msg = 'Could not submit the request.';
                try {
                    const data = (await res.json()) as { message?: string | string[] };
                    if (typeof data?.message === 'string') msg = data.message;
                    else if (Array.isArray(data?.message)) msg = data.message.join(', ');
                } catch {
                    /* ignore */
                }
                showToast(msg, 'error');
                return;
            }
            setDeletionModalOpen(false);
            setDeletionReason('');
            setDeletionStatus({
                status: 'PENDING',
                submittedAt: new Date().toISOString(),
            });
            showToast(
                'Request submitted. A Super Admin will review your reason. Check the bell for updates.',
                'success',
            );
        } catch {
            showToast('Network error.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const reasonLen = deletionReason.trim().length;
    const reasonOk = reasonLen >= MIN_DELETION_REASON_LEN;

    return (
        <div className="page-container max-w-4xl animate-fade-in">
            {deletionModalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="del-req-title"
                >
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 bg-amber-50">
                            <div className="flex gap-3 min-w-0">
                                <AlertTriangle
                                    className="h-6 w-6 shrink-0 text-amber-600 mt-0.5"
                                    aria-hidden
                                />
                                <div>
                                    <h2
                                        id="del-req-title"
                                        className="text-lg font-bold text-slate-900"
                                    >
                                        Request account deletion
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Your account is not deleted immediately. Write a detailed reason below.
                                        A Super Admin will review and approve or decline. You will get an in-app
                                        notification (bell icon).
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isLoading && setDeletionModalOpen(false)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-white/80"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase">
                                Deletion reason (required, at least {MIN_DELETION_REASON_LEN} characters)
                            </label>
                            <textarea
                                value={deletionReason}
                                onChange={(e) => setDeletionReason(e.target.value)}
                                rows={8}
                                maxLength={8000}
                                placeholder="Explain why you want to delete your account, what you have considered, and confirm this is your own decision."
                                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none resize-y min-h-[160px]"
                            />
                            <p className="text-xs text-slate-500">
                                {reasonLen} / {MIN_DELETION_REASON_LEN} minimum characters
                                {!reasonOk && (
                                    <span className="text-amber-700"> — keep writing until you reach the minimum</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => setDeletionModalOpen(false)}
                                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-200/80"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isLoading || !reasonOk}
                                onClick={() => void submitDeletionRequest()}
                                className="px-4 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {isLoading ? 'Sending…' : 'Submit request to Super Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="mb-4 text-xl font-bold text-slate-900 sm:mb-6 sm:text-2xl">Account Settings</h1>

            {!isProfileComplete && (
              <div className="mb-6 overflow-hidden rounded-xl border border-amber-200">
                <ProfileCompletionBanner
                  missingLabels={getMissingProfileFieldLabels(user)}
                  onGoToSettings={() => setActiveTab('PROFILE')}
                  compact
                />
              </div>
            )}

            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full shrink-0 md:w-64">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50">
                            <div className="relative group cursor-pointer" onClick={handleAvatarClick} role="button" tabIndex={0} onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleAvatarClick();
                                }
                            }}>
                                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-md">
                                    {avatarPreview && !isAvatarBroken ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                            onError={() => setIsAvatarBroken(true)}
                                        />
                                    ) : (
                                        <User size={40} className="w-full h-full p-4 text-slate-400" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={24} className="text-white" />
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarFileChange}
                                />
                            </div>
                            <h3 className="font-bold text-slate-900 mt-3">{formData.fullName || user?.fullName}</h3>
                            <p className="text-xs text-slate-500">{user?.role}</p>
                        </div>
                        
                        <nav className="flex gap-1 overflow-x-scroll-touch p-2 md:flex-col md:space-y-1 md:overflow-visible">
                            <button 
                                onClick={() => setActiveTab('PROFILE')}
                                className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors md:w-full ${activeTab === 'PROFILE' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <User size={18} className="mr-3"/> Profile
                            </button>
                            <button 
                                disabled
                                aria-disabled="true"
                                title="Security settings are temporarily disabled."
                                className="flex min-h-11 shrink-0 cursor-not-allowed items-center whitespace-nowrap rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 opacity-70 md:w-full"
                            >
                                <Lock size={18} className="mr-3"/> Security
                            </button>
                            <button 
                                onClick={() => setActiveTab('NOTIFICATIONS')}
                                className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors md:w-full ${activeTab === 'NOTIFICATIONS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Bell size={18} className="mr-3"/> Notifications
                            </button>
                        </nav>
                        
                        <div className="p-4 border-t border-slate-100">
                            <button
                                onClick={openDeletionModal}
                                disabled={
                                    isLoading ||
                                    user?.role === UserRole.SUPER_ADMIN ||
                                    deletionStatus.status === 'PENDING'
                                }
                                className={`mb-2 w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    user?.role === UserRole.SUPER_ADMIN ||
                                    deletionStatus.status === 'PENDING'
                                        ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                        : 'text-red-600 hover:bg-red-50'
                                }`}
                                title={
                                    user?.role === UserRole.SUPER_ADMIN
                                        ? 'Super Admin accounts cannot be deleted.'
                                        : deletionStatus.status === 'PENDING'
                                          ? 'A request is already in progress.'
                                          : 'Request deletion (reason required; Super Admin approval)'
                                }
                            >
                                <Trash2 size={18} className="mr-3" /> Delete account
                            </button>
                            <button onClick={logout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <LogOut size={18} className="mr-3"/> Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
                        
                        {activeTab === 'PROFILE' && (
                            <div className="space-y-6">
                                {deletionStatus.status === 'PENDING' && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                        <p className="font-bold">Account deletion: awaiting Super Admin</p>
                                        <p className="mt-1 text-amber-900/90">
                                            Your request has been submitted with the reason you provided. A Super
                                            Admin will approve or decline. Watch notifications (bell icon) for the
                                            outcome.
                                        </p>
                                    </div>
                                )}
                                {deletionStatus.status === 'REJECTED' && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                                        <p className="font-bold">Previous deletion request was declined</p>
                                        {deletionStatus.reviewNote ? (
                                            <p className="mt-1 text-slate-600">
                                                Note: {deletionStatus.reviewNote}
                                            </p>
                                        ) : null}
                                        <p className="mt-2 text-xs text-slate-500">
                                            You can submit a new request from the menu on the left if you still want
                                            to delete your account.
                                        </p>
                                    </div>
                                )}
                                <div data-tour="profile-welcome">
                                    <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                                    <p className="text-sm text-slate-500">
                                        Update your public profile and contact details.{' '}
                                        <span className="text-red-500">*</span> wajib diisi.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div data-tour="profile-full-name">
                                        <RequiredLabel>Full Name</RequiredLabel>
                                        <input 
                                            type="text" 
                                            className={profileInputClass(
                                              profileShowErrors && !formData.fullName.trim(),
                                            )}
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            onBlur={() => handleCapitalizedFieldBlur('fullName')}
                                            placeholder="Full name"
                                        />
                                    </div>
                                    <div data-tour="profile-job-title">
                                        <RequiredLabel>Position / Title</RequiredLabel>
                                        <input 
                                            type="text" 
                                            className={profileInputClass(
                                              profileShowErrors && !formData.jobTitle.trim(),
                                            )}
                                            value={formData.jobTitle}
                                            onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                                            onBlur={() => handleCapitalizedFieldBlur('jobTitle')}
                                            placeholder="e.g. CEO"
                                        />
                                    </div>
                                    <div data-tour="profile-phone">
                                        <RequiredLabel>Phone</RequiredLabel>
                                        <input 
                                            type="tel" 
                                            className={profileInputClass(
                                              profileShowErrors &&
                                                !hasIndonesianPhoneNumber(formData.phone),
                                            )}
                                            value={formData.phone}
                                            onFocus={() => {
                                              if (!formData.phone.trim()) {
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  phone: '+62 ',
                                                }));
                                              }
                                            }}
                                            onChange={(e) =>
                                              setFormData({
                                                ...formData,
                                                phone: formatIndonesianPhoneInput(e.target.value),
                                              })
                                            }
                                            placeholder="+62 812..."
                                        />
                                    </div>
                                    <div>
                                        <RequiredLabel>Email Address</RequiredLabel>
                                        <input 
                                            type="email" 
                                            className={profileInputClass(
                                              profileShowErrors &&
                                                (!formData.email.trim() ||
                                                  !formData.email.includes('@')),
                                            )}
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            placeholder="email@..."
                                        />
                                    </div>
                                    <div>
                                        <RequiredLabel>Company</RequiredLabel>
                                        <input 
                                            type="text" 
                                            className={profileInputClass(
                                              profileShowErrors && !formData.company.trim(),
                                            )}
                                            value={formData.company}
                                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                                            onBlur={() => handleCapitalizedFieldBlur('company')}
                                            placeholder="Company"
                                        />
                                    </div>
                                    <div>
                                        <RequiredLabel>Domicile</RequiredLabel>
                                        <input 
                                            type="text" 
                                            className={profileInputClass(
                                              profileShowErrors && !formData.domicile.trim(),
                                            )}
                                            value={formData.domicile}
                                            onChange={(e) => setFormData({...formData, domicile: e.target.value})}
                                            onBlur={() => handleCapitalizedFieldBlur('domicile')}
                                            placeholder="City / Region"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instagram</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.instagram}
                                            onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                                            placeholder="@username"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn</label>
                                        <input 
                                            type="url" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.linkedinUrl}
                                            onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                                            placeholder="linkedin.com/in/..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button 
                                        data-tour="profile-save-button"
                                        onClick={handleSaveProfile}
                                        disabled={isLoading}
                                        className="flex w-full min-h-11 items-center justify-center rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 sm:w-auto sm:min-h-0"
                                    >
                                        {isLoading ? 'Saving...' : <><Save size={16} className="mr-2"/> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'SECURITY' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Security & Password</h2>
                                    <p className="text-sm text-slate-500">Manage your password and login security.</p>
                                </div>
                                <div className="max-w-md space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.current}
                                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        onClick={handleSavePassword}
                                        disabled={isLoading || !passwords.current || !passwords.new}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center disabled:opacity-50"
                                    >
                                        {isLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'NOTIFICATIONS' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                                    <p className="text-sm text-slate-500">Control what emails and alerts you receive. New channels stay off until the service is ready.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900">Transactional emails</h4>
                                            <p className="text-xs text-slate-500">Invoices, tickets, and system alerts.</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifications.emailTransactional}
                                            onClick={() => flipNotification('emailTransactional')}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${notifications.emailTransactional ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.emailTransactional ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900">Marketing &amp; newsletters</h4>
                                            <p className="text-xs text-slate-500">Event updates, new courses, and promotions.</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifications.emailMarketing}
                                            onClick={() => flipNotification('emailMarketing')}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${notifications.emailMarketing ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.emailMarketing ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900">SMS alerts</h4>
                                            <p className="text-xs text-slate-500">Urgent notifications to your phone.</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifications.smsAlerts}
                                            onClick={() => flipNotification('smsAlerts')}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${notifications.smsAlerts ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.smsAlerts ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
