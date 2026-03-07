
import React, { useState } from 'react';
import { TaxInvoiceDetails } from '../../types/business_specifics';
import { SpecificBusinessService } from '../../services/specificBusinessService';
import { FileText, Building, Hash, DollarSign, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const TaxInvoiceForm: React.FC<{ transactionId: string, amount: number, onClose: () => void }> = ({ transactionId, amount, onClose }) => {
    const { showToast } = useToast();
    const [details, setDetails] = useState<Partial<TaxInvoiceDetails>>({
        transactionId,
        taxAmount: Math.round(amount * 0.11) // 11% PPN Default
    });

    const handleSave = async () => {
        if(!details.npwp || !details.fakturPajakNo) {
            showToast('NPWP and Faktur No are required', 'error');
            return;
        }
        await SpecificBusinessService.generateFakturPajak(details as TaxInvoiceDetails);
        showToast('Faktur Pajak data saved', 'success');
        onClose();
    };

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 animate-fade-in">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center">
                <FileText size={16} className="mr-2 text-green-600"/> Tax Invoice (Faktur Pajak)
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company / Entity Name</label>
                    <div className="relative">
                        <Building size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" className="w-full pl-8 p-2 text-xs border rounded" placeholder="PT..." value={details.companyName || ''} onChange={e => setDetails({...details, companyName: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NPWP</label>
                    <div className="relative">
                        <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="text" className="w-full pl-8 p-2 text-xs border rounded" placeholder="00.000.000..." value={details.npwp || ''} onChange={e => setDetails({...details, npwp: e.target.value})} />
                    </div>
                </div>
            </div>
            <div className="mb-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Seri Faktur Pajak</label>
                <input type="text" className="w-full p-2 text-xs border rounded font-mono" placeholder="010.000-..." value={details.fakturPajakNo || ''} onChange={e => setDetails({...details, fakturPajakNo: e.target.value})} />
            </div>
            <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-slate-600">
                    PPN (11%): <span className="text-slate-900">{new Intl.NumberFormat('id-ID').format(details.taxAmount || 0)}</span>
                </div>
                <button onClick={handleSave} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center">
                    <Save size={12} className="mr-1"/> Save Tax Data
                </button>
            </div>
        </div>
    );
};

export default TaxInvoiceForm;
