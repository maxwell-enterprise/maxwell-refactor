import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, ArrowRight, Loader2, ShieldCheck, User, Users, Briefcase, Crown, Star, UserPlus, Search, KeyRound, X } from 'lucide-react';
import { UserRole, UserProfile, Member } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService'; 
import { DataService } from '../../services/dataService'; 
import { useToast } from '../../context/ToastContext';
import { workspaceApiUrl } from '../../lib/workspaceApi';
import { setWorkspaceToken } from '../../lib/workspaceAuthToken';
import { stashOAuthReturnSearch } from '../../lib/postAuthNavigation';

/** Nest `/fe/auth/*` — identity di backend, bukan Next/Prisma. */
const USE_WORKSPACE =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_WORKSPACE_AUTH !== 'false';
const RECENT_EMAILS_KEY = 'maxwell_recent_login_emails';
const RECENT_EMAILS_LIMIT = 6;

interface ModernLoginProps {
  onLogin: (role: UserRole, provider: 'google' | 'email') => void;
  onClose: () => void;
}

const ModernLogin: React.FC<ModernLoginProps> = ({ onLogin, onClose }) => {
  const { showToast } = useToast();
  const { login } = useAuth(); // Use login from context to access the new signature
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'INPUT' | 'OTP' | 'EMAIL_SENT' | 'SENT' | 'DEV_SELECT'>('INPUT');
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  
  // Dev Mode Data
  const [devUsers, setDevUsers] = useState<UserProfile[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, Member>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'JOURNEY'>('INTERNAL');
  const lastGoogleHintAt = useRef(0);

  useEffect(() => {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(RECENT_EMAILS_KEY);
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .map((v) => String(v ?? '').trim().toLowerCase())
              .filter(Boolean)
              .slice(0, RECENT_EMAILS_LIMIT);
            setRecentEmails(cleaned);
          }
        } catch {
          /* ignore */
        }
      }
      if (USE_WORKSPACE) return;
      const loadDevUsers = async () => {
          const [users, members] = await Promise.all([
              UserService.getAllUsers(),
              DataService.getMembers()
          ]);
          setDevUsers(users);
          const map: Record<string, Member> = {};
          members.forEach(m => map[m.id] = m);
          setMemberMap(map);
      };
      void loadDevUsers();
  }, []);

  const rememberEmail = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return;
    const next = [normalized, ...recentEmails.filter((e) => e !== normalized)].slice(
      0,
      RECENT_EMAILS_LIMIT,
    );
    setRecentEmails(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    rememberEmail(email);

    if (USE_WORKSPACE) {
      setIsLoading(true);
      // Start a fresh auth attempt: clear potentially stale local JWT first.
      setWorkspaceToken(null);
      try {
        const res = await fetch(workspaceApiUrl('/auth/email/send'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            returnSearch:
              typeof window !== 'undefined' ? window.location.search || '' : '',
          }),
        });
        if (!res.ok) {
          let msg =
            'Could not send email link. Check auth provider configuration on the API and try again.';
          if (res.status === 503) {
            msg =
              'The API could not reach the email provider (network). Fix server internet/DNS or try again later.';
          } else {
            try {
              const data = (await res.json()) as {
                message?: string | string[];
              };
              if (typeof data?.message === 'string') msg = data.message;
              else if (Array.isArray(data?.message))
                msg = data.message.join(', ');
            } catch {
              /* non-JSON body */
            }
          }
          showToast(msg, 'error');
          return;
        }
        setStep('EMAIL_SENT');
        showToast('Check your inbox for the sign-in link.', 'success');
      } catch {
        showToast(
          'Cannot reach the auth API. Start the Nest server (e.g. port 3002) and try again.',
          'error',
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('OTP');
    }, 1000);
  };
  
  const handleVerifyOTP = async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp === '12345') {
          // Pass the email to login so it finds the REAL profile (including shadow members)
          await login(UserRole.MEMBER, email, 'email');
          onClose(); 
          showToast("Login successful. Welcome!", "success");
      } else {
          showToast("Invalid OTP. For demo use: 12345", "error");
      }
  };

  const handleGoogleOAuth = async () => {
    if (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'false') {
      showToast('Google login is disabled (NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false).', 'info');
      return;
    }
    if (!USE_WORKSPACE) {
      const now = Date.now();
      if (now - lastGoogleHintAt.current > 4000) {
        lastGoogleHintAt.current = now;
        showToast(
          'For Google sign-in: ensure auth provider config is complete on the API, or use email + OTP (demo: 12345).',
          'info',
        );
      }
      return;
    }
    setIsLoading(true);
    // Start a fresh auth attempt: clear potentially stale local JWT first.
    setWorkspaceToken(null);
    try {
      const health = await fetch(workspaceApiUrl('/health'), {
        method: 'GET',
        cache: 'no-store',
      });
      if (!health.ok) {
        showToast(
          'Auth API is not ready. Start the Nest server (e.g. :3002), then try Google again.',
          'error',
        );
        return;
      }
      stashOAuthReturnSearch(window.location.search || '');
      window.location.href = workspaceApiUrl('/auth/google');
    } catch {
      showToast(
        'Cannot reach the auth API. Start the Nest server (e.g. :3002).',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevSelect = async (user: UserProfile) => {
      // Direct login with specific email
      await login(user.role, user.email, 'email');
      onClose();
  };

  // Grouping Logic
  const groupedUsers = useMemo(() => {
      const filtered = devUsers.filter(u => 
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.role.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const internalRoles = [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.OPERATIONS, UserRole.MARKETING, UserRole.SALES, UserRole.GATE_KEEPER];
      const internal = filtered.filter(u => internalRoles.includes(u.role));
      const members = filtered.filter(u => !internalRoles.includes(u.role));
      
      const byLifecycle: Record<string, UserProfile[]> = {
          'GUEST': [], 'IDENTIFIED': [], 'PARTICIPANT': [], 'MEMBER': [], 'CERTIFIED': [], 'FACILITATOR': []
      };

      members.forEach(u => {
          const m = memberMap[u.id];
          const stage = m?.lifecycleStage || 'GUEST';
          if (byLifecycle[stage]) byLifecycle[stage].push(u);
          else {
              if (!byLifecycle['GUEST']) byLifecycle['GUEST'] = [];
              byLifecycle['GUEST'].push(u);
          }
      });

      return { internal, byLifecycle };
  }, [devUsers, memberMap, searchTerm]);

  const getLifecycleIcon = (stage: string) => {
      switch(stage) {
          case 'GUEST': return <UserPlus size={14} className="text-slate-400"/>;
          case 'IDENTIFIED': return <Search size={14} className="text-blue-400"/>;
          case 'PARTICIPANT': return <Users size={14} className="text-indigo-400"/>;
          case 'MEMBER': return <Crown size={14} className="text-amber-500"/>;
          case 'CERTIFIED': return <Star size={14} className="text-purple-500"/>;
          case 'FACILITATOR': return <Briefcase size={14} className="text-green-500"/>;
          default: return <User size={14}/>;
      }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white w-full ${step === 'DEV_SELECT' ? 'max-w-4xl' : 'max-w-md'} rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-in transition-all duration-300`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 z-10 p-2 bg-white/50 rounded-full transition-colors">
            <X size={20} />
        </button>

        {step !== 'DEV_SELECT' && (
            <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="text-center z-10 flex flex-col items-center">
                    <img src="https://www.maxwellleadership.com/wp-content/themes/jm/assets/images/logo.svg" alt="Maxwell Leadership" className="h-8 w-auto invert brightness-200" />
                    <span className="text-[10px] uppercase tracking-[0.4em] text-blue-100 font-bold mt-2">Indonesia</span>
                </div>
            </div>
        )}

        <div className={step === 'DEV_SELECT' ? 'p-0 flex flex-col h-[600px]' : 'p-8'}>
            {step === 'INPUT' && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Sign in or register</h3>
                        <p className="text-slate-500 text-sm mt-1">
                          First visit with your email counts as sign-up. With Google, your name and profile photo can come from your Google account.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleGoogleOAuth()}
                        className="w-full flex items-center justify-center px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group disabled:opacity-60"
                    >
                        <img
                          src="https://www.svgrepo.com/show/475656/google-color.svg"
                          className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform"
                          alt=""
                        />
                        <span className="text-slate-700 font-medium">Continue with Google</span>
                    </button>
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          {USE_WORKSPACE ? 'Or use email link' : 'Or email + OTP (demo)'}
                        </span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    <form onSubmit={handleMagicLink} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                  type="email"
                                  required
                                  name="email"
                                  autoComplete="email"
                                  autoCapitalize="none"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  list="recent-login-emails"
                                  placeholder="name@email.com"
                                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                />
                                <datalist id="recent-login-emails">
                                  {recentEmails.map((savedEmail) => (
                                    <option key={savedEmail} value={savedEmail} />
                                  ))}
                                </datalist>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center disabled:opacity-70">
                            {isLoading ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <>
                                {USE_WORKSPACE ? 'Send sign-in link' : 'Log In with OTP'}{' '}
                                <ArrowRight size={18} className="ml-2" />
                              </>
                            )}
                        </button>
                    </form>
                    {!USE_WORKSPACE && (
                      <p className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setStep('DEV_SELECT')}
                          className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 underline decoration-slate-300 underline-offset-2"
                        >
                          Internal developer login (testing only)
                        </button>
                      </p>
                    )}
                </div>
            )}
            
            {step === 'EMAIL_SENT' && USE_WORKSPACE && (
                <div className="space-y-6 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                        <Mail size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Check your email</h3>
                        <p className="text-slate-500 text-sm mt-2">
                          We sent a sign-in link to <br />
                          <b className="text-slate-800">{email}</b>
                        </p>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                          Open the message on this phone or another device, then tap <strong>Continue to app</strong>.
                          Works on Wi‑Fi/LAN: use the same host as this site (e.g. <code className="text-[10px] bg-slate-100 px-1 rounded">http://192.168.x.x:3000</code>) in{' '}
                          <code className="text-[10px] bg-slate-100 px-1 rounded">NEXTAUTH_URL</code>.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStep('INPUT')}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider"
                    >
                        Use a different email
                    </button>
                </div>
            )}

            {step === 'OTP' && (
                <div className="space-y-6 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                        <KeyRound size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Verify Identity</h3>
                        <p className="text-slate-500 text-sm mt-2">Enter the verification code sent to <br/><b className="text-slate-800">{email}</b></p>
                    </div>
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                         <div className="flex justify-center gap-2">
                             <input 
                                type="text" 
                                className="w-full p-4 text-center text-3xl font-mono font-black tracking-[0.5em] border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                placeholder="00000"
                                maxLength={5}
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                autoFocus
                             />
                         </div>
                         <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98]">
                             Confirm Code
                         </button>
                    </form>
                    <div className="space-y-3">
                        <button onClick={() => setStep('INPUT')} className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider">Change Email</button>
                        <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            Check your spam folder if code doesn't arrive. <br/>
                            <span className="font-bold text-blue-600">Mock Mode: Use 12345</span>
                        </p>
                    </div>
                </div>
            )}

            {step === 'DEV_SELECT' && (
                <div className="flex h-full">
                    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
                        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center">
                            <ShieldCheck size={16} className="mr-2 text-indigo-600"/> Developer Login
                        </h3>
                        <div className="relative mb-4">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input 
                                type="text" 
                                placeholder="Search user..." 
                                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <button 
                                onClick={() => setActiveTab('INTERNAL')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${activeTab === 'INTERNAL' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <span>Internal Staff</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[9px]">{groupedUsers.internal.length}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('JOURNEY')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${activeTab === 'JOURNEY' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <span>Customer Journey</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[9px]">{devUsers.length - groupedUsers.internal.length}</span>
                            </button>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-200">
                             <button onClick={() => setStep('INPUT')} className="w-full py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-colors">
                                 Back to Standard Login
                             </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                        {activeTab === 'INTERNAL' && (
                            <div className="grid grid-cols-2 gap-3">
                                {groupedUsers.internal.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleDevSelect(u)}
                                        className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-start gap-3 group"
                                    >
                                        <img src={u.avatarUrl} className="w-10 h-10 rounded-full border border-slate-100" alt="Av"/>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{u.fullName}</p>
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                            <span className="inline-block mt-1 text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-100 transition-colors">
                                                {u.role.replace('Super Admin', 'Admin')}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'JOURNEY' && (
                            <div className="space-y-6">
                                {(Object.entries(groupedUsers.byLifecycle) as [string, UserProfile[]][]).map(([stage, users]) => {
                                    if (users.length === 0) return null;
                                    return (
                                        <div key={stage}>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                {getLifecycleIcon(stage)} <span className="ml-2">{stage}</span>
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {users.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => handleDevSelect(u)}
                                                        className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center gap-3 group"
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                                                            ${stage === 'GUEST' ? 'bg-slate-400' : 
                                                              stage === 'MEMBER' ? 'bg-amber-500' :
                                                              stage === 'CERTIFIED' ? 'bg-purple-500' :
                                                              stage === 'FACILITATOR' ? 'bg-green-500' : 'bg-blue-400'}
                                                        `}>
                                                            {u.fullName[0]}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 text-sm truncate">{u.fullName}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {step !== 'DEV_SELECT' && (
            <div className="bg-slate-50 py-3 text-center border-t border-slate-100">
                <p className="text-[10px] text-slate-400 flex items-center justify-center">
                    <ShieldCheck size={10} className="mr-1" /> Enterprise Grade Security
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ModernLogin;
