import React from 'react';
import { PreliminaryScreeningManager } from '../rpdu/PreliminaryScreeningManager';

interface PreliminaryScreeningPageProps {
  role?: 'rpdu' | 'admin';
}

export const PreliminaryScreeningPage: React.FC<PreliminaryScreeningPageProps> = ({
  role = 'rpdu',
}) => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PreliminaryScreeningManager role={role} />
    </div>
  );
};

export default PreliminaryScreeningPage;
