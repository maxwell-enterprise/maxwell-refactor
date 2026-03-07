
import React, { useEffect, useState } from 'react';
import { UserGamificationProfile, Badge } from '../../types/gamification';
import { GamificationService } from '../../services/gamificationService';
import { Trophy, Medal, Crown, Flame, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Icon Mapper (Duplicated for simplicity or extract to utility)
import { Star, Gem, Sunrise, Users, Target, Shield } from 'lucide-react';
const ICON_MAP: Record<string, any> = { Trophy, Star, Zap, Flame, Gem, Sunrise, Users, Target, Shield };

const LeaderboardWidget: React.FC = () => {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<UserGamificationProfile[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'MONTHLY' | 'ALL_TIME'>('ALL_TIME');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [lb, bg] = await Promise.all([
                GamificationService.getLeaderboard(),
                GamificationService.getBadges()
            ]);
            setLeaderboard(lb);
            setBadges(bg);
            setLoading(false);
        };
        load();
    }, [timeframe]);

    const getBadgeIcon = (code: string) => {
        const badgeDef = badges.find(b => b.id === code);
        const Icon = badgeDef ? ICON_MAP[badgeDef.icon] || Star : Star;
        return <Icon size={12} />;
    };

    const getLevelColor = (level: string) => {
        switch(level) {
            case 'Platinum': return 'bg-slate-800 text-slate-200 border-slate-600';
            case 'Gold': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-300';
            default: return 'bg-orange-50 text-orange-700 border-orange-200';
        }
    };

    // My Profile
    const myProfile = leaderboard.find(p => p.userId === user?.id);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full animate-fade-in">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center">
                            <Trophy className="text-yellow-400 mr-2" size={24} /> 
                            Influence Board
                        </h3>
                        <p className="text-xs text-blue-200">Top contributors and learners.</p>
                    </div>
                    <div className="flex bg-white/10 rounded-lg p-1">
                        <button 
                            onClick={() => setTimeframe('MONTHLY')} 
                            className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${timeframe === 'MONTHLY' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'}`}
                        >
                            Monthly
                        </button>
                        <button 
                            onClick={() => setTimeframe('ALL_TIME')} 
                            className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${timeframe === 'ALL_TIME' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'}`}
                        >
                            All Time
                        </button>
                    </div>
                </div>

                {/* My Stats Preview */}
                {myProfile && (
                    <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={myProfile.avatarUrl} alt="Me" className="w-10 h-10 rounded-full border-2 border-yellow-400" />
                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                    #{myProfile.rank}
                                </div>
                            </div>
                            <div>
                                <div className="font-bold text-sm">{myProfile.userName}</div>
                                <div className="text-xs text-blue-200 flex items-center">
                                    <span className={`px-1.5 rounded mr-2 text-[10px] border ${getLevelColor(myProfile.currentLevel).replace('bg-', 'bg-opacity-20 ')}`}>
                                        {myProfile.currentLevel}
                                    </span>
                                    {myProfile.totalPoints} pts
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center text-orange-400 font-bold text-sm">
                                <Flame size={14} className="mr-1" /> {myProfile.streakCount}
                            </div>
                            <div className="text-[10px] text-slate-400">Streak</div>
                        </div>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Calculating rankings...</div>
                ) : (
                    leaderboard.slice(0, 10).map((profile, idx) => (
                        <div key={profile.userId} className={`p-3 rounded-xl flex items-center transition-transform hover:scale-[1.01] ${profile.userId === user?.id ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'bg-white border border-slate-100'}`}>
                            <div className="w-8 font-bold text-slate-400 text-center text-sm mr-2">
                                {idx === 0 ? <Crown size={20} className="text-yellow-500 mx-auto"/> : 
                                 idx === 1 ? <Medal size={20} className="text-slate-400 mx-auto"/> :
                                 idx === 2 ? <Medal size={20} className="text-amber-700 mx-auto"/> : idx + 1}
                            </div>
                            <img src={profile.avatarUrl} className="w-8 h-8 rounded-full mr-3 border border-slate-200" alt="Av" />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate flex items-center">
                                    {profile.userName}
                                    {profile.streakCount > 3 && <Flame size={12} className="text-orange-500 ml-1.5" fill="currentColor" />}
                                </div>
                                <div className="flex gap-1 mt-1">
                                    {profile.badges.slice(0, 4).map(bid => (
                                        <div key={bid} className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200" title={bid}>
                                            {getBadgeIcon(bid)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-blue-600 text-sm">{profile.totalPoints}</div>
                                <div className="text-[9px] text-slate-400 uppercase font-bold">{profile.currentLevel}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeaderboardWidget;
