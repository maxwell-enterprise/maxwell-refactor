
import React, { useState, useEffect } from 'react';
import { QRService } from '../../services/qrService';
import { AttendanceService } from '../../services/attendanceService';
import { DataService } from '../../services/dataService';
import { ScanResult } from '../../types/qr';
import { Member, Event } from '../../types/index';
import { GateDefinition, ScanValidationResult, EventGateConfig } from '../../types/attendance';
import { ATTENDANCE_TEST_GATES } from '../../seeds/attendance_testing';
import { Camera, X, CheckCircle, AlertTriangle, ShieldCheck, User, Calendar, ChevronDown, RefreshCw, LogIn, Lock } from 'lucide-react';
import QRScanner from '../common/QRScanner';
import UpsellPrompt from './UpsellPrompt'; 
import { useAuth } from '../../context/AuthContext';

const GateScannerView: React.FC = () => {
  const { user } = useAuth();
  // CONFIGURATION STATE (The Setup Phase)
  const [config, setConfig] = useState<{ eventId: string; gateId: string } | null>(null);
  
  // SCANNER STATE
  const [showScanner, setShowScanner] = useState(false);
  const [validationResult, setValidationResult] = useState<ScanValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false); // Legacy: For guests
  
  // DATA STATE
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedGateId, setSelectedGateId] = useState<string>('');
  const [availableGates, setAvailableGates] = useState<EventGateConfig[]>([]); // Dynamic gates based on selection
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  // Initial Load of Events
  useEffect(() => {
      if (user) {
        loadActiveEvents();
      }
  }, [user]);

  // Update Available Gates when Event Changes
  useEffect(() => {
      if (!selectedEventId || !user) {
          setAvailableGates([]);
          return;
      }
      
      const event = activeEvents.find(e => e.id === selectedEventId);
      if (event) {
          // If event has custom gate config, use it. Filter by assigned user.
          if (event.gates && event.gates.length > 0) {
              const myGates = event.gates.filter(g => 
                  g.isActive && (g.assignedUserIds.includes(user.id) || user.role === 'Super Admin')
              );
              setAvailableGates(myGates);
              
              // Auto-select if only one
              if (myGates.length === 1) {
                  setSelectedGateId(myGates[0].id);
              } else {
                  setSelectedGateId('');
              }
          } else {
              // Fallback to static seed for legacy/testing events ONLY if they have no gates defined
              // This is a safety catch, but primarily we rely on the event.gates
              setAvailableGates(ATTENDANCE_TEST_GATES.map(g => ({
                  id: g.id,
                  name: g.label,
                  allowedTiers: g.allowedTiers,
                  assignedUserIds: [], // Public in test mode
                  isActive: true
              })));
          }
      }
  }, [selectedEventId, user, activeEvents]);

  const loadActiveEvents = async () => {
      setLoadingEvents(true);
      const allEvents = await DataService.getEvents();
      
      // STRICT FILTERING LOGIC
      const relevant = allEvents.filter(e => {
          // 1. Admins see all future events
          if (user?.role === 'Super Admin') return true;

          // 2. Assigned Gatekeepers ONLY see events they are assigned to
          if (e.gates && e.gates.length > 0) {
             const isAssigned = e.gates.some(g => g.isActive && g.assignedUserIds.includes(user?.id || ''));
             return isAssigned;
          }
          
          // 3. Fallback: If no gate logic exists, we hide it from the "Gate Scanner" view
          // because Gate Keepers should only work on assigned events.
          return false; 
      }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setActiveEvents(relevant);
      
      // Auto-select if only one event matches
      if (relevant.length === 1) {
          setSelectedEventId(relevant[0].id);
      }
      
      setLoadingEvents(false);
  };

  const handleLockConfiguration = () => {
      if (!selectedEventId || !selectedGateId) return;
      setConfig({ eventId: selectedEventId, gateId: selectedGateId });
      setShowScanner(true); // Auto-start
  };

  const handleExitConfiguration = () => {
      if (confirm("Exit Scanner Mode?")) {
          setConfig(null);
          setShowScanner(false);
          setValidationResult(null);
      }
  };

  const handleScan = async (result: ScanResult) => {
    setError(null);
    setValidationResult(null);
    setShowUpsell(false);

    if (!result.success) {
      setError(result.message);
      return;
    }
    
    if (!config) return;

    try {
        // SMART VALIDATION CALL
        // Note: For dynamic gates, we pass the gateId. The service will need to look up 
        // the event's specific gate config if it exists, or fall back to static seed.
        const validation = await AttendanceService.validateGateEntry(
            result.message, 
            config.eventId, 
            config.gateId
        );
        
        setValidationResult(validation);
        setShowScanner(false); // Pause scanner to show result

    } catch (e: any) {
        setError(e.message || "System Error during validation.");
        setShowScanner(false);
    }
  };

  // --- RENDER: SETUP SCREEN ---
  if (!config) {
      return (
        <div className="min-h-[calc(100vh-100px)] bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="p-4 bg-blue-600/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto border-2 border-blue-500/50 mb-6">
                        <ShieldCheck size={40} className="text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Gate Scanner Setup</h1>
                    <p className="text-slate-400 mt-2">
                        Logged in as: <span className="text-white font-bold">{user?.fullName}</span>
                    </p>
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Active Event</label>
                        <div className="relative">
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm appearance-none outline-none focus:border-blue-500 text-white"
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                disabled={loadingEvents}
                            >
                                <option value="">
                                    {activeEvents.length === 0 ? '-- No Assigned Events Found --' : '-- Choose Event --'}
                                </option>
                                {activeEvents.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({new Date(e.date).toLocaleDateString()})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Your Assigned Gate</label>
                        {availableGates.length === 0 ? (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-red-400 text-xs">
                                {selectedEventId ? "No gates assigned to you for this event." : "Select an event first."}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {availableGates.map(gate => (
                                    <button
                                        key={gate.id}
                                        onClick={() => setSelectedGateId(gate.id)}
                                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                                            selectedGateId === gate.id 
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-bold text-sm">{gate.name}</div>
                                            <div className="text-[10px] opacity-70">
                                                Allowed: {gate.allowedTiers.join(', ')}
                                            </div>
                                        </div>
                                        {selectedGateId === gate.id && <CheckCircle size={18}/>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleLockConfiguration}
                        disabled={!selectedEventId || !selectedGateId}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} /> Initialize Scanner
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER: ACTIVE SCANNER MODE ---
  const activeEvent = activeEvents.find(e => e.id === config.eventId);
  const fallbackGate = availableGates.find((gate) => gate.id === config.gateId);
  
  // Find gate info either from event.gates OR fallback seeds
  let activeGateName = config.gateId;
  const gateFromEvent = activeEvent?.gates?.find(g => g.id === config.gateId);
  const gateFromSeed = ATTENDANCE_TEST_GATES.find(g => g.id === config.gateId);
  if (gateFromEvent) activeGateName = gateFromEvent.name;
  else if (fallbackGate) activeGateName = fallbackGate.name;
  else if (gateFromSeed) activeGateName = gateFromSeed.label;

  return (
    <div className="min-h-[calc(100vh-100px)] bg-black flex flex-col items-center justify-center p-6 text-white relative">
      
      {/* Top Bar Info */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent z-10">
          <div className="flex justify-between items-start">
              <div>
                  <h3 className="font-bold text-sm text-white">{activeEvent?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded font-bold">ACTIVE</span>
                      <span className="text-xs text-slate-300">{activeGateName}</span>
                  </div>
              </div>
              <button onClick={handleExitConfiguration} className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white">
                  <Lock size={16}/>
              </button>
          </div>
      </div>

      <div className="max-w-md w-full w-full flex-1 flex flex-col justify-center">
        
        {validationResult ? (
            // RESULT CARD
            <div className="animate-scale-in">
                <div className={`rounded-3xl p-8 text-center shadow-2xl ${
                    validationResult.status === 'ALLOWED' ? 'bg-white text-slate-900' :
                    validationResult.status === 'WRONG_GATE' ? 'bg-yellow-400 text-yellow-900' :
                    'bg-red-600 text-white'
                }`}>
                    <div className="mb-6 flex justify-center">
                        {validationResult.status === 'ALLOWED' && <CheckCircle size={64} className="text-green-500"/>}
                        {validationResult.status === 'WRONG_GATE' && <AlertTriangle size={64} className="text-yellow-800"/>}
                        {validationResult.status === 'DENIED' && <X size={64} className="text-white"/>}
                    </div>
                    
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                        {validationResult.status === 'ALLOWED' ? 'ACCESS GRANTED' : 
                         validationResult.status === 'WRONG_GATE' ? 'WRONG GATE' : 
                         'ACCESS DENIED'}
                    </h2>
                    
                    <p className="text-lg font-medium opacity-90 mb-6 leading-relaxed">
                        {validationResult.message}
                    </p>

                    {validationResult.suggestedGate && (
                        <div className="bg-black/10 p-4 rounded-xl mb-6">
                            <p className="text-sm font-bold uppercase tracking-widest opacity-70 mb-1">Please Direct To</p>
                            <p className="text-2xl font-black">{validationResult.suggestedGate}</p>
                        </div>
                    )}

                    {validationResult.member && (
                        <div className={`text-left p-4 rounded-xl ${validationResult.status === 'ALLOWED' ? 'bg-slate-50' : 'bg-black/10'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold uppercase opacity-60">Attendee</span>
                                <span className="text-xs font-bold uppercase opacity-60">Tier</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg">{validationResult.member.name}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${validationResult.status === 'ALLOWED' ? 'bg-slate-200' : 'bg-black/20'}`}>
                                    {validationResult.member.tier}
                                </span>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => { setValidationResult(null); setShowScanner(true); }}
                        className={`mt-8 w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform ${
                            validationResult.status === 'ALLOWED' ? 'bg-slate-900 text-white' : 
                            'bg-white/20 text-inherit hover:bg-white/30'
                        }`}
                    >
                        Scan Next
                    </button>
                </div>
            </div>
        ) : error ? (
            // GENERIC ERROR CARD
            <div className="bg-red-50 text-red-900 p-8 rounded-3xl text-center animate-fade-in">
                 <AlertTriangle size={48} className="mx-auto mb-4 text-red-600" />
                 <h3 className="text-xl font-bold mb-2">Scan Error</h3>
                 <p className="mb-6">{error}</p>
                 <button onClick={() => { setError(null); setShowScanner(true); }} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">Try Again</button>
            </div>
        ) : (
            // IDLE STATE
            <button 
                onClick={() => setShowScanner(true)}
                className="w-full h-80 border-4 border-dashed border-white/20 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:bg-white/5 transition-all group"
            >
                <div className="p-8 bg-blue-600 rounded-full shadow-2xl shadow-blue-900/50 group-active:scale-95 transition-transform">
                    <Camera size={48} />
                </div>
                <div className="text-center">
                    <span className="text-xl font-bold block">Tap to Scan</span>
                    <span className="text-sm text-slate-400">Ready for next attendee</span>
                </div>
            </button>
        )}
      </div>

      <QRScanner 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
};

export default GateScannerView;
