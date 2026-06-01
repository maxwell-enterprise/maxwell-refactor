
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types/index';
import { Search, Download, Calendar, Filter, User } from 'lucide-react';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';

const getAttendanceMethodLabel = (method: AttendanceRecord['method']) => {
  switch (method) {
    case 'SELF_SCAN':
      return 'Self Check-In';
    case 'LINK_CLICKED':
      return 'Online Join';
    case 'ADMIN_OVERRIDE':
      return 'Admin Override';
    default:
      return 'Gate Scan';
  }
};

const AttendanceReport: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    AttendanceService.getAttendance().then(data => {
      setRecords(data);
      setLoading(false);
    });
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.eventName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const handleExport = () => {
    AttendanceService.exportAttendanceToCSV(filteredRecords, 'Full_Report');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                    <Calendar className="mr-3 text-blue-600" /> Attendance Ledger
                </h1>
                <p className="text-slate-500 mt-1">Audit trail of all event check-ins.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm">
                    <Download size={16} className="mr-2"/> Export CSV
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by name or event..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-4">Member</th>
                            <th className="p-4">Event</th>
                            <th className="p-4">Scan Time</th>
                            <th className="p-4">Method</th>
                            <th className="p-4">Code</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading records...</td></tr>
                        ) : filteredRecords.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No records found.</td></tr>
                        ) : (
                            filteredRecords.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                        {r.memberName}
                                        <WhatsAppQuickAction 
                                            phone={r.memberEmail === 'david.t@maxwell.com' ? '628188899900' : '628123456789'} // Mock phone lookup
                                            name={r.memberName}
                                            context="EVENT_ATTENDANCE"
                                            variant="icon"
                                            compact
                                            contextData={{
                                                member_name: r.memberName,
                                                event_name: r.eventName,
                                                checkin_time: new Date(r.scannedAt).toLocaleTimeString()
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-400">{r.memberEmail}</div>
                                  </td>
                                  <td className="p-4 text-slate-700">{r.eventName}</td>
                                  <td className="p-4 font-mono text-xs text-slate-500">{new Date(r.scannedAt).toLocaleString()}</td>
                                  <td className="p-4">
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${
                                        r.method === 'GATE_SCAN'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : r.method === 'LINK_CLICKED'
                                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                            : r.method === 'ADMIN_OVERRIDE'
                                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                          {getAttendanceMethodLabel(r.method)}
                                      </span>
                                  </td>
                                  <td className="p-4 font-mono text-xs font-bold">
                                      <span style={{color: r.eventColor}}>●</span> {r.verificationCode}
                                  </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default AttendanceReport;
