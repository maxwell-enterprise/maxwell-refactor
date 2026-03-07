
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, Send } from 'lucide-react';
import { WhatsAppService } from '../../services/whatsappService';
import { WATaskCategory, WhatsAppTemplate, WAUIContext } from '../../types/index';
import { useToast } from '../../context/ToastContext';

interface WhatsAppQuickActionProps {
    phone: string;
    name: string; // Recipient Name
    contextData: Record<string, any>; // Data for variable injection
    
    // UPDATED: context is now the primary filter
    context?: WAUIContext; 
    
    // Legacy support (optional filter if context is GENERAL)
    category?: WATaskCategory; 
    
    label?: string; // Button label (optional)
    variant?: 'icon' | 'button' | 'ghost'; // Style variant
    compact?: boolean;
}

const WhatsAppQuickAction: React.FC<WhatsAppQuickActionProps> = ({ 
    phone, name, contextData, context, category, label, variant = 'icon', compact = false
}) => {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        // Fetch based on Context
        const tpls = await WhatsAppService.getManualTemplates(context);
        setTemplates(tpls);
        setLoading(false);
        return tpls;
    };

    const handleMainClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        const tpls = await fetchTemplates();

        // Logic:
        // - If 0 templates -> Open blank chat
        // - If > 0 templates -> Show Menu
        if (tpls.length === 0) {
            sendWhatsApp(); // Send blank
        } else {
            setIsOpen(!isOpen);
        }
    };

    const sendWhatsApp = async (template?: WhatsAppTemplate) => {
        setIsOpen(false);
        let message = '';

        if (template) {
            // Inject variables
            const data = { ...contextData, name }; // Ensure name is available
            message = WhatsAppService.interpolateMessage(template.message, data);
        }

        // Open WA
        const url = WhatsAppService.generateLink(phone, message);
        window.open(url, '_blank');

        // Log to Queue as 'CLICKED'
        await WhatsAppService.addTask({
            recipientName: name,
            recipientPhone: phone,
            message: message || '(Manual Chat Initiated)',
            category: template?.category || 'GENERAL',
            status: 'CLICKED' // Auto-mark as clicked since we opened it
        });

        showToast(`Opened WhatsApp for ${name}`, 'success');
    };

    // Render Logic
    const baseClasses = "transition-all flex items-center justify-center relative";
    const variantClasses = {
        icon: `p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 ${compact ? 'p-1' : 'p-2'}`,
        button: "bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-green-700 shadow-sm",
        ghost: "text-green-600 hover:text-green-700 font-bold text-xs hover:bg-green-50 px-2 py-1 rounded"
    };

    return (
        <div className="relative inline-block z-auto" ref={menuRef}>
            <button 
                onClick={handleMainClick}
                className={`${baseClasses} ${variantClasses[variant]}`}
                title="Send WhatsApp"
            >
                <MessageCircle size={compact ? 14 : 16} className={label ? "mr-1.5" : ""} />
                {label}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] overflow-hidden animate-fade-in-up origin-top-right ring-1 ring-black/5">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Message</span>
                        {loading && <span className="text-[10px] text-blue-500">Loading...</span>}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        <button 
                            onClick={() => sendWhatsApp()} 
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center"
                        >
                            <Send size={12} className="mr-2 text-slate-400"/> Empty Chat (No Template)
                        </button>
                        
                        {templates.length > 0 && <div className="h-px bg-slate-100 my-1"></div>}
                        
                        {templates.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => sendWhatsApp(tpl)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 hover:text-green-800 rounded-lg group"
                            >
                                <div className="font-bold mb-0.5">{tpl.label}</div>
                                <div className="text-[10px] text-slate-400 truncate group-hover:text-green-600/70">{tpl.message}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppQuickAction;
