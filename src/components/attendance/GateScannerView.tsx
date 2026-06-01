
import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceService } from '../../services/attendanceService';
import { DataService } from '../../services/dataService';
import { ApiAttendanceService } from '../../services/apiAttendanceService';
import { AttendanceOfflineService } from '../../services/attendanceOfflineService';
import { ScanResult } from '../../types/qr';
import { Event, UserRole } from '../../types/index';
import { ScanValidationResult, EventGateConfig } from '../../types/attendance';
import { Camera, X, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown, LogIn, Lock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import QRScanner from '../common/QRScanner';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { publishAttendanceUpdated } from '../../services/attendanceRealtime';

const GateScannerView: React.FC = () => {
  const { user } = useAuth();
  const { confirm } = useDialog();
  // CONFIGURATION STATE (The Setup Phase)
  const [config, setConfig] = useState<{ eventId: string; gateId: string } | null>(null);
  
  // SCANNER STATE
  const [showScanner, setShowScanner] = useState(false);
  const [validationResult, setValidationResult] = useState<ScanValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
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

  useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

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
              const myGates = event.gates.filter((g) => {
                  if (!g.isActive) return false;
                  if (
                      user.role === UserRole.SUPER_ADMIN ||
                      user.role === UserRole.OPERATIONS
                  ) {
                      return true;
                  }
                  return g.assignedUserIds.includes(user.id);
              });
              setAvailableGates(myGates);
              
              // Auto-select if only one
              if (myGates.length === 1) {
                  setSelectedGateId(myGates[0].id);
              } else {
                  setSelectedGateId('');
              }
          } else {
              setAvailableGates([]);
              setSelectedGateId('');
          }
      }
  }, [selectedEventId, user, activeEvents]);

  const loadActiveEvents = async () => {
      setLoadingEvents(true);
      const allEvents = await DataService.getEvents();
      
      // STRICT FILTERING LOGIC
      const relevant = allEvents
          .filter((e) => {
              if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.OPERATIONS) {
                  return true;
              }
              if (e.gates && e.gates.length > 0) {
                  return e.gates.some(
                      (g) => g.isActive && g.assignedUserIds.includes(user?.id || ''),
                  );
              }
              return false;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setActiveEvents(relevant);
      
      // Auto-select if only one event matches
      if (relevant.length === 1) {
          setSelectedEventId(relevant[0].id);
      }
      
      setLoadingEvents(false);
  };

  const refreshPendingSyncCount = useCallback(async () => {
      const pending = await AttendanceOfflineService.listPending();
      setPendingSyncCount(pending.length);
  }, []);

  const syncPendingQueue = useCallback(async () => {
      if (!config || !deviceId || !isOnline) return;

      const pending = await AttendanceOfflineService.listPending();
      if (pending.length === 0) return;

      try {
          const response = await ApiAttendanceService.syncOfflineCheckins({
              deviceId,
              items: pending.map((item) => ({
                  offlineId: item.offlineId,
                  qrString: item.qrString,
                  eventId: item.eventId,
                  gateId: item.gateId,
                  scannedAt: item.scannedAt,
              })),
          });

          await Promise.all(
              pending.map(async (item, index) => {
                  const result = response.results[index];
                  if (result?.success) {
                      await AttendanceOfflineService.markSynced(item.id);
                      publishAttendanceUpdated({
                          eventId: item.eventId,
                          method: 'GATE_SCAN',
                          status: 'SUCCESS',
                          gateId: item.gateId,
                          scannedAt: item.scannedAt,
                        });
                  } else {
                      await AttendanceOfflineService.markFailed(
                          item.id,
                          result?.message || 'Sync failed',
                      );
                  }
              }),
          );

          setLastSyncAt(new Date().toISOString());
          await refreshPendingSyncCount();
      } catch (syncError) {
          const message =
              syncError instanceof Error ? syncError.message : 'Offline sync failed';
          await Promise.all(
              pending.map((item) =>
                  AttendanceOfflineService.markFailed(item.id, message),
              ),
          );
          await refreshPendingSyncCount();
      }
  }, [config, deviceId, isOnline, refreshPendingSyncCount]);

  useEffect(() => {
      void refreshPendingSyncCount();
  }, [refreshPendingSyncCount]);

  useEffect(() => {
      if (!config || !user) return;

      const nextDeviceId = AttendanceOfflineService.getOrCreateDeviceId();
      setDeviceId(nextDeviceId);

      if (!isOnline) return;

      void ApiAttendanceService.registerScannerDevice({
          deviceId: nextDeviceId,
          deviceName: `${user.fullName} - Gate Scanner`,
          eventId: config.eventId,
          gateId: config.gateId,
      })
          .then((device) => {
              if (device.lastSyncAt) {
                  setLastSyncAt(device.lastSyncAt);
              }
          })
          .catch(() => {
              // best effort; sync route will still retry when the network is stable
          });
  }, [config, user, isOnline]);

  useEffect(() => {
      if (!config) return;
      void syncPendingQueue();
      const intervalId = window.setInterval(() => {
          void syncPendingQueue();
      }, 30000);
      return () => window.clearInterval(intervalId);
  }, [config, syncPendingQueue]);

  const handleLockConfiguration = () => {
      if (!selectedEventId || !selectedGateId) return;
      setConfig({ eventId: selectedEventId, gateId: selectedGateId });
      setShowScanner(true); // Auto-start
  };

  const handleExitConfiguration = async () => {
      const ok = await confirm({
          title: 'Leave Gate Scanner?',
          message: 'Event and gate configuration will be reset.',
          variant: 'warning',
          confirmLabel: 'Leave',
      });
      if (!ok) return;
      setConfig(null);
      setShowScanner(false);
      setValidationResult(null);
      setDeviceId('');
  };

  const queueOfflineScan = useCallback(async (raw: string) => {
      if (!config) return;
      const activeDeviceId =
          deviceId || AttendanceOfflineService.getOrCreateDeviceId();
      setDeviceId(activeDeviceId);
      await AttendanceOfflineService.enqueueScan({
          qrString: raw,
          eventId: config.eventId,
          gateId: config.gateId,
          deviceId: activeDeviceId,
      });
      await refreshPendingSyncCount();
      setValidationResult({
          status: 'ALLOWED',
          message:
              'Offline mode: scan saved locally and queued for sync. Access granted pending backend verification.',
      });
      setShowScanner(false);
  }, [config, deviceId, refreshPendingSyncCount]);

  const handleScan = async (result: ScanResult) => {
    if (isValidating) return;

    setError(null);
    setValidationResult(null);
    if (!result.success) {
      setError(result.message);
      return;
    }

    const raw =
      typeof result.qrPayload === 'string' && result.qrPayload.trim()
        ? result.qrPayload.trim()
        : typeof result.message === 'string' && result.message.includes(':')
          ? result.message.trim()
          : '';
    if (!raw) {
      setError('QR is invalid or empty.');
      return;
    }

    if (
      raw.startsWith('EVENT_ATTENDANCE:') ||
      raw.startsWith('EVENT:')
    ) {
      setValidationResult({
        status: 'DENIED',
        message:
          'Wrong QR scanned. This is the member self check-in QR from the projector, not a gate entry ticket QR.',
      });
      setShowScanner(false);
      return;
    }

    if (!config) return;

    if (!isOnline) {
      await queueOfflineScan(raw);
      return;
    }

    try {
        setIsValidating(true);
        setShowScanner(false);
        const validation = await AttendanceService.validateGateEntry(
            raw,
            config.eventId,
            config.gateId,
            { deviceId: deviceId || undefined },
        );
        
        setValidationResult(validation);

    } catch (e: any) {
        const message = e?.message || "System Error during validation.";
        if (
            typeof message === 'string' &&
            (message.includes('Network error:') ||
             message.includes('Service unavailable') ||
             message.includes('Failed to fetch'))
        ) {
            await queueOfflineScan(raw);
        } else {
            setError(message);
        }
    } finally {
        setIsValidating(false);
    }
  };

  // --- RENDER: SETUP SCREEN ---
  if (!config) {
      return (
        <div className="flex min-h-0 w-full flex-1 flex-col bg-slate-900 px-4 py-6 text-white sm:px-6">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center space-y-8 py-4">
                <div className="text-center">
                    <div className="p-4 bg-blue-600/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto border-2 border-blue-500/50 mb-6">
                        <ShieldCheck size={40} className="text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Gate Scanner Setup</h1>
                    <p className="text-slate-400 mt-2">
                        Logged in as: <span className="text-white font-bold">{user?.fullName}</span>
                    </p>
                </div>

                <div className="w-full space-y-6 rounded-2xl border border-slate-600 bg-slate-800/90 p-5 shadow-xl sm:p-6">
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
  const selectedGate = availableGates.find((gate) => gate.id === config.gateId);
  
  let activeGateName = config.gateId;
  if (selectedGate) activeGateName = selectedGate.name;

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-black px-4 py-6 text-white sm:px-6">
      
      {/* Top Bar Info */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent z-10">
          <div className="flex justify-between items-start">
              <div>
                  <h3 className="font-bold text-sm text-white">{activeEvent?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded font-bold">ACTIVE</span>
                      <span className="text-xs text-slate-300">{activeGateName}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'}`}>
                          {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>}
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1 font-bold">
                          Pending Sync: {pendingSyncCount}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1 font-bold">
                          Last Sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}
                      </span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void syncPendingQueue()}
                    className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white"
                    title="Sync pending queue"
                  >
                    <RefreshCw size={16}/>
                  </button>
                  <button type="button" onClick={() => void handleExitConfiguration()} className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white">
                      <Lock size={16}/>
                  </button>
              </div>
          </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-4">
        
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
        ) : isValidating ? (
            <div className="bg-slate-900/90 border border-slate-700 text-white p-8 rounded-3xl text-center animate-fade-in shadow-2xl">
                 <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                    <Camera size={30} className="animate-pulse" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">Validating Ticket</h3>
                 <p className="text-slate-300">Please wait while Maxwell verifies event access and gate tier.</p>
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
                    <span className="text-xl font-bold block">
                        {isValidating ? 'Validating...' : 'Tap to Scan'}
                    </span>
                    <span className="text-sm text-slate-400">
                        {isValidating ? 'Please wait for the current result' : 'Ready for next attendee'}
                    </span>
                </div>
            </button>
        )}
      </div>

      <QRScanner
        purpose="gate"
        isOpen={showScanner && !isValidating}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
};

export default GateScannerView;
