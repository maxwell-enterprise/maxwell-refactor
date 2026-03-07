
import React, { useState } from 'react';
import { ContractTableDefinition, ContractTableColumn, ContractTableRow } from '../../../../types/contract';
import { Plus, Trash2, Edit3, Save, X, Columns, Rows, Table as TableIcon } from 'lucide-react';
import VariableInserter from '../../../common/VariableInserter';

interface TableEditorProps {
    tables: ContractTableDefinition[];
    onChange: (tables: ContractTableDefinition[]) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ tables, onChange }) => {
    const [activeTableId, setActiveTableId] = useState<string | null>(tables.length > 0 ? tables[0].id : null);
    const [editingTableTitle, setEditingTableTitle] = useState(false);

    const activeTable = tables.find(t => t.id === activeTableId);

    // --- TABLE MANAGEMENT ---
    const addTable = () => {
        const newTable: ContractTableDefinition = {
            id: `TBL-${Date.now()}`,
            title: 'New Service Table',
            description: '',
            columns: [
                { id: 'c1', headerLabel: 'Item', widthPercent: 50 },
                { id: 'c2', headerLabel: 'Description', widthPercent: 50 }
            ],
            rows: [
                { id: 'r1', cells: { 'c1': 'Service 1', 'c2': 'Details...' } }
            ]
        };
        onChange([...tables, newTable]);
        setActiveTableId(newTable.id);
    };

    const removeTable = (id: string) => {
        if (confirm('Delete this table?')) {
            onChange(tables.filter(t => t.id !== id));
            if (activeTableId === id) setActiveTableId(null);
        }
    };

    const updateActiveTable = (updates: Partial<ContractTableDefinition>) => {
        if (!activeTableId) return;
        const updated = tables.map(t => t.id === activeTableId ? { ...t, ...updates } : t);
        onChange(updated);
    };

    // --- COLUMN MANAGEMENT ---
    const addColumn = () => {
        if (!activeTable) return;
        const newColId = `c-${Date.now()}`;
        const newCol: ContractTableColumn = { id: newColId, headerLabel: 'New Col', widthPercent: 20 };
        
        // Adjust existing widths to fit
        const newCols = [...activeTable.columns, newCol];
        updateActiveTable({ columns: newCols });
    };

    const removeColumn = (colId: string) => {
        if (!activeTable) return;
        if (activeTable.columns.length <= 1) return;
        const newCols = activeTable.columns.filter(c => c.id !== colId);
        updateActiveTable({ columns: newCols });
    };

    const updateColumn = (colId: string, updates: Partial<ContractTableColumn>) => {
        if (!activeTable) return;
        const newCols = activeTable.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
        updateActiveTable({ columns: newCols });
    };

    // --- ROW MANAGEMENT ---
    const addRow = () => {
        if (!activeTable) return;
        const newRow: ContractTableRow = {
            id: `r-${Date.now()}`,
            cells: {}
        };
        // Init cells
        activeTable.columns.forEach(c => newRow.cells[c.id] = '');
        updateActiveTable({ rows: [...activeTable.rows, newRow] });
    };

    const removeRow = (rowId: string) => {
        if (!activeTable) return;
        updateActiveTable({ rows: activeTable.rows.filter(r => r.id !== rowId) });
    };

    const updateCell = (rowId: string, colId: string, value: string) => {
        if (!activeTable) return;
        const newRows = activeTable.rows.map(r => {
            if (r.id === rowId) {
                return { ...r, cells: { ...r.cells, [colId]: value } };
            }
            return r;
        });
        updateActiveTable({ rows: newRows });
    };

    const insertVariableIntoCell = (rowId: string, colId: string, varKey: string) => {
        if (!activeTable) return;
        const row = activeTable.rows.find(r => r.id === rowId);
        const currentVal = row?.cells[colId] || '';
        updateCell(rowId, colId, currentVal + `<<${varKey.toUpperCase()}>>`);
    };

    if (tables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <TableIcon size={48} className="mb-4 opacity-20"/>
                <p className="text-sm mb-4">No custom tables defined.</p>
                <button onClick={addTable} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center">
                    <Plus size={14} className="mr-2"/> Create Table
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-[500px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
            {/* Sidebar List */}
            <div className="w-48 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Tables</span>
                    <button onClick={addTable} className="p-1 hover:bg-blue-100 text-blue-600 rounded"><Plus size={14}/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {tables.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => setActiveTableId(t.id)}
                            className={`p-3 text-xs font-bold cursor-pointer border-l-4 transition-colors flex justify-between group ${activeTableId === t.id ? 'bg-white border-blue-600 text-blue-800' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="truncate">{t.title}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeTable(t.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">
                                <Trash2 size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            {activeTable && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
                        <div className="flex-1 mr-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Table Title</label>
                            <input 
                                type="text" 
                                className="w-full font-bold text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                                value={activeTable.title}
                                onChange={(e) => updateActiveTable({ title: e.target.value })}
                            />
                            <input 
                                type="text" 
                                className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none mt-1"
                                placeholder="Optional description or subtitle..."
                                value={activeTable.description || ''}
                                onChange={(e) => updateActiveTable({ description: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={addColumn} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-50 flex items-center shadow-sm">
                                <Columns size={14} className="mr-1"/> Add Col
                            </button>
                            <button onClick={addRow} className="px-3 py-1.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center shadow-sm">
                                <Rows size={14} className="mr-1"/> Add Row
                            </button>
                        </div>
                    </div>

                    {/* Table Grid */}
                    <div className="flex-1 overflow-auto p-4 bg-slate-100">
                        <div className="bg-white shadow-sm border border-slate-300">
                            {/* Header Row */}
                            <div className="flex border-b border-slate-300 bg-slate-50">
                                {activeTable.columns.map((col, idx) => (
                                    <div 
                                        key={col.id} 
                                        className="p-2 border-r border-slate-300 last:border-r-0 relative group min-w-[100px]"
                                        style={{ width: col.widthPercent ? `${col.widthPercent}%` : 'auto', flex: col.widthPercent ? undefined : 1 }}
                                    >
                                        <input 
                                            className="w-full bg-transparent text-xs font-bold text-center outline-none"
                                            value={col.headerLabel}
                                            onChange={(e) => updateColumn(col.id, { headerLabel: e.target.value })}
                                        />
                                        <button onClick={() => removeColumn(col.id)} className="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                            <X size={10}/>
                                        </button>
                                        
                                        {/* Simple Width Control (Mock) */}
                                        <div className="text-[9px] text-center text-slate-300 mt-1">
                                            <input 
                                                type="number" className="w-8 text-center bg-transparent border-b border-slate-200" 
                                                value={col.widthPercent || ''} placeholder="%"
                                                onChange={(e) => updateColumn(col.id, { widthPercent: Number(e.target.value) })}
                                            /> %
                                        </div>
                                    </div>
                                ))}
                                <div className="w-8 shrink-0"></div> {/* Action Col */}
                            </div>

                            {/* Data Rows */}
                            {activeTable.rows.map((row) => (
                                <div key={row.id} className="flex border-b border-slate-200 last:border-0 hover:bg-blue-50/30">
                                    {activeTable.columns.map((col) => (
                                        <div 
                                            key={`${row.id}-${col.id}`} 
                                            className="border-r border-slate-200 last:border-r-0 relative group min-w-[100px]"
                                            style={{ width: col.widthPercent ? `${col.widthPercent}%` : 'auto', flex: col.widthPercent ? undefined : 1 }}
                                        >
                                            <textarea 
                                                className="w-full h-full p-2 text-xs bg-transparent outline-none resize-none min-h-[40px]"
                                                value={row.cells[col.id] || ''}
                                                onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                            />
                                            {/* In-cell Variable Inserter */}
                                            <div className="absolute top-1 right-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                                <VariableInserter 
                                                    onInsert={(k) => insertVariableIntoCell(row.id, col.id, k)}
                                                    buttonLabel=""
                                                    className="scale-75 origin-top-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="w-8 shrink-0 flex items-center justify-center border-l border-slate-200 bg-slate-50">
                                        <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500">
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableEditor;
