import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, size = 'sm' }) => (
  <div className={`text-center rounded-sm ${size === 'md' ? 'px-2 py-8 sm:px-6 sm:py-10' : 'bg-white p-12 border border-slate-200'}`}>
    <Icon aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-3" />
    <h4 className={`${size === 'md' ? 'text-lg' : 'text-sm'} font-bold text-slate-800`}>{title}</h4>
    {description && <p className={`${size === 'md' ? 'text-base leading-relaxed max-w-xl mt-2' : 'text-xs max-w-md mt-1'} text-slate-500 mx-auto`}>{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;
