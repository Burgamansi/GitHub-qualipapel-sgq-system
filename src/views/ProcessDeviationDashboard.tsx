import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus } from '../types';
import { ResponsiveContainer, BarChart, Bar, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface Props {
  data: RNCRecord[];
}

export const ProcessDeviationDashboard: React.FC<Props> = ({ data }) => {
  // Compute KPIs
  const kpis = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, closed: 0, efficiency: 0, avgDays: 0 };
    }

    const total = data.length;
    const closedRecords = data.filter(d => d.status === RNCStatus.CLOSED && typeof d.days === 'number');
    const closed = data.filter(d => d.status === RNCStatus.CLOSED).length;
    const efficiency = total > 0 ? Math.round((closed / total) * 100) : 0;
    
    const totalDays = closedRecords.reduce((acc, r) => acc + (r.days || 0), 0);
    const avgDays = closedRecords.length > 0 ? (totalDays / closedRecords.length) : 0;

    return { total, closed, efficiency, avgDays };
  }, [data]);

  // Ishikawa Logic
  const { ishikawaData, topOccurrences, donutData } = useMemo(() => {
      if (!data || data.length === 0) {
        return { ishikawaData: [], topOccurrences: [], donutData: [] };
      }

      // 6M Categories + Outros
      const ishikawaCategories = ['Método', 'Mão de Obra', 'Máquina', 'Matéria-prima', 'Medição', 'Meio Ambiente', 'Outros'];
      const causeStats: Record<string, number> = {};
      ishikawaCategories.forEach(c => causeStats[c] = 0);

      const occurrences: any[] = [];

      data.forEach(d => {
        const cause = d.cause || '';
        // Simple string matching to categorize
        const matched = ishikawaCategories.find(c => c !== 'Outros' && cause.toLowerCase().includes(c.toLowerCase()));
        
        const category = matched || 'Outros';
        causeStats[category]++;

        occurrences.push({
            id: d.id,
            number: d.number,
            category: category,
            description: d.description,
            // Assign color based on category later
            color: '' 
        });
      });

      const chartData = ishikawaCategories
        .map(c => ({ name: c, value: causeStats[c] }))
        .filter(d => d.value > 0); // Only show categories with data in the charts
      
      // Top 5 Occurrences (just taking first 5 for now)
      const top5 = occurrences.slice(0, 5);
      
      const ISHIKAWA_COLORS: Record<string, string> = {
        'Método': '#22c55e', 
        'Mão de Obra': '#3b82f6', 
        'Máquina': '#fbbf24', 
        'Matéria-prima': '#f97316', 
        'Medição': '#a855f7', 
        'Meio Ambiente': '#16a34a', 
        'Outros': '#888888'
      };

      top5.forEach(o => o.color = ISHIKAWA_COLORS[o.category] || '#888888');

      return { ishikawaData: chartData, topOccurrences: top5, donutData: chartData };
  }, [data]);

  const ISHIKAWA_COLORS: Record<string, string> = {
    'Método': '#22c55e', 
    'Mão de Obra': '#3b82f6', 
    'Máquina': '#fbbf24', 
    'Matéria-prima': '#f97316', 
    'Medição': '#a855f7', 
    'Meio Ambiente': '#16a34a', 
    'Outros': '#888888'
  };

  // --- Helper: Get Days (Dynamic for Open, Static for Closed) ---
  const getDays = (r: RNCRecord) => {
    // If closed and parsed successfully with days
    if (r.status === RNCStatus.CLOSED && typeof r.days === 'number') {
      return r.days;
    }
    // If still open, calculate diff from today
    if (r.openDate) {
      const diff = new Date().getTime() - r.openDate.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  // --- Table Data Sort ---
  const sortedTableData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = a.openDate ? new Date(a.openDate).getTime() : 0;
      const dateB = b.openDate ? new Date(b.openDate).getTime() : 0;
      return dateB - dateA; // Descending (Most recent first)
    });
  }, [data]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col">
        <h1 className="text-white tracking-light text-[28px] font-bold leading-tight text-left">Desvios por Processo</h1>
        <p className="text-white/70 text-lg">Painel Interativo de Indicadores</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-[#19241c] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border-b-2 border-primary/50 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)]">
            <p className="text-gray-300 text-sm font-medium">Desvios Registrados 📌</p>
            <p className="text-white tracking-light text-3xl font-bold">{kpis.total}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-[#19241c] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border-b-2 border-primary/50 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)]">
            <p className="text-gray-300 text-sm font-medium">Desvios Fechados 📁</p>
            <p className="text-white tracking-light text-3xl font-bold">{kpis.closed}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-[#19241c] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border-b-2 border-primary/50 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)]">
            <p className="text-gray-300 text-sm font-medium">% Eficiência ⚙️</p>
            <p className="text-white tracking-light text-3xl font-bold">{kpis.efficiency}%</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-[#19241c] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border-b-2 border-primary/50 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)]">
            <p className="text-gray-300 text-sm font-medium">Tempo Médio ⏱️</p>
            <p className="text-white tracking-light text-3xl font-bold">{kpis.avgDays.toFixed(1)}d</p>
        </div>
      </div>

      {/* Main Bar Chart - Ishikawa */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#19241c] p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]">
        <p className="text-white text-base font-medium leading-normal">Tipos de Desvio por Processo — Ishikawa 🧭</p>
        <div className="h-64 w-full">
            {ishikawaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ishikawaData} barSize={40}>
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                            contentStyle={{ backgroundColor: '#0c0f0d', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {ishikawaData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={ISHIKAWA_COLORS[entry.name] || '#888'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                   Sem dados para exibir
                </div>
            )}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-2">
            {Object.keys(ISHIKAWA_COLORS).map(cat => (
                <div key={cat} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ISHIKAWA_COLORS[cat] }}></span>
                    {cat}
                </div>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3 rounded-xl bg-[#19241c] p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] border border-white/10">
            <h3 className="text-white text-base font-medium">Registros Recentes</h3>
            <ul className="space-y-4 text-sm text-gray-300">
                {topOccurrences.length > 0 ? topOccurrences.map((item, idx) => (
                    <li key={idx} className="border-l-2 pl-3 py-1 flex flex-col" style={{ borderColor: item.color }}>
                        <span className="font-semibold text-white/90">{item.category} — RNC-{item.number}</span>
                        <span className="text-white/60 text-xs truncate">{item.description}</span>
                    </li>
                )) : (
                    <p className="text-gray-500 text-sm italic">Nenhuma ocorrência encontrada.</p>
                )}
            </ul>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#19241c] p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]">
            <p className="text-white text-base font-medium leading-normal">Distribuição Geral dos Desvios (%) 📊</p>
            <div className="h-64 w-full relative">
                {donutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                          >
                              {donutData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={ISHIKAWA_COLORS[entry.name] || '#888'} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0c0f0d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">Sem dados</div>
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-gray-400 text-xs">Total Desvios</span>
                    <span className="text-white text-3xl font-bold">{kpis.total}</span>
                </div>
            </div>
          </div>
      </div>

      {/* Tabela Detalhada: Relação de RNCs por Processo */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
         <div className="p-6 border-b border-white/10">
             <h3 className="text-lg font-bold text-white">Relação de RNCs por Processo</h3>
         </div>
         
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-[#1a2e24] text-gray-300">
                     <tr>
                         <th className="p-4 font-semibold whitespace-nowrap">Nº</th>
                         <th className="p-4 font-semibold whitespace-nowrap">Setor</th>
                         <th className="p-4 font-semibold whitespace-nowrap">Tipo</th>
                         <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                         <th className="p-4 font-semibold whitespace-nowrap">Data de Abertura</th>
                         <th className="p-4 font-semibold whitespace-nowrap text-center">Status Visual</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                     {sortedTableData.map((row, idx) => {
                         const days = getDays(row);
                         const isClosed = row.status === RNCStatus.CLOSED;
                         const isLate = !isClosed && days > 60;
                         
                         // Visual Status Logic
                         let badgeClass = "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
                         let badgeText = `Aberto (${days} dias)`;

                         if (isClosed) {
                             badgeClass = "bg-primary/20 text-primary border-primary/30";
                             badgeText = `Fechado (${days} dias)`;
                         } else if (isLate) {
                             badgeClass = "bg-red-500/20 text-red-500 border-red-500/30";
                             badgeText = `Atrasado (${days} dias)`;
                         }

                         return (
                             <tr key={idx} className="hover:bg-white/5 transition-colors">
                                 <td className="p-4 font-mono text-white/90">{row.number}</td>
                                 <td className="p-4 text-gray-300">{row.sector}</td>
                                 <td className="p-4 text-gray-400 text-xs">{row.type}</td>
                                 <td className="p-4">
                                     <span className={`font-medium ${isClosed ? 'text-primary' : 'text-yellow-400'}`}>
                                         {row.status}
                                     </span>
                                 </td>
                                 <td className="p-4 text-gray-400">{row.openDate ? new Date(row.openDate).toLocaleDateString() : '-'}</td>
                                 <td className="p-4 text-center">
                                     <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                                         {badgeText}
                                     </span>
                                 </td>
                             </tr>
                         );
                     })}
                     {sortedTableData.length === 0 && (
                         <tr>
                             <td colSpan={6} className="p-8 text-center text-gray-500">
                                 Nenhum registro encontrado.
                             </td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};
