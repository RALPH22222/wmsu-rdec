import React from 'react';
import { EvaluatorAssignmentManager } from '../../components/rpduComponent/EvaluatorAssignmentManager';

interface EvaluatorAssignmentPageProps {
  /** Which layout mounts the page (RPDU or Admin); the manager itself behaves the same for both. */
  role?: 'rpdu' | 'admin';
}

export const EvaluatorAssignmentPage: React.FC<EvaluatorAssignmentPageProps> = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <EvaluatorAssignmentManager />
    </div>
  );
};

export default EvaluatorAssignmentPage;
