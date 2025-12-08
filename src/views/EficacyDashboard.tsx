import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { KPICard } from '../components/KPICard';

interface Props {
  data: RNCRecord[];
}

export const EficacyDashboard: React.FC<Props> = ({ data }) => {
  const kpis = useMemo(() => {
    const total = data.length;
    const closed = data.filter(d => d.status === RNCStatus.CLOSED).length;
    
    // Calculate effective vs not effective
    // Logic: If Closed <= Deadline -> Effective
    let effective = 0;
    
    data.forEach(d => {
        if (d.status === RNCStatus.CLOSED) {
            if (d.deadline && d.closeDate) {
                if (d.closeDate <= d.deadline) {
                    effective++;
                }
            } else {
                // If no deadline exists to compare, treat as effective for now
                effective++;
            }
        }
    });

    const notEffective = closed - effective;
    const effectivenessRate = closed > 0 ? ((effective / closed) * 100).toFixed(1) : "0.0";

    return { total, closed, effective, notEffective, effectivenessRate };
  }, [data]);

  const chartData = [
    { name: 'Efetivas', value: kpis.effective, color: '#00d46a' },
    { name: 'Não Efetivas', value: kpis.notEffective, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col">
        <h1 className="text-white tracking-light text-[28px] font-bold leading-tight text-left">Eficácia & Indicadores</h1>
        <p className="text-white/70 text-lg">Visão geral da taxa de reincidência e eficácia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total de RNCs" value={kpis.total} color="primary" />
        <KPICard title="RNCs Fechadas" value={kpis.closed} color="primary" />
        <KPICard title="Efetivas (Prazo)" value={kpis.effective} color="primary" />
        <KPICard title="Fora do Prazo" value={kpis.notEffective} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-xl p-6 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-white mb-2 self-start">Efetividade das RNCs Fechadas</h3>
            <div className="h-64 w-full relative">
                {kpis.closed > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0c0f0d', borderRadius: '8px', border: 'none' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        Sem dados de fechamento
                    </div>
                )}
                {kpis.closed > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-white text-3xl font-bold">{kpis.effectivenessRate}%</span>
                        <span className="text-gray-400 text-xs">Dentro do Prazo</span>
                    </div>
                )}
            </div>
            {kpis.closed > 0 && (
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#00d46a]"></div>
                        <span className="text-sm text-white/80">Dentro do Prazo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                        <span className="text-sm text-white/80">Fora do Prazo</span>
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};