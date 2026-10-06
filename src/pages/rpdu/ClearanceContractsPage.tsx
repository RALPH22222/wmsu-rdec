import React from 'react';
import { ClearanceContractsManager } from '../../components/rpduComponent/ClearanceContractsManager';

export const ClearanceContractsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <ClearanceContractsManager />
    </div>
  );
};

export default ClearanceContractsPage;
