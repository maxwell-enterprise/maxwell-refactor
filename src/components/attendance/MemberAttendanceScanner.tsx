
import React, { useState } from 'react';
import { QRService } from '../../services/qrService';
import { AttendanceService } from '../../services/attendanceService';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Member, Event, AttendanceRecord } from '../../types/index';
import { ScanResult } from '../../types/qr';
import { Camera, QrCode, Sparkles, X, AlertTriangle } from 'lucide-react';
import QRScanner from '../common/QRScanner';
import AttendanceConfirmation from './AttendanceConfirmation';

const MemberAttendanceScanner: React.FC = () => {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [confirmation, setConfirmation] = useState<AttendanceRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async (result: ScanResult) => {
    if (!result.success || !user) return;
    setScanError(null);

    // Logic: Scanned QR should be an Event ID from the screen
    // We assume the screen QR format is "EVENT_ATTENDANCE:EVENT_ID" or just "EVENT:EVENT_ID"
    const raw = result.message;
    const qrParts = raw.split(':');
    
    // Check if it's a valid Event QR
    if ((qrParts[0] === 'EVENT_ATTENDANCE' || qrParts[0] === 'EVENT') && qrParts[1]) {
        const eventId = qrParts[1];
        
        const event = await DataService.getEvents().then((events) =>
            events.find((item) => item.id === eventId),
        );
        
        if (!event) {
            setScanError("Invalid Event Code. Please scan the official screen.");
            setShowScanner(false);
            return;
        }

        const memberObj = { id: user.id, name: user.fullName, email: user.email, phone: '000' } as Member;
        
        try {
            const record = await AttendanceService.recordAttendance(
                memberObj,
                event,
                'SELF_SCAN',
                { venueQr: raw },
            );
            setConfirmation(record);
            setShowScanner(false);
        } catch (error: any) {
            const message = String(error?.message || 'Attendance failed. Please try again.');
            if (message.includes('ACCESS_DENIED:')) {
                setScanError(message.replace('ACCESS_DENIED:', '').trim());
            } else {
                setScanError(message);
            }
            setShowScanner(false);
        }
    } else {
        setScanError("Invalid QR Code type. Please scan the Event QR on the screen.");
        setShowScanner(false);
    }
  };

  if (confirmation) {
    return <AttendanceConfirmation record={confirmation} onBack={() => setConfirmation(null)} status="SUCCESS" />;
  }

  // --- ERROR SCREEN (RED) ---
  if (scanError) {
      return (
          <div className="page-container flex min-h-[50vh] flex-col items-center justify-center bg-red-600 py-10 text-center text-white animate-fade-in sm:min-h-[60vh] sm:py-16">
              <div className="bg-white/20 p-6 rounded-full mb-6 animate-pulse">
                  <X size={64} />
              </div>
              <h1 className="mb-2 text-2xl font-black uppercase tracking-widest sm:text-3xl">Access Denied</h1>
              <p className="mb-8 max-w-xs text-base text-red-100 sm:text-lg">
                  {scanError}
              </p>
              
              <button 
                onClick={() => setScanError(null)}
                className="w-full max-w-sm bg-white text-red-600 py-4 rounded-2xl font-bold shadow-xl hover:bg-red-50 transition-all"
              >
                  Try Again
              </button>
          </div>
      );
  }

  return (
    <div className="page-container flex w-full flex-col items-center justify-center animate-fade-in sm:py-4">
        <div className="w-full max-w-sm space-y-6 text-center">
            <div className="bg-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
                <QrCode size={36} className="text-white" />
            </div>
            
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Self Attendance</h1>
                <p className="text-slate-500 mt-2 text-sm">Scan the QR code displayed on the projector screen to mark your presence.</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">1</div>
                    <p className="text-xs text-slate-600 font-medium">Wait for the facilitator to show the attendance QR.</p>
                </div>
                <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">2</div>
                    <p className="text-xs text-slate-600 font-medium">Open your camera via the button below.</p>
                </div>
                <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">3</div>
                    <p className="text-xs text-slate-600 font-medium">Point your device at the screen and verify.</p>
                </div>
            </div>

            <button 
                onClick={() => setShowScanner(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95"
            >
                <Camera size={20} />
                Open Scanner
            </button>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">Powered by Maxwell Wisdom Engine</p>
        </div>

        <QRScanner
            purpose="legacy"
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onScan={handleScan}
        />
    </div>
  );
};

export default MemberAttendanceScanner;
