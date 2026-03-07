import { PDFTemplate, PDFElement, PDFPage } from '../types/index';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

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
        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('sys_pdf_templates')) await DevDatabase.bulkAdd('sys_pdf_templates', SEED_TEMPLATES);
                return await DevDatabase.getAll<PDFTemplate>('sys_pdf_templates');
            } catch(e) { return SEED_TEMPLATES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('sys_pdf_templates').select('*');
        return data || [];
    },

    saveTemplate: async (template: PDFTemplate): Promise<PDFTemplate> => {
        const toSave = { ...template };
        if (!toSave.id) toSave.id = `PDF-${Date.now()}`;

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('sys_pdf_templates', toSave);
            return toSave;
        }

        if (!supabase) throw new Error("No DB");
        const { data, error } = await supabase.from('sys_pdf_templates').upsert(toSave).select().single();
        if (error) throw error;
        return data;
    },

    previewPDF: (template: PDFTemplate, data: Record<string, string>): string => {
        // Logic to overlay HTML on image (Simulated in UI component)
        return template.pages[0]?.backgroundImageUrl || '';
    },
};