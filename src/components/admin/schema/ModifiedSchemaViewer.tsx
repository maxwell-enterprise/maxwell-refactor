import React, { useState, useEffect } from 'react';
import { TableDefinition } from '../../../services/schemaService';
import { MODIFIED_SCHEMA_DEFS } from '../../../constants/modifiedSchemaDefs';
// Fixed: Import ModifiedTableDef from the correct type definition source
import { ModifiedTableDef } from '../../../constants/schema/types';
import { Database, ArrowRight, Info, Code, Table as TableIcon, Loader2, Layout, FileText, CheckCircle2, Key, Link, Shield, AlertCircle, ArrowUpRight, GitMerge, Fingerprint } from 'lucide-react';

interface ModifiedSchemaViewerProps {
    liveTables: TableDefinition[];
}

const ModifiedSchemaViewer: React.FC<ModifiedSchemaViewerProps> = ({ liveTables }) => {
    const [selectedDef, setSelectedDef] = useState<ModifiedTableDef>(MODIFIED_SCHEMA_DEFS[0]);
    const [activeView, setActiveView] = useState<'STRUCTURE' | 'DATA' | 'BLUEPRINT'>('STRUCTURE');
    const [sampleData, setSampleData] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Reset view when table changes
    useEffect(() => {
        setSampleData([]);
        if(activeView === 'DATA') loadRefData();
    }, [selectedDef]);

    // Load data only when tab is active
    useEffect(() => {
        if (activeView === 'DATA') {
            loadRefData();
        }
    }, [activeView, selectedDef]);

    const loadRefData = async () => {
        if (!selectedDef.referenceRawTable) {
            setSampleData([]);
            return;
        }

        const refTable = liveTables.find(t => t.tableName === selectedDef.referenceRawTable);
        if (refTable) {
            setLoadingData(true);
            try {
                // Get 20 rows for context
                const data = await refTable.getData(1, 20);
                setSampleData(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingData(false);
            }
        } else {
            setSampleData([]);
        }
    };

    const handleNavigateReference = (target: string) => {
        const tableName = target.split('.')[0];
        const found = MODIFIED_SCHEMA_DEFS.find(d => d.tableName === tableName);
        if (found) {
            setSelectedDef(found);
            setActiveView('STRUCTURE'); // Ensure we see the structure of the referenced table
        }
    };

    // Helper to find the matching legacy column
    const getSourceMapping = (targetCol: string) => {
        if (!selectedDef.referenceRawTable) return null;
        const sourceTable = liveTables.find(t => t.tableName === selectedDef.referenceRawTable);
        if (!sourceTable) return null;

        // 1. Exact Match
        if (sourceTable.columns.some(c => c.name === targetCol)) return { name: targetCol, type: 'EXACT' };

        // 2. Fuzzy / Normalization Match (e.g. join_date vs joinMonth)
        const normTarget = targetCol.replace(/_/g, '').toLowerCase().replace('id', '');
        const found = sourceTable.columns.find(c => {
             const normSource = c.name.replace(/_/g, '').toLowerCase().replace('id', '');
             return normSource === normTarget || 
                    (normSource.includes(normTarget) && normTarget.length > 3) || 
                    (normTarget.includes(normSource) && normSource.length > 3);
        });
        
        if (found) return { name: found.name, type: 'INFERRED' };
        return null;
    };

    return (
        <div className="flex h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Sidebar List */}
            <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                        <Code size={14} className="mr-2"/> Target SQL Tables
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">Target State Definition</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {MODIFIED_SCHEMA_DEFS.map((def) => (
                        <button
                            key={def.tableName}
                            onClick={() => setSelectedDef(def)}
                            className={`w-full text-left px-4 py-3 text-xs font-bold border-l-4 transition-all flex items-center ${
                                selectedDef.tableName === def.tableName 
                                ? 'bg-white border-purple-600 text-purple-700 shadow-sm' 
                                : 'border-transparent text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <Database size={14} className="mr-2 text-slate-400"/>
                            {def.tableName}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <TableIcon className="text-purple-600" />
                                {selectedDef.tableName}
                            </h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500 font-mono">Target: PostgreSQL</span>
                                {selectedDef.referenceRawTable && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 flex items-center">
                                        <GitMerge size={10} className="mr-1"/> Maps from: {selectedDef.referenceRawTable}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveView('STRUCTURE')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${activeView === 'STRUCTURE' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Layout size={14} className="mr-1.5"/> Structure
                            </button>
                            <button 
                                onClick={() => setActiveView('DATA')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${activeView === 'DATA' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <FileText size={14} className="mr-1.5"/> Browse Data
                            </button>
                            <button 
                                onClick={() => setActiveView('BLUEPRINT')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center ${activeView === 'BLUEPRINT' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Code size={14} className="mr-1.5"/> Blueprint & Info
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0 bg-white">
                    
                    {/* 1. STRUCTURE VIEW (Visual Table) */}
                    {activeView === 'STRUCTURE' && (
                        <div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 border-b w-12 text-center">Attr</th>
                                        <th className="p-4 border-b w-1/5">Column (SQL)</th>
                                        <th className="p-4 border-b w-1/5 text-indigo-600 bg-indigo-50/50">Source Mapping (JSON)</th>
                                        <th className="p-4 border-b w-32">Type</th>
                                        <th className="p-4 border-b w-1/5">Relationship</th>
                                        <th className="p-4 border-b">Constraint</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                    {selectedDef.columns.map((col, idx) => {
                                        const mapping = getSourceMapping(col.name);
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                {/* Attributes */}
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        {col.isPk && <div title="Primary Key"><Key size={14} className="text-amber-500"/></div>}
                                                        {col.isFk && <div title="Foreign Key"><Link size={14} className="text-blue-500"/></div>}
                                                    </div>
                                                </td>

                                                {/* Target SQL Column */}
                                                <td className="p-4 font-mono font-medium text-slate-800">
                                                    {col.name}
                                                </td>

                                                {/* Source Mapping */}
                                                <td className="p-4 bg-indigo-50/10 border-l border-r border-indigo-50">
                                                    {mapping ? (
                                                        <div className="flex items-center gap-2" title={mapping.type === 'EXACT' ? 'Exact Name Match' : 'Inferred Match'}>
                                                            {mapping.type === 'EXACT' 
                                                                ? <CheckCircle2 size={14} className="text-green-500"/> 
                                                                : <Fingerprint size={14} className="text-amber-500"/>
                                                            }
                                                            <span className={`font-mono text-xs ${mapping.type === 'EXACT' ? 'text-green-700' : 'text-amber-700'}`}>
                                                                {mapping.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs italic">- New / Derived -</span>
                                                    )}
                                                </td>

                                                {/* Type */}
                                                <td className="p-4">
                                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-600 border border-slate-200">
                                                        {col.type}
                                                    </span>
                                                </td>

                                                {/* Relationship */}
                                                <td className="p-4 text-xs">
                                                    {col.isFk && col.fkTarget ? (
                                                        <button 
                                                            onClick={() => handleNavigateReference(col.fkTarget!)}
                                                            className="flex items-center text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 hover:border-blue-300 transition-all group"
                                                        >
                                                            <Link size={12} className="mr-1.5 group-hover:stroke-[2.5px]"/>
                                                            <span className="font-mono font-medium">Ref: {col.fkTarget}</span>
                                                            <ArrowUpRight size={10} className="ml-1 opacity-50 group-hover:opacity-100"/>
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                {/* Constraint */}
                                                <td className="p-4 text-xs">
                                                    {col.constraints ? (
                                                        <div className="font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                                                            {col.constraints}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 2. BROWSE DATA VIEW */}
                    {activeView === 'DATA' && (
                        <div className="h-full flex flex-col p-6 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                                <TableIcon size={14} className="mr-2"/> 
                                Source Data Preview
                                <span className="ml-2 bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono lowercase">
                                    from: {selectedDef.referenceRawTable || 'N/A'}
                                </span>
                            </h4>
                            
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
                                {loadingData ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                                        <Loader2 className="animate-spin mb-2 text-purple-500" size={32}/>
                                        <p className="text-xs">Fetching live samples...</p>
                                    </div>
                                ) : sampleData.length > 0 ? (
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                                                <tr>
                                                    {Object.keys(sampleData[0]).slice(0, 8).map(k => (
                                                        <th key={k} className="p-3 border-r border-slate-200 last:border-r-0 whitespace-nowrap bg-slate-50">{k}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {sampleData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        {Object.values(row).slice(0, 8).map((val: any, vIdx) => (
                                                            <td key={vIdx} className="p-3 font-mono text-slate-600 border-r border-slate-100 last:border-r-0 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 text-sm italic">
                                        No direct reference data available in Registered Schema for this target table.
                                        <br/>
                                        <span className="text-xs opacity-70 mt-1 block">This might be a new table with no direct equivalent in the old system.</span>
                                    </div>
                                )}
                                {sampleData.length > 0 && (
                                    <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-center text-slate-400">
                                        Showing sample raw data for reference mapping.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. BLUEPRINT VIEW (Reasoning & SQL) */}
                    {activeView === 'BLUEPRINT' && (
                        <div className="space-y-6 max-w-4xl p-8">
                             {/* Reasoning Box */}
                             <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 shadow-sm">
                                <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <span className="text-xs font-bold text-amber-700 uppercase block mb-1">Architectural Reasoning</span>
                                    <p className="text-sm text-amber-900 leading-relaxed">
                                        {selectedDef.reasoning}
                                    </p>
                                </div>
                            </div>

                            <section>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                                    <Database size={14} className="mr-2"/> DDL Statement
                                </h4>
                                <div className="bg-slate-900 rounded-xl p-5 shadow-lg border border-slate-800 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-white/10 px-3 py-1 rounded-bl-lg text-[10px] font-mono text-white/70 uppercase">SQL</div>
                                    <pre className="text-blue-100 font-mono text-sm overflow-x-auto leading-loose p-1">
                                        {selectedDef.sqlDefinition}
                                    </pre>
                                </div>
                            </section>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-4">
                                <CheckCircle2 size={14} className="text-green-500"/>
                                <span>This definition allows the AI Architect to generate migration scripts accurately.</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ModifiedSchemaViewer;
