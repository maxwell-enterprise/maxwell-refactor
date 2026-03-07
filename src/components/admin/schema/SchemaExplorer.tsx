
import React, { useState, useMemo, useEffect } from 'react';
import { TableDefinition } from '../../../services/schemaService';
import { OptimizationResult, SchemaChange } from '../../../types/schemaOptimizer';
import { ExcelHelper } from '../../../utils/excelHelper';
import { 
    ChevronDown, ChevronRight, Table, Shield, ShoppingCart, Truck, 
    Users, Award, MessageSquare, Settings, Key, Link, ArrowRight, 
    CornerDownRight, EyeOff, Eye, GitCommit, AlertCircle, CheckCircle2, Lock, Unlock,
    Database, Download, FileSpreadsheet, Loader2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface SchemaExplorerProps {
    tables: TableDefinition[];
    mode: 'BASELINE' | 'PROPOSED';
    optimizationResult?: OptimizationResult;
}

const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ tables, mode, optimizationResult }) => {
    const { showToast } = useToast();
    
    // --- VIEW STATE ---
    const [viewMode, setViewMode] = useState<'STRUCTURE' | 'DATA'>('STRUCTURE');
    
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'CORE_IAM': true,
        'FINANCE_COMMERCE': true,
        'CRM_SALES': true
    });
    
    // Selection state
    const [selectedTableName, setSelectedTableName] = useState<string | null>(
        mode === 'PROPOSED' && optimizationResult?.optimizedSchema[0] 
        ? optimizationResult.optimizedSchema[0].tableName 
        : tables.length > 0 ? tables[0].tableName : null
    );

    // Data Browser State
    const [tableData, setTableData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Filter state
    const [hideCosmeticChanges, setHideCosmeticChanges] = useState(true);

    const activeSchema = mode === 'PROPOSED' && optimizationResult ? optimizationResult.optimizedSchema : tables;

    // --- EFFECT: Load Data on Table Change or View Mode Change ---
    useEffect(() => {
        if (viewMode === 'DATA' && selectedTableName) {
            loadTableData(selectedTableName);
        }
    }, [viewMode, selectedTableName]);

    const loadTableData = async (tableName: string) => {
        setIsLoadingData(true);
        try {
            // Find the definition. In PROPOSED mode, we still try to fetch data from the ORIGINAL source 
            // if the table exists, to show "Before" state.
            const definition = tables.find(t => t.tableName === tableName);
            
            if (definition && definition.getData) {
                // Fetch first 50 rows for preview
                const rows = await definition.getData(1, 50); 
                setTableData(rows || []);
            } else {
                setTableData([]);
            }
        } catch (e) {
            console.error("Failed to load data", e);
            setTableData([]);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleExportExcel = () => {
        if (tableData.length === 0) {
            showToast('No data to export.', 'error');
            return;
        }
        ExcelHelper.exportToExcel(tableData, `${selectedTableName}_Data_Export`);
        showToast(`Exported ${selectedTableName} to Excel`, 'success');
    };

    // --- UTILS ---
    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const getCategoryIcon = (cat: string) => {
        switch(cat) {
            case 'CORE_IAM': return <Shield size={14}/>;
            case 'FINANCE_COMMERCE': return <ShoppingCart size={14}/>;
            case 'OPS_LOGISTICS': return <Truck size={14}/>;
            case 'CRM_SALES': return <Users size={14}/>;
            case 'ENGAGEMENT_LMS': return <Award size={14}/>;
            case 'COMMUNICATION': return <MessageSquare size={14}/>;
            default: return <Settings size={14}/>;
        }
    };

    // --- CHANGE DETECTION LOGIC ---
    const isNamingChange = (change: SchemaChange) => {
        if (change.type !== 'RENAME_COLUMN') return false;
        if (!change.oldValue || !change.newValue) return false;
        return change.oldValue.replace(/_/g, '').toLowerCase() === change.newValue.replace(/_/g, '').toLowerCase();
    };

    const getTableChanges = (tableName: string) => {
        if (mode !== 'PROPOSED' || !optimizationResult) return [];
        let changes = optimizationResult.changes.filter(c => c.entity === tableName);
        if (hideCosmeticChanges) {
            changes = changes.filter(c => !isNamingChange(c));
        }
        return changes;
    };

    const getColumnChange = (tableName: string, colName: string) => {
        const changes = getTableChanges(tableName);
        return changes.find(c => 
            c.field === colName || 
            (c.type === 'RENAME_COLUMN' && c.newValue === colName)
        );
    };

    const groupedTables = useMemo(() => {
        const groups: Record<string, typeof activeSchema> = {};
        activeSchema.forEach(t => {
            if (!groups[t.category]) groups[t.category] = [];
            groups[t.category].push(t);
        });
        return groups;
    }, [activeSchema]);

    const selectedTable = activeSchema.find(t => t.tableName === selectedTableName);

    // Check if selected table is a "New Table" in proposed mode (so it has no data)
    const isNewTable = mode === 'PROPOSED' && selectedTable && !tables.find(t => t.tableName === selectedTable.tableName);

    // Hyperlink Handler
    const navigateToTable = (targetInput: string) => {
        const targetName = targetInput.includes('.') ? targetInput.split('.')[0] : targetInput;
        let target = activeSchema.find(t => t.tableName === targetName);

        if (!target) {
            target = activeSchema.find(t => 
                t.tableName === `sys_${targetName}` || 
                t.tableName.includes(targetName) ||    
                (targetName === 'users' && t.tableName === 'members') || 
                (targetName === 'user' && t.tableName === 'sys_internal_users')
            );
        }

        if (target) {
            setSelectedTableName(target.tableName);
            setViewMode('STRUCTURE'); // Reset to structure view on nav
        } else {
            showToast(`Table '${targetName}' not found in registry.`, 'error');
        }
    };

    return (
        <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* SIDEBAR */}
            <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
                {mode === 'PROPOSED' && (
                    <div className="p-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Diff Options</span>
                         <button 
                            onClick={() => setHideCosmeticChanges(!hideCosmeticChanges)}
                            className={`text-[10px] flex items-center px-2 py-1 rounded border transition-colors ${hideCosmeticChanges ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-300'}`}
                            title="Hide simple snake_case renames"
                         >
                             {hideCosmeticChanges ? <EyeOff size={10} className="mr-1"/> : <Eye size={10} className="mr-1"/>}
                             {hideCosmeticChanges ? 'Cosmetic Hidden' : 'Show All'}
                         </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {Object.keys(groupedTables).map((cat) => (
                        <div key={cat}>
                            <button 
                                onClick={() => toggleCategory(cat)}
                                className="w-full flex items-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors border-b border-slate-100"
                            >
                                <span className="mr-2 text-slate-400">{getCategoryIcon(cat)}</span>
                                {cat.replace('_', ' ')}
                                <span className="ml-auto">
                                    {expandedCategories[cat] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                </span>
                            </button>
                            
                            {expandedCategories[cat] && (
                                <div className="bg-white">
                                    {groupedTables[cat].map(table => {
                                        const changes = getTableChanges(table.tableName).length;
                                        const isNewTableInGroup = mode === 'PROPOSED' && !tables.find(t => t.tableName === table.tableName);

                                        return (
                                            <button
                                                key={table.tableName}
                                                onClick={() => { setSelectedTableName(table.tableName); }}
                                                className={`w-full text-left pl-10 pr-4 py-2 text-xs font-medium flex items-center justify-between border-l-4 transition-all ${
                                                    selectedTableName === table.tableName 
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                                    : 'border-transparent text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="truncate">{table.tableName}</span>
                                                {mode === 'PROPOSED' && (
                                                    <div className="flex gap-1">
                                                        {isNewTableInGroup && <span className="bg-green-500 text-white px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold">NEW</span>}
                                                        {changes > 0 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold">{changes}</span>}
                                                    </div>
                                                )}
                                                {mode === 'BASELINE' && (
                                                    <span className="text-[9px] text-slate-300">{table.rowCount}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {selectedTable ? (
                    <>
                        {/* HEADER */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Table size={20} className="text-blue-500"/>
                                    {selectedTable.tableName}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{selectedTable.description}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                {mode === 'PROPOSED' && (
                                    <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 text-xs font-bold">
                                        <GitCommit size={12} className="mr-1"/> 
                                        {getTableChanges(selectedTable.tableName).length} Proposed Changes
                                    </div>
                                )}
                                
                                {/* VIEW SWITCHER */}
                                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button 
                                        onClick={() => setViewMode('STRUCTURE')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center transition-all ${viewMode === 'STRUCTURE' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Settings size={12} className="mr-1.5"/> Structure
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('DATA')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center transition-all ${viewMode === 'DATA' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Database size={12} className="mr-1.5"/> Browse Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            
                            {/* STRUCTURE VIEW */}
                            {viewMode === 'STRUCTURE' && (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 border-b w-16 text-center">Attr</th>
                                            <th className="p-4 border-b w-1/4">Column Name</th>
                                            <th className="p-4 border-b">Type</th>
                                            <th className="p-4 border-b w-1/3">Relationships & Constraints</th>
                                            {mode === 'PROPOSED' && <th className="p-4 border-b bg-amber-50/50 text-amber-800 w-1/3">Diff Metadata</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {selectedTable.columns.map((col, idx) => {
                                            const change = getColumnChange(selectedTable.tableName, col.name);
                                            // Highlights
                                            let rowClass = 'hover:bg-slate-50';
                                            if (mode === 'PROPOSED' && change) {
                                                if (change.type === 'ADD_COLUMN') rowClass = 'bg-green-50/50';
                                                else if (change.type === 'RENAME_COLUMN') rowClass = 'bg-blue-50/50';
                                                else if (change.type === 'MODIFY_RELATION') rowClass = 'bg-purple-50/50';
                                                else rowClass = 'bg-amber-50/30';
                                            }

                                            return (
                                                <tr key={idx} className={rowClass}>
                                                    {/* Attributes */}
                                                    <td className="p-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            {col.isPk && <div title="Primary Key"><Key size={14} className="text-amber-500"/></div>}
                                                            {col.isFk && <div title="Foreign Key"><Link size={14} className="text-blue-500"/></div>}
                                                        </div>
                                                    </td>

                                                    {/* Column Name */}
                                                    <td className="p-4 font-mono font-medium">
                                                        {change?.type === 'RENAME_COLUMN' ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-red-400 line-through mb-0.5">{change.oldValue}</span>
                                                                <span className="text-green-700 font-bold flex items-center">
                                                                    <ArrowRight size={10} className="mr-1"/> {col.name}
                                                                </span>
                                                            </div>
                                                        ) : col.name}
                                                    </td>

                                                    {/* Type */}
                                                    <td className="p-4">
                                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-600">
                                                            {col.type}
                                                        </span>
                                                        {change?.type === 'CHANGE_TYPE' && (
                                                            <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1 rounded">was {change.oldValue}</span>
                                                        )}
                                                    </td>

                                                    {/* Relations */}
                                                    <td className="p-4 text-xs">
                                                        <div className="space-y-1">
                                                            {col.isFk && col.fkTarget && (
                                                                <button 
                                                                    onClick={() => navigateToTable(col.fkTarget!.split('.')[0])}
                                                                    className="flex items-center text-blue-600 hover:underline hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded w-fit"
                                                                    title={`Go to ${col.fkTarget}`}
                                                                >
                                                                    <CornerDownRight size={12} className="mr-1.5"/>
                                                                    Ref: <b className="ml-1">{col.fkTarget}</b>
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {col.isMandatory !== undefined && (
                                                                    <span className={`flex items-center ${col.isMandatory ? 'text-slate-700' : 'text-slate-400'}`}>
                                                                        {col.isMandatory ? <Lock size={10} className="mr-1"/> : <Unlock size={10} className="mr-1"/>}
                                                                        {col.isMandatory ? 'Mandatory' : 'Optional'}
                                                                    </span>
                                                                )}
                                                                {col.cardinality && (
                                                                    <span className="bg-slate-100 text-slate-600 px-1.5 rounded text-[9px] font-mono border border-slate-200">
                                                                        {col.cardinality}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* Diff Metadata */}
                                                    {mode === 'PROPOSED' && (
                                                        <td className="p-4 border-l border-slate-100">
                                                            {change ? (
                                                                <div className="text-xs">
                                                                    <div className="font-bold text-slate-700 mb-1 flex items-center uppercase text-[10px] tracking-wider">
                                                                        <AlertCircle size={10} className="mr-1 text-blue-500"/>
                                                                        {change.type.replace('_', ' ')}
                                                                    </div>
                                                                    <p className="text-slate-600 italic bg-white/50 p-1 rounded">"{change.reason}"</p>
                                                                    {(change.cardinality || change.isMandatory !== undefined) && (
                                                                        <div className="mt-1 flex gap-2">
                                                                            {change.cardinality && <span className="text-[9px] bg-purple-50 text-purple-700 px-1 rounded">Card: {change.cardinality}</span>}
                                                                            {change.isMandatory !== undefined && <span className="text-[9px] bg-green-50 text-green-700 px-1 rounded">{change.isMandatory ? 'Set Mandatory' : 'Set Optional'}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 text-[10px]">- Unchanged -</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {/* DATA VIEW */}
                            {viewMode === 'DATA' && (
                                <div className="flex flex-col h-full">
                                    {isNewTable ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Database size={48} className="mb-4 opacity-20"/>
                                            <p className="font-medium">No Data Available</p>
                                            <p className="text-xs mt-1">This is a new table proposal. It doesn't exist in the database yet.</p>
                                        </div>
                                    ) : isLoadingData ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Loader2 size={32} className="animate-spin mb-2 text-blue-500"/>
                                            <p className="text-xs">Fetching live records...</p>
                                        </div>
                                    ) : tableData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Database size={48} className="mb-4 opacity-20"/>
                                            <p className="font-medium">Table is Empty</p>
                                            <p className="text-xs mt-1">No records found in {selectedTable.tableName}.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-end">
                                                <button 
                                                    onClick={handleExportExcel}
                                                    className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-200"
                                                >
                                                    <FileSpreadsheet size={14}/> Export to Excel
                                                </button>
                                            </div>
                                            <div className="overflow-auto flex-1">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10">
                                                        <tr>
                                                            {Object.keys(tableData[0]).map((key) => (
                                                                <th key={key} className="p-3 border-b border-r border-slate-200 last:border-r-0 whitespace-nowrap min-w-[100px]">
                                                                    {key}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100 font-mono">
                                                        {tableData.map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/30">
                                                                {Object.values(row).map((val: any, vIdx) => (
                                                                    <td key={vIdx} className="p-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 text-center">
                                                Showing first {tableData.length} rows for preview.
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Table size={48} className="mb-4 opacity-20"/>
                        <p>Select a table to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchemaExplorer;
