
import React, { useMemo, useState } from 'react';
import { TableDefinition } from '../../../services/schemaService';
import { MODIFIED_SCHEMA_DEFS } from '../../../constants/modifiedSchemaDefs';
import { 
    AlertTriangle, CheckCircle2, ArrowRight, XCircle, 
    Database, AlertOctagon, HelpCircle, FileQuestion
} from 'lucide-react';

interface SchemaGapAnalyzerProps {
    liveTables: TableDefinition[];
}

type MappingStatus = 'FULL_MATCH' | 'PARTIAL_MATCH' | 'UNMAPPED';

interface MigrationReport {
    sourceTable: string; // The Legacy JSON Table
    status: MappingStatus;
    mappedTargets: string[]; // Which SQL tables consume this data?
    coverageScore: number; // % of source columns preserved
    
    // Details
    mappedColumns: { source: string; targetTable: string; targetCol: string; method: 'EXACT' | 'FUZZY' }[];
    orphanedColumns: string[]; // Columns in JSON that have NOWHERE to go
}

const SchemaGapAnalyzer: React.FC<SchemaGapAnalyzerProps> = ({ liveTables }) => {
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    // --- CORE LOGIC: SOURCE-FIRST AUDIT ---
    const migrationAnalysis = useMemo(() => {
        const reports: MigrationReport[] = [];

        liveTables.forEach(sourceDef => {
            const sourceCols = sourceDef.columns.map(c => c.name);
            
            // 1. Find all SQL tables that claim to use this source
            // (Normalization might split 1 JSON table into 3 SQL tables)
            const targetTables = MODIFIED_SCHEMA_DEFS.filter(def => def.referenceRawTable === sourceDef.tableName);

            // 2. Prepare buckets
            const mappedCols: MigrationReport['mappedColumns'] = [];
            const orphans: string[] = [];

            if (targetTables.length === 0) {
                // CRITICAL: This table is completely ignored in the new design
                reports.push({
                    sourceTable: sourceDef.tableName,
                    status: 'UNMAPPED',
                    mappedTargets: [],
                    coverageScore: 0,
                    mappedColumns: [],
                    orphanedColumns: sourceCols
                });
                return;
            }

            // 3. Check every source column against ALL target tables
            sourceCols.forEach(sCol => {
                let isFound = false;

                // Check across all SQL tables linked to this source
                for (const targetDef of targetTables) {
                    const targetColNames = targetDef.columns.map(c => c.name);
                    
                    // A. Exact Match
                    if (targetColNames.includes(sCol)) {
                        mappedCols.push({ source: sCol, targetTable: targetDef.tableName, targetCol: sCol, method: 'EXACT' });
                        isFound = true;
                        break; // Found a home, stop searching
                    }

                    // B. Fuzzy Match (Snake case etc)
                    const normalizedSource = sCol.toLowerCase().replace(/_/g, '').replace('id', '');
                    const fuzzyMatch = targetColNames.find(tCol => {
                        const normalizedTarget = tCol.toLowerCase().replace(/_/g, '').replace('id', '');
                        return normalizedTarget === normalizedSource || normalizedTarget.includes(normalizedSource);
                    });

                    if (fuzzyMatch) {
                        mappedCols.push({ source: sCol, targetTable: targetDef.tableName, targetCol: fuzzyMatch, method: 'FUZZY' });
                        isFound = true;
                        break;
                    }
                }

                if (!isFound) {
                    orphans.push(sCol);
                }
            });

            // 4. Calculate Score
            const total = sourceCols.length;
            const score = total === 0 ? 100 : Math.round(((total - orphans.length) / total) * 100);
            
            reports.push({
                sourceTable: sourceDef.tableName,
                status: score === 100 ? 'FULL_MATCH' : 'PARTIAL_MATCH',
                mappedTargets: targetTables.map(t => t.tableName),
                coverageScore: score,
                mappedColumns: mappedCols,
                orphanedColumns: orphans
            });
        });

        // Sort: Unmapped first, then Partial, then Full
        return reports.sort((a, b) => a.coverageScore - b.coverageScore);
    }, [liveTables]);

    const activeReport = selectedTable 
        ? migrationAnalysis.find(r => r.sourceTable === selectedTable) 
        : migrationAnalysis[0];

    const getStatusColor = (status: MappingStatus) => {
        switch(status) {
            case 'FULL_MATCH': return 'bg-green-100 text-green-700 border-green-200';
            case 'PARTIAL_MATCH': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'UNMAPPED': return 'bg-red-100 text-red-700 border-red-200';
        }
    };

    return (
        <div className="flex h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* SIDEBAR: JSON SOURCE TABLES */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center mb-1">
                        <AlertOctagon size={14} className="mr-2 text-indigo-600"/> Migration Audit
                    </h3>
                    <p className="text-[10px] text-slate-400">Source-First: Are we losing data?</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {migrationAnalysis.map(report => (
                        <button
                            key={report.sourceTable}
                            onClick={() => setSelectedTable(report.sourceTable)}
                            className={`w-full text-left px-4 py-3 border-l-4 transition-all hover:bg-slate-50 group ${
                                activeReport?.sourceTable === report.sourceTable 
                                ? 'border-indigo-600 bg-indigo-50/50' 
                                : 'border-transparent'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold text-sm ${activeReport?.sourceTable === report.sourceTable ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {report.sourceTable}
                                </span>
                                {report.status === 'UNMAPPED' && <AlertTriangle size={12} className="text-red-500"/>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getStatusColor(report.status)}`}>
                                    {report.coverageScore}% Covered
                                </span>
                                {report.orphanedColumns.length > 0 && (
                                    <span className="text-[9px] text-red-500 font-medium">
                                        {report.orphanedColumns.length} fields lost
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN: ANALYSIS DETAIL */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {activeReport ? (
                    <div className="flex flex-col h-full">
                        {/* HEADER */}
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-lg ${activeReport.status === 'UNMAPPED' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <Database size={24}/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center">
                                        {activeReport.sourceTable}
                                        {activeReport.status === 'UNMAPPED' && (
                                            <span className="ml-3 bg-red-600 text-white text-xs px-2 py-1 rounded">NOT MIGRATED</span>
                                        )}
                                    </h2>
                                    <div className="text-sm text-slate-500 mt-1">
                                        Legacy JSON Table • {activeReport.mappedTargets.length} SQL Target(s)
                                    </div>
                                </div>
                            </div>

                            {activeReport.mappedTargets.length > 0 && (
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase py-1">Migrating to:</span>
                                    {activeReport.mappedTargets.map(t => (
                                        <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 font-mono">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* 1. DANGER ZONE: ORPHANED COLUMNS */}
                            {activeReport.orphanedColumns.length > 0 ? (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                                    <h4 className="text-red-800 font-bold flex items-center mb-3 text-sm uppercase tracking-wide">
                                        <XCircle size={16} className="mr-2"/> 
                                        {activeReport.status === 'UNMAPPED' ? 'Table Ignored' : 'Orphaned Data Fields'}
                                    </h4>
                                    <p className="text-xs text-red-600 mb-4">
                                        {activeReport.status === 'UNMAPPED' 
                                            ? "This entire table has no definition in the new SQL Schema. All data will be lost."
                                            : "The following fields exist in the JSON source but were not found in any of the target SQL tables."}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {activeReport.orphanedColumns.map(col => (
                                            <span key={col} className="bg-white text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-sm flex items-center">
                                                {col} <HelpCircle size={10} className="ml-2 opacity-50"/>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center text-green-800 text-sm font-medium">
                                    <CheckCircle2 size={18} className="mr-2"/>
                                    All data fields from this source are successfully mapped to SQL.
                                </div>
                            )}

                            {/* 2. SUCCESS ZONE: MAPPED COLUMNS */}
                            {activeReport.mappedColumns.length > 0 && (
                                <div>
                                    <h4 className="text-slate-700 font-bold flex items-center mb-4 text-sm uppercase tracking-wide">
                                        <CheckCircle2 size={16} className="mr-2 text-green-600"/> Data Mapping
                                    </h4>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3 w-1/3">Source Field (JSON)</th>
                                                    <th className="p-3 w-10"></th>
                                                    <th className="p-3 w-1/3">Target Field (SQL)</th>
                                                    <th className="p-3">Target Table</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeReport.mappedColumns.map((m, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-3 font-mono text-slate-600">{m.source}</td>
                                                        <td className="p-3 text-center text-slate-300"><ArrowRight size={14}/></td>
                                                        <td className="p-3">
                                                            <div className="flex items-center">
                                                                <span className="font-mono text-indigo-700 font-bold mr-2">{m.targetCol}</span>
                                                                {m.method === 'FUZZY' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Inferred</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-xs text-slate-500">{m.targetTable}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <FileQuestion size={48} className="mb-4 opacity-20"/>
                        <p className="font-bold text-slate-400">Select a Legacy Table</p>
                        <p className="text-sm">Verify that its data has a home in the new design.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchemaGapAnalyzer;
