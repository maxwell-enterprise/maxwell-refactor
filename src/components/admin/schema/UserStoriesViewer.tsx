
import React from 'react';
import { ALL_USER_STORIES } from '../../../constants/userStories';
import { FileText, User } from 'lucide-react';

const UserStoriesViewer: React.FC = () => {
    const grouped = ALL_USER_STORIES.reduce((acc, story) => {
        if (!acc[story.epic]) acc[story.epic] = [];
        acc[story.epic].push(story);
        return acc;
    }, {} as Record<string, typeof ALL_USER_STORIES>);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <FileText className="mr-2 text-indigo-600" /> Business Context (User Stories)
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                    These requirements drive the schema optimization decisions.
                </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {Object.entries(grouped).map(([epic, stories]) => (
                    <div key={epic}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">
                            {epic} Domain
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stories.map(story => (
                                <div key={story.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-mono text-slate-400 bg-white border px-1.5 rounded">{story.id}</span>
                                        <div className="flex items-center text-xs font-bold text-slate-700">
                                            <User size={12} className="mr-1 text-blue-500"/> {story.role}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                        "{story.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserStoriesViewer;
