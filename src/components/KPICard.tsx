import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  color?: 'primary' | 'blue' | 'yellow' | 'red' | 'purple';
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const colorMap = {
    primary: 'text-primary border-primary/30 bg-primary/5',
    blue: 'text-blue-400 border-blue-400/30 bg-blue-500/5',
    yellow: 'text-yellow-400 border-yellow-400/30 bg-yellow-500/5',
    red: 'text-red-400 border-red-400/30 bg-red-500/5',
    purple: 'text-purple-400 border-purple-400/30 bg-purple-500/5',
  };

  return (
    <div className={`glass-panel rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-t-2 ${
      color === 'primary' ? 'border-t-primary' : 
      color === 'blue' ? 'border-t-blue-400' :
      color === 'yellow' ? 'border-t-yellow-400' :
      color === 'red' ? 'border-t-red-400' : 'border-t-purple-400'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
        {Icon && <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>}
      </div>
      <div className="flex items-end gap-2">
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {trend && <span className="text-xs font-medium text-primary mb-1.5">{trend}</span>}
      </div>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      
      {/* Background Glow Effect */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-10 ${
        color === 'primary' ? 'bg-primary' : 
        color === 'red' ? 'bg-red-500' : 
        'bg-blue-500'
      }`}></div>
    </div>
  );
};