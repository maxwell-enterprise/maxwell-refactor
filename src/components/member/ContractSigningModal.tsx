
import React, { useState, useRef } from 'react';
import { ContractInstance, ContractTemplate, MasterNode } from '../../types/contract';
import { ContractService } from '../../services/contractService';
import { X, PenTool, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ContractSigningModalProps {
    instance: ContractInstance;
    onClose: () => void;
    onSigned: () => void;
}

const RecursiveClauseView = ({ nodes, selectedIds, level = 0 }: { nodes: MasterNode[], selectedIds: string[], level?: number }) => {
    return (
        <div className={`space-y-3 ${level > 0 ? 'ml-4 border-l border-slate-200 pl-4' : ''}`}>
            {nodes.map((node, idx) => {
                if (!selectedIds.includes(node.id)) return null;
                const isSection = node.type === 'SECTION';
                
                return (
                    <div key={node.id}>
                        {isSection ? (
                            <>
                                <h4 className="font-bold text-slate-900 text-sm mb-2 mt-4">{node.label}</h4>
                                {node.children && <RecursiveClauseView nodes={node.children} selectedIds={selectedIds} level={level + 1} />}
                            </>
                        ) : (
                            <p className="text-xs text-slate-600 leading-relaxed text-justify">
                                <span className="font-bold mr-1">{idx+1}.</span> {node.text}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const ContractSigningModal: React.FC<ContractSigningModalProps> = ({ instance, onClose, onSigned }) => {
    const { showToast } = useToast();
    const [template, setTemplate] = useState<ContractTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    
    // Signature
    const [signatureText, setSignatureText] = useState('');
    const [agreed, setAgreed] = useState(false);

    React.useEffect(() => {
        ContractService.getTemplateById(instance.templateId).then(t => {
            setTemplate(t || null);
            setLoading(false);
        });
    }, [instance]);

    const handleSign = async () => {
        if (!agreed || !signatureText) return;
        setIsSigning(true);
        try {
            // In a real app, generate a signature image from canvas or text
            const signatureMock = `https://ui-avatars.com/api/?name=${signatureText.replace(' ','+')}&font-size=0.3&background=fff&color=000&length=2`; 
            
            await ContractService.signContract(instance.id, signatureMock);
            showToast("Contract Signed Successfully!", "success");
            onSigned();
        } catch (e) {
            showToast("Failed to sign contract", "error");
        } finally {
            setIsSigning(false);
        }
    };

    if (!template) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Review & Sign Agreement</h2>
                        <p className="text-xs text-slate-500">{template.name} • {instance.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={24}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Document Scroll */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                        <div className="bg-white shadow-sm border border-slate-200 p-10 min-h-[800px] mx-auto max-w-[210mm]">
                            <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                                <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900">Official Agreement</h1>
                                <p className="text-sm font-bold text-slate-500">{instance.customerData.programName}</p>
                            </div>

                            <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded text-xs grid grid-cols-2 gap-2">
                                <div><strong>Member:</strong> {instance.customerData.name}</div>
                                <div><strong>Email:</strong> {instance.customerData.email}</div>
                                <div><strong>ID:</strong> {instance.customerData.mlctNumber}</div>
                                <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                            </div>

                            <RecursiveClauseView nodes={template.rootNodes || []} selectedIds={instance.selectedNodeIds || []} />
                        </div>
                    </div>

                    {/* Signing Sidebar */}
                    <div className="w-80 bg-white border-l border-slate-200 flex flex-col p-6 shadow-xl z-10">
                        <div className="mb-auto">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                                <PenTool size={18} className="mr-2 text-blue-600"/> Digital Signature
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">
                                By signing below, you acknowledge that you have read and understood the terms of this agreement.
                            </p>

                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Type your full name</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border-2 border-slate-300 rounded-xl font-serif text-lg italic text-slate-800 focus:border-blue-600 outline-none mb-4 bg-slate-50"
                                placeholder={instance.customerData.name}
                                value={signatureText}
                                onChange={e => setSignatureText(e.target.value)}
                            />

                            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                                    checked={agreed}
                                    onChange={e => setAgreed(e.target.checked)}
                                />
                                <span className="text-xs text-slate-600">
                                    I agree to be legally bound by this document and the Maxwell Leadership Code of Conduct.
                                </span>
                            </label>
                        </div>

                        <button 
                            onClick={handleSign}
                            disabled={!agreed || !signatureText || isSigning}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                            {isSigning ? 'Signing...' : <><CheckCircle size={18} className="mr-2"/> Sign & Submit</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractSigningModal;
