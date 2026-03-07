
import React, { useState } from 'react';
import { ContractHeaderField } from '../../../../types/contract';
import { Plus, Trash2, GripVertical, Type } from 'lucide-react';
import VariableInserter from '../../../common/VariableInserter';

interface HeaderEditorProps {
    fields: ContractHeaderField[];
    onChange: (fields: ContractHeaderField[]) => void;
}

const HeaderEditor: React.FC<HeaderEditorProps> = ({ fields, onChange }) => {
    // Helper to focus input after variable insertion
    const handleValueChange = (id: string, newVal: string) => {
        const updated = fields.map(f => f.id === id ? { ...f, valueTemplate: newVal } : f);
        onChange(updated);
    };

    const addField = () => {
        const newField: ContractHeaderField = {
            id: `FLD-${Date.now()}`,
            label: 'New Label',
            valueTemplate: '',
            width: 'HALF'
        };
        onChange([...fields, newField]);
    };

    const removeField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const insertVariable = (id: string, varKey: string) => {
        const field = fields.find(f => f.id === id);
        if (field) {
            handleValueChange(id, field.valueTemplate + `<<${varKey.toUpperCase()}>>`);
        }
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Header Information Grid</h4>
                    <p className="text-xs text-slate-500">Define the fields displayed at the top of the contract (e.g. Member Name, Fees).</p>
                </div>
                <button onClick={addField} className="text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-3 rounded flex items-center shadow-sm">
                    <Plus size={14} className="mr-1"/> Add Field
                </button>
            </div>

            <div className="space-y-2">
                {fields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-start group bg-white p-2 rounded border border-slate-200 shadow-sm">
                        <div className="pt-2 text-slate-300 cursor-move"><GripVertical size={16}/></div>
                        
                        <div className="flex-1 grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Label</label>
                                <input 
                                    type="text" 
                                    className="w-full text-xs font-bold border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                                    value={field.label}
                                    onChange={(e) => {
                                        const updated = [...fields];
                                        updated[idx].label = e.target.value;
                                        onChange(updated);
                                    }}
                                />
                            </div>
                            <div className="col-span-6">
                                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between">
                                    <span>Value Template</span>
                                    <VariableInserter 
                                        onInsert={(k) => insertVariable(field.id, k)} 
                                        buttonLabel="Var" 
                                        className="scale-75 origin-right -mt-1"
                                    />
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-blue-500 outline-none p-1.5 font-mono text-blue-600"
                                    value={field.valueTemplate}
                                    placeholder="Static text or <<VARIABLE>>"
                                    onChange={(e) => handleValueChange(field.id, e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Width</label>
                                <select 
                                    className="w-full text-xs border border-slate-200 rounded p-1"
                                    value={field.width}
                                    onChange={(e) => {
                                        const updated = [...fields];
                                        updated[idx].width = e.target.value as 'HALF' | 'FULL';
                                        onChange(updated);
                                    }}
                                >
                                    <option value="HALF">1/2</option>
                                    <option value="FULL">Full</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={() => removeField(field.id)} className="pt-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                        No fields defined. Click "Add Field" to start.
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeaderEditor;
