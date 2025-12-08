import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus, RNCType } from '../types';
import { KPICard } from '../components/KPICard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: RNCRecord[];
}

export const InternalDashboard: React.FC<Props> = ({ data }) => {
  // Filter for Internal RNCs only (normalized as "Interna" by parser)
  const internalData = useMemo(() => {
    return data.filter(d => d.type === RNCType.INTERNAL || d.type === "Interna");
  }, [data]);

  // Compute KPIs
  const kpis = useMemo(() => {
    if (!internalData || internalData.length === 0) {
        return { total: 0, open: 0, closed: 0, efficiency: "0.0", avgTime: 0 };
    }
    const total = internalData.length;
    const closedRecords = internalData.filter(d => d.status === RNCStatus.CLOSED && typeof d.days === 'number');
    const closed = internalData.filter(d => d.status === RNCStatus.CLOSED).length;
    const open = total - closed;
    const efficiency = total > 0 ? ((closed / total) * 100).toFixed(1) : "0.0";
    
    const totalDays = closedRecords.reduce((acc, r) => acc + (r.days || 0), 0);
    const avgTime = closedRecords.length > 0 ? (totalDays / closedRecords.length) : 0;

    return { total, open, closed, efficiency, avgTime };
  }, [internalData]);

  // Sector Distribution (Group by normalized sector)
  const sectorData = useMemo(() => {
    const stats: Record<string, number> = {};
    internalData.forEach(d => {
        // Parser ensures sector is normalized or "Indefinido"
        const s = d.sector || 'Indefinido'; 
        stats[s] = (stats[s] || 0) + 1;
    });
    
    return Object.keys(stats)
        .map(key => ({ name: key, value: stats[key] }))
        .sort((a, b) => b.value - a.value);
  }, [internalData]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col">
        <h1 className="text-white tracking-light text-[28px] font-bold leading-tight text-left">Processos Internos</h1>
        <p className="text-white/70 text-lg">Painel de Gestão Interativa 📊</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="RNCs Internas Abertas 📌" 
          value={kpis.open} 
          color="red"
          subtitle="Em andamento"
        />
        <KPICard 
          title="RNCs Internas Fechadas 📁" 
          value={kpis.closed} 
          color="primary"
          subtitle="Concluídas"
        />
        <KPICard 
          title="% Eficiência Internas ⚙️" 
          value={`${kpis.efficiency}%`} 
          color="primary"
          subtitle="Taxa de resolução"
        />
        <KPICard 
          title="Tempo Médio Fechamento ⏱️" 
          value={`${kpis.avgTime.toFixed(1)}d`} 
          color="yellow"
          subtitle="Abertura → Fechamento"
        />
      </div>

      <div className="glass-panel rounded-xl p-6">
         <h3 className="text-lg font-semibold text-white mb-6">RNC Internas por Setor</h3>
         <div className="h-[300px]">
           {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false}/>
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f261d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" fill="#00d46a" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
           ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
               Sem dados internos processados.
            </div>
           )}
         </div>
      </div>
    </div>
  );
};