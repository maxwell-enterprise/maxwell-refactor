
import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Undo, Redo } from 'lucide-react';
import VariableInserter from '../common/VariableInserter'; // NEW IMPORT

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    availableVariables?: string[]; // Deprecated, now using global catalog
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef(false);

    // Sync external value changes to DOM
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML && !isTypingRef.current) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const execCmd = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertVariable = (variableKey: string) => {
        // Ensure editor has focus to insert at cursor
        editorRef.current?.focus();
        execCmd('insertText', `{{${variableKey}}}`);
    };

    const handleInput = () => {
        if (editorRef.current) {
            isTypingRef.current = true;
            onChange(editorRef.current.innerHTML);
            setTimeout(() => { isTypingRef.current = false; }, 100); 
        }
    };

    const handleImagePrompt = () => {
        const url = prompt('Enter Image URL:', 'https://');
        if (url) execCmd('insertImage', url);
    };

    return (
        <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all h-full">
            {/* Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-2.5 flex flex-wrap gap-1.5 sm:gap-1 items-center shrink-0">
                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden mr-2">
                    <button onClick={() => execCmd('undo')} className="p-2 hover:bg-slate-100 text-slate-600" title="Undo"><Undo size={14}/></button>
                    <button onClick={() => execCmd('redo')} className="p-2 hover:bg-slate-100 text-slate-600" title="Redo"><Redo size={14}/></button>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden mr-2">
                    <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-100 text-slate-600" title="Bold"><Bold size={14}/></button>
                    <button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-100 text-slate-600" title="Italic"><Italic size={14}/></button>
                    <button onClick={() => execCmd('underline')} className="p-2 hover:bg-slate-100 text-slate-600" title="Underline"><Underline size={14}/></button>
                </div>
                
                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden mr-2">
                    <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-slate-100 text-slate-600"><AlignLeft size={14}/></button>
                    <button onClick={() => execCmd('justifyCenter')} className="p-2 hover:bg-slate-100 text-slate-600"><AlignCenter size={14}/></button>
                    <button onClick={() => execCmd('justifyRight')} className="p-2 hover:bg-slate-100 text-slate-600"><AlignRight size={14}/></button>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden mr-2">
                    <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-slate-100 text-slate-600"><List size={14}/></button>
                    <button onClick={handleImagePrompt} className="p-2 hover:bg-slate-100 text-slate-600"><ImageIcon size={14}/></button>
                </div>

                {/* Variable inserter: full row on narrow screens so toolbar doesn’t crush */}
                <div className="w-full sm:w-auto sm:ml-auto flex justify-end pt-1 sm:pt-0 border-t border-slate-200/80 sm:border-0">
                    <VariableInserter onInsert={insertVariable} buttonLabel="Data Field" />
                </div>
            </div>

            {/* Editing Area */}
            <div 
                ref={editorRef}
                contentEditable
                className="flex-1 p-6 outline-none text-sm text-slate-800 leading-relaxed overflow-y-auto prose prose-sm max-w-none"
                onInput={handleInput}
                suppressContentEditableWarning={true}
                style={{ minHeight: '300px' }}
            />
        </div>
    );
};

export default RichTextEditor;
