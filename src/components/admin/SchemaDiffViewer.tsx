
import React, { useState } from 'react';
import { OptimizationResult, SchemaChange, OptimizedTable } from '../../types/schemaOptimizer';
import { TableDefinition } from '../../services/schemaService';
import { ArrowRight, AlertTriangle, CheckCircle, Plus, Minus, Type, Link, Info, RefreshCw } from 'lucide-react';

interface SchemaDiffViewerProps {
    data: OptimizationResult;
}

const SchemaDiffViewer: React.FC<SchemaDiffViewerProps> = ({ data }) => {
    const [selectedTable, setSelectedTable] = useState<string>(data.optimizedSchema[0]?.tableName || '');

    const getOriginalTable = (name: string) => data.originalSchema.find(t => t.tableName === name);
    const getOptimizedTable = (name: string) => data.optimizedSchema.find(t => t.tableName === name);
    
    const getTableChanges = (tableName: string) => data.changes.filter(c => c.entity === tableName);

    const activeOriginal = getOriginalTable(selectedTable);
    const activeOptimized = getOptimizedTable(selectedTable);
    const activeChanges = getTableChanges(selectedTable);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* 1. Summary Header */}
            <div className="bg-white p-6 border-b border-slate-200">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Optimization Analysis</h3>
                <div className="prose prose-sm text-slate-600 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                     <p>{data.analysisSummary}</p>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {data.optimizedSchema.map(t => {
                        const changesCount = getTableChanges(t.tableName).length;
                        const isNew = !getOriginalTable(t.tableName);
                        return (
                            <button
                                key={t.tableName}
                                onClick={() => setSelectedTable(t.tableName)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center whitespace-nowrap ${
                                    selectedTable === t.tableName 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {t.tableName}
                                {isNew && <span className="ml-2 bg-green-500 text-white px-1.5 rounded-[4px] text-[9px]">NEW</span>}
                                {changesCount > 0 && !isNew && <span className="ml-2 bg-amber-500 text-white px-1.5 rounded-[4px] text-[9px]">{changesCount}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Comparison Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
                
                {/* LEFT: ORIGINAL */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-500 text-xs uppercase flex justify-between">
                        <span>Original Schema</span>
                        {activeOriginal ? <span className="text-slate-400">Mock Data</span> : <span className="text-green-600">New Entity</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {!activeOriginal ? (
                            <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                                This table does not exist in the current version.
                            </div>
                        ) : (
                            activeOriginal.columns.map((col, i) => (
                                <div key={i} className="flex items-center justify-between p-2 border border-slate-100 rounded bg-slate-50 text-xs">
                                    <div className="flex items-center">
                                        <span className="font-mono text-slate-700 font-bold mr-2">{col.name}</span>
                                        <span className="bg-slate-200 text-slate-500 px-1.5 rounded font-mono scale-90">{col.type}</span>
                                    </div>
                                    {col.isPk && <span className="text-amber-500 font-bold text-[9px]">PK</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* MIDDLE: CHANGE LOG */}
                <div className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto p-3 space-y-3 shrink-0">
                    <h4 className="text-xs font-bold text-slate-400 uppercase text-center mb-2">Transformations</h4>
                    {activeChanges.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs italic mt-10">No changes proposed.</div>
                    ) : (
                        activeChanges.map((change, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                <div className="flex items-center gap-2 mb-1 font-bold">
                                    {change.type === 'RENAME_COLUMN' && <span className="text-blue-600 flex items-center"><Type size={12} className="mr-1"/> Rename</span>}
                                    {change.type === 'CHANGE_TYPE' && <span className="text-purple-600 flex items-center"><RefreshCw size={12} className="mr-1"/> Type</span>}
                                    {change.type === 'ADD_COLUMN' && <span className="text-green-600 flex items-center"><Plus size={12} className="mr-1"/> Add</span>}
                                    {change.type === 'REMOVE_COLUMN' && <span className="text-red-600 flex items-center"><Minus size={12} className="mr-1"/> Remove</span>}
                                    {change.type === 'ADD_RELATION' && <span className="text-indigo-600 flex items-center"><Link size={12} className="mr-1"/> Relation</span>}
                                </div>
                                <p className="text-slate-700 mb-1">
                                    {change.field ? <span className="font-mono bg-slate-100 px-1 rounded">{change.field}</span> : 'Table'}
                                </p>
                                {change.oldValue && change.newValue && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mb-2">
                                        <span className="line-through opacity-60">{change.oldValue}</span>
                                        <ArrowRight size={10}/>
                                        <span className="text-green-600 font-bold">{change.newValue}</span>
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                    "{change.reason}"
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* RIGHT: OPTIMIZED */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border-2 border-indigo-100 shadow-lg overflow-hidden relative">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                        RECOMMENDED
                    </div>
                    <div className="p-3 bg-indigo-50 border-b border-indigo-100 font-bold text-indigo-800 text-xs uppercase">
                        Optimized Schema
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {!activeOptimized ? (
                            <div className="text-center p-10 text-red-400">Table Removed</div>
                        ) : (
                            activeOptimized.columns.map((col, i) => {
                                // Check if this column was touched
                                const change = activeChanges.find(c => c.field === col.name || c.newValue === col.name);
                                const highlightClass = change 
                                    ? change.type === 'ADD_COLUMN' ? 'bg-green-50 border-green-200' 
                                    : change.type === 'RENAME_COLUMN' ? 'bg-blue-50 border-blue-200'
                                    : change.type === 'CHANGE_TYPE' ? 'bg-purple-50 border-purple-200'
                                    : 'bg-white border-slate-200'
                                    : 'bg-white border-slate-200';

                                return (
                                    <div key={i} className={`flex items-center justify-between p-2 border rounded text-xs transition-colors ${highlightClass}`}>
                                        <div className="flex items-center">
                                            <span className="font-mono text-slate-800 font-bold mr-2">{col.name}</span>
                                            <span className="bg-slate-100 text-slate-600 px-1.5 rounded font-mono scale-90">{col.type}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {col.isPk && <span className="text-amber-500 font-bold text-[9px] bg-amber-50 px-1 rounded border border-amber-100">PK</span>}
                                            {col.isFk && <span className="text-blue-500 font-bold text-[9px] bg-blue-50 px-1 rounded border border-blue-100 flex items-center" title={`-> ${col.fkTarget}`}><Link size={8} className="mr-0.5"/> FK</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchemaDiffViewer;
