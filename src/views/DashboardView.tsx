import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus, RNCType } from '../types';
import { KPICard } from '../components/KPICard';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, FileWarning, TrendingUp } from 'lucide-react';

interface DashboardViewProps {
  data: RNCRecord[];
  filterType?: string | null; // 'Interna', 'Fornecedor', or null for overview
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, filterType }) => {
  
  // 1. Filter Data based on props
  const filteredData = useMemo(() => {
    if (!filterType) return data;
    return data.filter(d => 
      d.type?.toString().toLowerCase().includes(filterType.toLowerCase())
    );
  }, [data, filterType]);

  // 2. Compute KPIs
  const kpi = useMemo(() => {
    const total = filteredData.length;
    const closed = filteredData.filter(d => 
      d.status?.toString().toLowerCase() === RNCStatus.CLOSED.toLowerCase() || 
      d.status?.toString().toLowerCase() === 'fechado'
    ).length;
    const open = total - closed;
    const efficiency = total > 0 ? ((closed / total) * 100).toFixed(1) : "0.0";
    
    // Calculate Average Time (only for closed tickets)
    let totalDays = 0;
    let closedCountWithDates = 0;
    filteredData.forEach(d => {
      if (d.closeDate && d.openDate) {
         const diffTime = Math.abs(d.closeDate.getTime() - d.openDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         totalDays += diffDays;
         closedCountWithDates++;
      }
    });
    const avgTime = closedCountWithDates > 0 ? (totalDays / closedCountWithDates).toFixed(1) : "0";

    return { total, closed, open, efficiency, avgTime };
  }, [filteredData]);

  // 3. Prepare Chart Data
  
  // Status Distribution
  const statusData = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredData.forEach(d => {
      const s = d.status?.toString() || 'Desconhecido';
      stats[s] = (stats[s] || 0) + 1;
    });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  }, [filteredData]);

  // Sector Distribution (Top 5)
  const sectorData = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredData.forEach(d => {
      const s = d.sector || 'Geral';
      stats[s] = (stats[s] || 0) + 1;
    });
    return Object.keys(stats)
      .map(key => ({ name: key, value: stats[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Monthly Evolution
  const monthlyData = useMemo(() => {
    const stats: Record<string, number> = {};
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    filteredData.forEach(d => {
      if (d.openDate) {
        const monthIndex = d.openDate.getMonth();
        const key = months[monthIndex];
        stats[key] = (stats[key] || 0) + 1;
      }
    });

    // Ensure chronological order
    return months.map(m => ({ name: m, RNCs: stats[m] || 0 }));
  }, [filteredData]);

  const COLORS = ['#00d46a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          {filterType ? `Dashboard ${filterType}` : 'Visão Geral'}
        </h2>
        <div className="flex gap-2">
            <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/10">
              {filteredData.length} registros processados
            </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total RNCs" 
          value={kpi.total} 
          icon={FileWarning} 
          color="blue"
        />
        <KPICard 
          title="Em Aberto" 
          value={kpi.open} 
          icon={AlertTriangle} 
          color="red"
          subtitle="Aguardando ação"
        />
        <KPICard 
          title="Eficiência" 
          value={`${kpi.efficiency}%`} 
          icon={CheckCircle2} 
          color="primary"
          subtitle="Taxa de fechamento"
        />
        <KPICard 
          title="Tempo Médio" 
          value={`${kpi.avgTime} dias`} 
          icon={Clock} 
          color="yellow"
          subtitle="Resolução"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary"/> Evolução Mensal
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRNC" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="RNCs" stroke="#00d46a" strokeWidth={3} fillOpacity={1} fill="url(#colorRNC)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Status Atual</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f261d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="glass-panel rounded-xl p-6">
         <h3 className="text-lg font-semibold text-white mb-6">Top 5 Setores com Desvios</h3>
         <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={100}/>
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f261d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" fill="#00d46a" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};