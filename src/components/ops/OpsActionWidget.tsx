
import React, { useState } from 'react';
import { OpsTask, OpsTaskStatus } from '../../types/ops';
import { UserRole } from '../../types/index';
import { CheckCircle2, MessageSquare, FileText, Zap, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import TaskActionModal from './TaskActionModal';
import { WhatsAppService } from '../../services/whatsappService';
import { ContractService } from '../../services/contractService';
import { useToast } from '../../context/ToastContext';

interface OpsActionWidgetProps {
    task: OpsTask;
    checklistContext: { 
        id: string; 
        memberId: string; 
        memberName: string; 
        productName: string;
        memberPhone?: string; // If available
    };
    userRole: UserRole;
    onUpdate: (taskId: string, status: OpsTaskStatus, note: string) => void;
}

const OpsActionWidget: React.FC<OpsActionWidgetProps> = ({ task, checklistContext, userRole, onUpdate }) => {
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    // If task is not for current user, show minimal view or nothing
    if (task.assignedRole !== userRole && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.OPERATIONS) {
        return <span className="text-xs text-slate-400 italic">Assigned to {task.assignedRole}</span>;
    }

    if (task.status === 'COMPLETED' || task.status === 'SKIPPED') {
        return (
            <div className="flex items-center text-green-600 text-xs font-bold">
                <CheckCircle2 size={14} className="mr-1.5"/> Done
            </div>
        );
    }

    // --- SMART ACTION LOGIC ---
    
    // 1. Contract Generation
    const isContractTask = task.title.toLowerCase().includes('contract');
    const handleSmartContract = async () => {
        setIsExecuting(true);
        try {
            await ContractService.createInstance('PKG-MLCT-GENERIC', checklistContext.memberId, checklistContext.id, 0);
            onUpdate(task.id, 'COMPLETED', 'Smart Action: Contract Generated via Ops Widget');
        } catch (e) {
            showToast('Failed to generate contract', 'error');
        } finally {
            setIsExecuting(false);
        }
    };

    // 2. WhatsApp Action
    const isWaTask = task.type === 'CUSTOMER_WAITING' || task.title.toLowerCase().includes('whatsapp') || task.title.toLowerCase().includes('contact');
    const handleSmartWhatsApp = () => {
        // Mock phone if missing
        const phone = checklistContext.memberPhone || '628123456789';
        const link = WhatsAppService.generateLink(phone, `Hi ${checklistContext.memberName}, regarding your order for ${checklistContext.productName}...`);
        window.open(link, '_blank');
        // We don't auto-complete here, user must confirm they sent it. Open modal instead?
        // Or just mark In Progress.
        onUpdate(task.id, 'IN_PROGRESS', 'Opened WhatsApp Link');
    };

    // 3. Automated Task (Shouldn't be manually clicked usually, but admin might force it)
    if (task.type === 'AUTOMATED') {
        return (
            <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                <Zap size={12} className="mr-1"/> Waiting for System: {task.systemTrigger}
            </div>
        );
    }

    // RENDERERS
    
    if (isContractTask) {
        return (
            <button 
                onClick={handleSmartContract} 
                disabled={isExecuting}
                className="flex items-center bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
            >
                {isExecuting ? <Loader2 size={12} className="animate-spin mr-1"/> : <FileText size={12} className="mr-1.5"/>}
                Generate Contract
            </button>
        );
    }

    if (isWaTask) {
        return (
            <div className="flex gap-2">
                <button 
                    onClick={handleSmartWhatsApp} 
                    className="flex items-center bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all"
                >
                    <MessageSquare size={12} className="mr-1.5"/> Contact Customer
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                    title="Mark Done"
                >
                    <CheckCircle2 size={16}/>
                </button>
                {showModal && <TaskActionModal task={task} onClose={() => setShowModal(false)} onUpdateStatus={onUpdate} currentUserRole={userRole}/>}
            </div>
        );
    }

    // Default Manual Action
    return (
        <>
            <button 
                onClick={() => setShowModal(true)}
                className="flex items-center border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-blue-600 transition-all group"
            >
                Action <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform"/>
            </button>
            {showModal && (
                <TaskActionModal 
                    task={task} 
                    onClose={() => setShowModal(false)} 
                    onUpdateStatus={onUpdate} 
                    currentUserRole={userRole}
                />
            )}
        </>
    );
};

export default OpsActionWidget;
