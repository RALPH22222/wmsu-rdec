import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="bg-white p-12 text-center rounded-sm border border-slate-200">
    <Icon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
    <h4 className="text-sm font-bold text-slate-800">{title}</h4>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;
