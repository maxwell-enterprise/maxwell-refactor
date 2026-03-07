
import React from 'react';
import { ContractInstance, ContractTableDefinition, MasterNode } from '../../../types/contract';
import { Download, Printer, AlertCircle } from 'lucide-react';

interface ContractViewerProps {
    instance: ContractInstance;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ instance }) => {
    
    // --- ACTIONS ---
    const handlePrintPDF = () => {
        // 1. Set document title temporarily for nice filename
        const originalTitle = document.title;
        const cleanName = instance.customerData.name.replace(/[^a-zA-Z0-9]/g, '_');
        document.title = `Contract_${cleanName}_${instance.id}`;

        // 2. Trigger Print
        window.print();

        // 3. Restore title (delayed to ensure print dialog picks up the new name)
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    // Helper to replace variables in any string
    const replaceVariables = (text: string) => {
        if (typeof text !== 'string') return ''; // Safety check
        let processed = text;
        const data: any = instance.customerData;
        
        // Define standard variables
        const map: Record<string, string> = {
            '<<FULLNAME>>': data.name,
            '<<EMAIL>>': data.email,
            '<<PHONE>>': data.phone,
            '<<MLCTNUMBER>>': data.mlctNumber,
            '<<DATEJOINED>>': data.joinDate,
            '<<HOMEADDRESS>>': data.address,
            '<<TOTALFEES>>': new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.totalFees),
            '<<PROGRAMNAME>>': data.programName
        };

        Object.keys(map).forEach(key => {
            processed = processed.split(key).join(map[key]);
            // Fallback for legacy format
            processed = processed.split(key.replace('<<', '{{').replace('>>', '}}')).join(map[key]);
        });
        
        return processed;
    };

    // --- RENDERERS ---

    const renderDynamicHeader = () => {
        if (!instance.customHeader || instance.customHeader.length === 0) {
            return null;
        }

        return (
            <div className="relative z-10 mb-6 border border-black text-[10px]">
                <div className="bg-slate-100 p-1 border-b border-black font-bold uppercase print:bg-slate-200">Customer Information</div>
                <div className="flex flex-wrap">
                    {instance.customHeader.map((field, idx) => {
                        const isFullWidth = field.width === 'FULL';
                        return (
                            <div key={field.id} className={`flex border-b border-black ${isFullWidth ? 'w-full' : 'w-1/2'} ${(!isFullWidth && idx % 2 === 0) ? 'border-r' : ''}`}>
                                <div className="p-1 font-bold bg-slate-50 w-1/3 border-r border-black print:bg-slate-100">{field.label}</div>
                                <div className="p-1 flex-1">{replaceVariables(field.valueTemplate)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDynamicTable = (table: ContractTableDefinition) => {
        return (
            <div key={table.id} className="relative z-10 mb-6 break-inside-avoid">
                <h3 className="font-bold uppercase mb-2 text-sm">{table.title}</h3>
                {table.description && <p className="mb-2 text-[10px] italic">{replaceVariables(table.description)}</p>}
                
                <table className="w-full border border-black text-[10px]">
                    <thead className="bg-slate-100 font-bold print:bg-slate-200">
                        <tr>
                            {table.columns.map(col => (
                                <th 
                                    key={col.id} 
                                    className="p-1 border-b border-r border-black text-left last:border-r-0"
                                    style={{ width: col.widthPercent ? `${col.widthPercent}%` : 'auto' }}
                                >
                                    {col.headerLabel}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map(row => (
                            <tr key={row.id}>
                                {table.columns.map(col => (
                                    <td key={col.id} className="p-1 border-b border-r border-black last:border-r-0">
                                        {replaceVariables(`${row.cells[col.id] || ''}`)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderSignatureBox = (node: MasterNode) => {
        return (
            <div key={node.id} className="relative z-10 mt-16 break-inside-avoid">
                {/* Closing Statement with more breathing room */}
                <p className="mb-12 text-justify italic font-serif text-sm leading-relaxed px-2">
                    "{replaceVariables(node.closingStatement || '')}"
                </p>
                
                <div className="grid grid-cols-2 gap-16 mt-4">
                    {/* User Signature */}
                    <div className="flex flex-col">
                        <div className="h-24 flex items-end justify-center mb-2 border-b border-black">
                             {instance.status === 'SIGNED' ? (
                                <div className="font-script text-3xl text-blue-900 print:text-black mb-2">{instance.customerData.name}</div>
                             ) : (
                                 <div className="text-slate-300 text-[9px] uppercase tracking-widest mb-2 print:text-transparent">[Digital Signature]</div>
                             )}
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold uppercase">{instance.customerData.name}</p>
                            <p className="text-[10px] text-slate-500 print:text-slate-900">Member / Applicant</p>
                            <p className="text-[10px] text-slate-500 print:text-slate-900 mt-0.5">Date: {instance.signedAt ? new Date(instance.signedAt).toLocaleDateString() : '___/___/_____'}</p>
                        </div>
                    </div>

                    {/* Company Signature */}
                    {node.showCompanySignature && (
                        <div className="flex flex-col">
                             <div className="h-24 flex items-end justify-center mb-2 border-b border-black">
                                 {/* Space for physical stamp/sign */}
                                 <div className="text-slate-200 text-[9px] uppercase tracking-widest mb-2 print:hidden">[Company Stamp]</div>
                             </div>
                             <div className="text-center">
                                 <p className="text-[10px] font-bold uppercase">{node.companySignatoryName || 'Authorized Representative'}</p>
                                 <p className="text-[10px] text-slate-500 print:text-slate-900">Maxwell Leadership Indonesia</p>
                                 <p className="text-[10px] text-slate-500 print:text-slate-900 mt-0.5">Date: ___/___/_____</p>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Recursive Content Rendering (Handles Sections, Clauses, Table Refs, and Signature)
    const renderNode = (node: MasterNode, depth: number = 0) => {
        if (node.type === 'TABLE_REF') {
             if (!node.tableId) {
                  return (
                    <div className="relative z-10 mb-6 p-4 border border-dashed border-red-300 bg-red-50 text-center text-red-500 text-[10px] print:hidden">
                        Configuration Required: Table Selection Missing
                    </div>
                  );
             }

             const tableDef = instance.customTables?.find(t => t.id === node.tableId);
             
             if (tableDef) return renderDynamicTable(tableDef);
             
             return (
                <div className="relative z-10 mb-6 break-inside-avoid p-4 border-2 border-dashed border-slate-300 bg-slate-50 text-center print:hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase">[Table Placeholder: {node.label}]</p>
                    <p className="text-[10px] text-slate-400">Table ID "{node.tableId}" not found.</p>
                </div>
             );
        }

        if (node.type === 'SIGNATURE') {
            return renderSignatureBox(node);
        }

        if (node.type === 'SECTION') {
            return (
                <div key={node.id} className="relative z-10 mb-6 break-inside-avoid">
                    <h3 className="font-bold uppercase mb-2 border-b border-black inline-block text-sm">{node.label}</h3>
                    <ul className="list-decimal pl-5 space-y-2 text-justify">
                        {node.children?.map(child => (
                            <React.Fragment key={child.id}>
                                {renderNode(child, depth + 1)}
                            </React.Fragment>
                        ))}
                    </ul>
                </div>
            );
        }

        if (node.type === 'CLAUSE') {
            return (
                <li key={node.id} className="pl-1">
                    {replaceVariables(node.text || '')}
                </li>
            );
        }
        
        return null;
    };

    return (
        <div className="relative h-full flex flex-col bg-slate-100">
            {/* 
                PRINT STYLE INJECTION 
                This is the "Enterprise Grade" fix. It hides everything in 'body' and then
                force-shows only the #contract-print-area div at absolute 0,0.
            */}
            <style>{`
                @media print {
                    @page { margin: 15mm; size: A4 portrait; }
                    body { 
                        visibility: hidden !important; 
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    /* The magic class that survives visibility:hidden on body */
                    #contract-print-area {
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }
                    
                    #contract-print-area * {
                        visibility: visible !important;
                    }

                    .no-print { display: none !important; }
                    
                    /* Typography Adjustments for Print */
                    .prose { font-size: 11pt !important; line-height: 1.5 !important; }
                    
                    /* Page Break Controls */
                    .break-inside-avoid { page-break-inside: avoid; }
                    h1, h2, h3 { page-break-after: avoid; }
                }
            `}</style>

            {/* ACTION BAR (Top Toolbar - Hidden in Print) */}
            <div className="bg-white border-b border-slate-200 p-3 px-6 flex justify-between items-center no-print shrink-0 shadow-sm z-30">
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                     <AlertCircle size={16} className="text-blue-500"/>
                     <span>Preview Mode</span>
                 </div>
                 <button 
                    onClick={handlePrintPDF}
                    className="flex items-center text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                 >
                     <Printer size={16} className="mr-2"/> Print / Download PDF
                 </button>
            </div>

            {/* SCROLLABLE PREVIEW AREA */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center custom-scrollbar">
                
                {/* A4 Page Container (The Printable Part) */}
                <div 
                    id="contract-print-area"
                    className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] relative text-slate-900 font-serif text-xs leading-relaxed"
                >
                    
                    {/* WATERMARK */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                        <img src={instance.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/4/4a/Maxwell_Logo.jpg"} className="w-[150%] transform -rotate-12 grayscale" alt="Watermark" />
                    </div>

                    {/* --- HEADER LOGO --- */}
                    <div className="relative z-10 mb-8 text-center border-b-2 border-slate-900 pb-6">
                        <img src={instance.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/4/4a/Maxwell_Logo.jpg"} className="h-12 mx-auto mb-4" alt="Logo" />
                        <h1 className="text-2xl font-bold uppercase tracking-[0.2em] mb-1">{instance.documentTitle || 'Customer Agreement'}</h1>
                        <p className="font-bold text-slate-500 text-sm tracking-widest uppercase">{instance.documentSubtitle || 'Maxwell Leadership Certified Team'}</p>
                    </div>

                    {/* --- DYNAMIC HEADER GRID --- */}
                    {renderDynamicHeader()}

                    {/* --- MAIN CONTENT (Tree Traversal) --- */}
                    <div className="space-y-4 font-sans">
                        {instance.rootNodes && instance.rootNodes.length > 0 ? (
                            instance.rootNodes.map(node => renderNode(node))
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic no-print border-2 border-dashed border-slate-200 rounded-xl">
                                Document content is empty. Please add sections in the template editor.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractViewer;
