import React, { useMemo } from 'react';
import { RNCRecord } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: RNCRecord[];
}

export const MonthlyDashboard: React.FC<Props> = ({ data }) => {
  const chartData = useMemo(() => {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyStats: Record<string, number> = {};
      
      data.forEach(d => {
        if (d.openDate) {
          const monthIndex = d.openDate.getMonth();
          const key = months[monthIndex];
          monthlyStats[key] = (monthlyStats[key] || 0) + 1;
        }
      });

      return months.map(m => ({ name: m, RNCs: monthlyStats[m] || 0 }));
  }, [data]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col">
        <h1 className="text-white tracking-light text-[28px] font-bold leading-tight text-left">Painel Mensal</h1>
        <p className="text-white/70 text-lg">Evolução e Tendências</p>
      </div>

      <div className="glass-panel rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Evolução Mensal de RNCs</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d46a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d46a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f261d', border: '1px solid #1f4f38', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="RNCs" stroke="#00d46a" strokeWidth={3} fillOpacity={1} fill="url(#colorMonth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
    </div>
  );
};
