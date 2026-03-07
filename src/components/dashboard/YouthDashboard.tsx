
import React, { useState, useEffect } from 'react';
import { SpecificBusinessService } from '../../services/specificBusinessService';
import { YouthMetric } from '../../types/business_specifics';
import { School, Users, CheckCircle, BarChart3, TrendingUp } from 'lucide-react';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';

const YouthDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<YouthMetric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        SpecificBusinessService.getYouthMetrics().then(data => {
            setMetrics(data);
            setLoading(false);
        });
    }, []);

    const totalStudents = metrics.reduce((acc, m) => acc + m.studentsImpacted, 0);
    const activeSchools = metrics.filter(m => m.status === 'PROGRAM_ACTIVE').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <School className="mr-3 text-purple-600" /> Maxwell Youth Impact
                    </h1>
                    <p className="text-slate-500 mt-1">Tracking student engagement across Indonesia.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Students Impacted</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{totalStudents.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Active Schools</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{activeSchools}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Programs Deployed</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
                    School Partnership Status
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Institution</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Program</th>
                            <th className="p-4">Students</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {metrics.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-900">{m.schoolName}</td>
                                <td className="p-4 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        {m.contactPerson}
                                        <WhatsAppQuickAction 
                                            phone="628123456789" // Mock phone
                                            name={m.contactPerson}
                                            context="YOUTH_SCHOOL"
                                            variant="icon"
                                            compact
                                            contextData={{
                                                member_name: m.contactPerson, // Using generic 'member_name' var for contact name
                                                company_name: m.schoolName
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="p-4 text-slate-600">{m.programType}</td>
                                <td className="p-4 font-mono font-bold">{m.studentsImpacted}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                        m.status === 'PROGRAM_ACTIVE' ? 'bg-green-100 text-green-700' :
                                        m.status === 'MOU_SIGNED' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {m.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default YouthDashboard;
