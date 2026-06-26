import { apiRequest } from '../repositories/api/apiClient';
import type { FormDefinition, FormResponse, FormSession } from '@/features/forms/types';

export function buildFormDeploymentUrl(formId: string, sessionId: string): string {
  const params = new URLSearchParams({
    formId: formId.trim(),
    sessionId: sessionId.trim(),
  });
  if (typeof window === 'undefined') {
    return `/?${params.toString()}`;
  }
  return `${window.location.origin}/?${params.toString()}`;
}

function normalizeForm(row: Record<string, unknown>): FormDefinition {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : undefined,
    isQuiz: Boolean(row.isQuiz),
    questions: Array.isArray(row.questions) ? (row.questions as FormDefinition['questions']) : [],
    sessions: Array.isArray(row.sessions)
      ? (row.sessions as FormSession[])
      : [],
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    createdBy: String(row.createdBy ?? ''),
    active: row.active !== false,
    successMessage:
      typeof row.successMessage === 'string' ? row.successMessage : undefined,
  };
}

export function normalizeFormResponse(row: Record<string, unknown>): FormResponse {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const deploymentName =
    typeof row.deploymentName === 'string'
      ? row.deploymentName
      : typeof metadata.deploymentName === 'string'
        ? metadata.deploymentName
        : undefined;
  const eventId =
    typeof row.eventId === 'string'
      ? row.eventId
      : typeof metadata.eventId === 'string'
        ? metadata.eventId
        : undefined;

  return {
    id: String(row.id ?? ''),
    formId: String(row.formId ?? ''),
    sessionId:
      typeof row.sessionId === 'string'
        ? row.sessionId
        : typeof row.deploymentId === 'string'
          ? row.deploymentId
          : undefined,
    deploymentName,
    eventId,
    userId: String(row.userId ?? row.memberId ?? 'guest'),
    userName: typeof row.userName === 'string' ? row.userName : undefined,
    userEmail: typeof row.userEmail === 'string' ? row.userEmail : undefined,
    userPhone: typeof row.userPhone === 'string' ? row.userPhone : undefined,
    answers:
      row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : {},
    score: typeof row.score === 'number' ? row.score : undefined,
    maxScore: typeof row.maxScore === 'number' ? row.maxScore : undefined,
    submittedAt: String(row.submittedAt ?? new Date().toISOString()),
  };
}

export const FormService = {
  getForms: async (): Promise<FormDefinition[]> => {
    const rows = await apiRequest<unknown[]>('/forms');
    return (Array.isArray(rows) ? rows : []).map((row) =>
      normalizeForm(row as Record<string, unknown>),
    );
  },

  getFormById: async (id: string): Promise<FormDefinition | undefined> => {
    const row = await apiRequest<Record<string, unknown>>(
      `/forms/${encodeURIComponent(id)}`,
    );
    return row ? normalizeForm(row) : undefined;
  },

  updateForm: async (form: FormDefinition): Promise<FormDefinition> => {
    const row = await apiRequest<Record<string, unknown>>('/forms', {
      method: 'POST',
      body: JSON.stringify({
        id: form.id,
        title: form.title,
        description: form.description,
        isQuiz: form.isQuiz,
        questions: form.questions,
        successMessage: form.successMessage,
        active: form.active,
      }),
    });
    return normalizeForm(row);
  },

  deleteForm: async (id: string): Promise<void> => {
    await apiRequest(`/forms/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  addDeployment: async (
    formId: string,
    payload: { name: string; eventId?: string },
  ): Promise<FormSession> => {
    const row = await apiRequest<Record<string, unknown>>(
      `/forms/${encodeURIComponent(formId)}/deployments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return {
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      eventId: typeof row.eventId === 'string' ? row.eventId : undefined,
      createdAt: String(row.createdAt ?? new Date().toISOString()),
    };
  },

  deleteDeployment: async (
    formId: string,
    deploymentId: string,
  ): Promise<void> => {
    await apiRequest(
      `/forms/${encodeURIComponent(formId)}/deployments/${encodeURIComponent(deploymentId)}`,
      { method: 'DELETE' },
    );
  },

  getPublicForm: async (
    formId: string,
    sessionId?: string,
  ): Promise<{ form: FormDefinition; session: FormSession | null }> => {
    const q = new URLSearchParams({ formId });
    if (sessionId?.trim()) q.set('sessionId', sessionId.trim());
    const payload = await apiRequest<{
      form: Record<string, unknown>;
      session: Record<string, unknown> | null;
    }>(`/forms/public/respond?${q.toString()}`);
    return {
      form: normalizeForm(payload.form),
      session: payload.session
        ? {
            id: String(payload.session.id ?? ''),
            name: String(payload.session.name ?? ''),
            eventId:
              typeof payload.session.eventId === 'string'
                ? payload.session.eventId
                : undefined,
            createdAt: String(
              payload.session.createdAt ?? new Date().toISOString(),
            ),
          }
        : null,
    };
  },

  submitResponse: async (input: {
    formId: string;
    sessionId?: string;
    answers: Record<string, unknown>;
    guestContact?: { name: string; email?: string; phone: string };
  }): Promise<FormResponse & { successMessage?: string }> => {
    const row = await apiRequest<Record<string, unknown>>('/forms/public/respond', {
      method: 'POST',
      body: JSON.stringify({
        formId: input.formId,
        sessionId: input.sessionId,
        answers: input.answers,
        guestContact: input.guestContact,
      }),
    });
    return {
      ...normalizeFormResponse(row),
      successMessage:
        typeof row.successMessage === 'string' ? row.successMessage : undefined,
    };
  },

  getResponsesByFormId: async (formId: string): Promise<FormResponse[]> => {
    const report = await apiRequest<{
      responses?: Record<string, unknown>[];
    }>(`/forms/${encodeURIComponent(formId)}/reports`);
    const rows = Array.isArray(report.responses) ? report.responses : [];
    return rows.map((row) => normalizeFormResponse(row));
  },

  getFormReports: async (formId: string) => {
    return apiRequest<Record<string, unknown>>(
      `/forms/${encodeURIComponent(formId)}/reports`,
    );
  },

  getResponsesByUserId: async (userId: string): Promise<FormResponse[]> => {
    void userId;
    const rows = await apiRequest<unknown[]>('/forms/my-responses');
    return (Array.isArray(rows) ? rows : []).map((row) =>
      normalizeFormResponse(row as Record<string, unknown>),
    );
  },
};
