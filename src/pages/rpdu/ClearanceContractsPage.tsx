import React from 'react';
import { ContractsNotarizationManager } from '../../components/rpduComponent/ContractsNotarizationManager';

export const ClearanceContractsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <ContractsNotarizationManager />
    </div>
  );
};

export default ClearanceContractsPage;
