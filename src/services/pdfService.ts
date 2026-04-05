import { PDFTemplate } from '../types/index';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

function pdfDataBackend(): 'indexeddb' | 'api' | 'supabase' {
    if (APP_CONFIG.USE_MOCK_GLOBAL) return 'indexeddb';
    if (APP_CONFIG.DOMAINS.COMMUNICATION === 'API') return 'api';
    if (APP_CONFIG.DOMAINS.COMMUNICATION === 'SUPABASE' && supabase)
        return 'supabase';
    return 'indexeddb';
}

// MOCK TEMPLATES
const SEED_TEMPLATES: PDFTemplate[] = [
    {
        id: 'PDF-CERT-001',
        name: 'Classic Certificate (A4 Landscape)',
        category: 'CERTIFICATE',
        orientation: 'LANDSCAPE',
        pages: [
            {
                id: 'pg-1',
                pageNumber: 1,
                backgroundImageUrl: 'https://img.freepik.com/free-vector/elegant-certificate-template-with-golden-decoration_23-2148412863.jpg',
                elements: [
                    { id: 'el-1', type: 'TEXT', content: 'Certificate of Completion', x: 50, y: 30, fontSize: 32, fontWeight: 'bold', color: '#1f2937', align: 'center' },
                    { id: 'el-2', type: 'VARIABLE', content: '{{member_name}}', x: 50, y: 50, fontSize: 48, fontWeight: 'bold', color: '#111827', align: 'center' },
                    { id: 'el-3', type: 'TEXT', content: 'For completing the Leadership Summit', x: 50, y: 65, fontSize: 16, fontWeight: 'normal', color: '#4b5563', align: 'center' }
                ]
            }
        ]
    }
];

export const PDFService = {
    
    getTemplates: async (): Promise<PDFTemplate[]> => {
        const mode = pdfDataBackend();
        if (mode === 'api') {
            return apiRequest<PDFTemplate[]>('/communication/pdf/templates');
        }
        if (mode === 'supabase') {
            const { data } = await supabase!.from('sys_pdf_templates').select('*');
            return (data as PDFTemplate[]) || [];
        }
        try {
            if (await DevDatabase.isEmpty('sys_pdf_templates'))
                await DevDatabase.bulkAdd('sys_pdf_templates', SEED_TEMPLATES);
            return await DevDatabase.getAll<PDFTemplate>('sys_pdf_templates');
        } catch {
            return SEED_TEMPLATES;
        }
    },

    saveTemplate: async (template: PDFTemplate): Promise<PDFTemplate> => {
        const toSave = { ...template };
        if (!toSave.id) toSave.id = `PDF-${Date.now()}`;

        const mode = pdfDataBackend();
        if (mode === 'api') {
            return apiRequest<PDFTemplate>(
                `/communication/pdf/templates/${encodeURIComponent(toSave.id)}`,
                { method: 'PUT', body: JSON.stringify(toSave) },
            );
        }
        if (mode === 'supabase') {
            if (!supabase) throw new Error('No DB');
            const { data, error } = await supabase
                .from('sys_pdf_templates')
                .upsert(toSave)
                .select()
                .single();
            if (error) throw error;
            return data as PDFTemplate;
        }

        await DevDatabase.add('sys_pdf_templates', toSave);
        return toSave;
    },

    previewPDF: (template: PDFTemplate, data: Record<string, string>): string => {
        // Logic to overlay HTML on image (Simulated in UI component)
        return template.pages[0]?.backgroundImageUrl || '';
    },
};