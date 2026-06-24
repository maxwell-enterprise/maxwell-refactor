
import React from 'react';
import { UserRole } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { Server } from 'lucide-react';
import AIBlueprintArchitect from './AIBlueprintArchitect';

const SchemaViewer: React.FC = () => {
  const { userRole } = useAuth();

  if (userRole !== UserRole.SUPER_ADMIN) {
      return (
          <div className="page-container flex min-h-[50vh] flex-col items-center justify-center text-slate-400">
              <Server size={64} className="mb-4 text-slate-200" />
              <h2 className="text-xl font-bold text-slate-600">Restricted Area</h2>
              <p>Database Schema is only accessible to Super Admins.</p>
          </div>
      );
  }

  // Directly render the robust Architect suite which now includes the baseline viewer as Tab 1
  return (
    <div className="relative w-full min-w-0">
        <AIBlueprintArchitect />
    </div>
  );
};

export default SchemaViewer;
