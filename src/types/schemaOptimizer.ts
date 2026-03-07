
import { TableDefinition, TableColumn } from '../services/schemaService';

export interface SchemaChange {
  type: 'RENAME_COLUMN' | 'CHANGE_TYPE' | 'ADD_COLUMN' | 'REMOVE_COLUMN' | 'ADD_RELATION' | 'NEW_TABLE' | 'DROP_TABLE' | 'MODIFY_RELATION';
  entity: string; // Table name
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason: string; // The "Why"
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  // New Metadata for Relations
  cardinality?: '1:1' | '1:N' | 'N:M';
  isMandatory?: boolean;
}

export interface OptimizedTable extends TableDefinition {
  isNew?: boolean;
  originalName?: string; // If renamed
}

export interface OptimizationResult {
  originalSchema: TableDefinition[];
  optimizedSchema: OptimizedTable[];
  changes: SchemaChange[];
  sqlMigration: string;
  analysisSummary: string;
}

// NEW: For Versioning
export interface OptimizationHistoryItem {
    id: string;
    version: number;
    timestamp: string;
    summary: string; // Short summary (e.g. "Optimized 5 tables")
    result: OptimizationResult;
}

export interface UserStory {
  id: string;
  epic: 'CRM' | 'FINANCE' | 'OPERATIONS' | 'COMMERCE' | 'SYSTEM';
  role: string;
  intent: string;
  benefit: string;
  text: string; // The full "As a... I want to... So that..." string
}
