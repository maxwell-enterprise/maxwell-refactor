
export interface ModifiedColumnDef {
    name: string;
    type: string;
    constraints?: string;
    isPk?: boolean;
    isFk?: boolean;
    fkTarget?: string;
    description?: string;
}

export interface ModifiedTableDef {
    tableName: string;
    columns: ModifiedColumnDef[];
    sqlDefinition: string;
    reasoning: string;
    referenceRawTable?: string; 
}
