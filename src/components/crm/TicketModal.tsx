
import React, { useState } from 'react';
import { Member, SupportTicket, TicketPriority, UserRole } from '../../types/index';
import { LifeBuoy, X, Plus } from 'lucide-react';

interface TicketModalProps {
    member: Member;
    onClose: () => void;
    onSave: (ticket: Partial<SupportTicket>) => void;
    existingTickets: SupportTicket[];
}

const TicketModal: React.FC<TicketModalProps> = ({ member, onClose, onSave, existingTickets }) => {
    const [newTicket, setNewTicket] = useState<Partial<SupportTicket>>({
        subject: '',
        description: '',
        priority: 'MEDIUM',
        assignedRole: UserRole.OPERATIONS,
        status: 'NEW'
    });

    const priorityColor = (p: TicketPriority) => {
        switch(p) {
            case 'URGENT': return 'bg-red-100 text-red-700';
            case 'HIGH': return 'bg-orange-100 text-orange-700';
            case 'MEDIUM': return 'bg-blue-100 text-blue-700';
            case 'LOW': return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><LifeBuoy size={20}/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Service Case Management</h3>
                            <p className="text-xs text-slate-500">For {member.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Create New */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                            <Plus size={16} className="mr-1 text-blue-600"/> Open New Case
                        </h4>
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Subject (e.g. Invoice Error, Login Issue)" 
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newTicket.subject}
                                onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <select 
                                    className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={newTicket.priority}
                                    onChange={e => setNewTicket({...newTicket, priority: e.target.value as TicketPriority})}
                                >
                                    <option value="LOW">Low Priority</option>
                                    <option value="MEDIUM">Medium Priority</option>
                                    <option value="HIGH">High Priority</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                                <select 
                                    className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={newTicket.assignedRole}
                                    onChange={e => setNewTicket({...newTicket, assignedRole: e.target.value as UserRole})}
                                >
                                    {Object.values(UserRole).filter(r => r !== UserRole.GUEST).map(r => (
                                        <option key={r} value={r}>Assign to: {r}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea 
                                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                placeholder="Describe the issue or request..."
                                value={newTicket.description}
                                onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                            ></textarea>
                            <div className="flex justify-end">
                                <button 
                                    onClick={() => onSave(newTicket)}
                                    disabled={!newTicket.subject || !newTicket.description}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    Create Ticket
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Case History</h4>
                        <div className="space-y-3">
                            {existingTickets.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-4">No cases found for this member.</p>
                            ) : existingTickets.map(t => (
                                <div key={t.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityColor(t.priority)}`}>{t.priority}</span>
                                            <span className="font-bold text-sm text-slate-800">{t.subject}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-2 line-clamp-1">{t.description}</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">Assigned: {t.assignedRole}</span>
                                        <span className={`font-bold ${t.status === 'RESOLVED' ? 'text-green-600' : 'text-amber-600'}`}>{t.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
