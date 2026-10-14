import React from 'react';
import { PreliminaryScreeningManager } from '../rpdu/PreliminaryScreeningManager';

interface PreliminaryScreeningPageProps {
  role?: 'rpdu' | 'admin';
  view?: 'proposals' | 'consolidation';
}

export const PreliminaryScreeningPage: React.FC<PreliminaryScreeningPageProps> = ({
  role = 'rpdu',
  view = 'proposals',
}) => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PreliminaryScreeningManager role={role} view={view} />
    </div>
  );
};

export default PreliminaryScreeningPage;
