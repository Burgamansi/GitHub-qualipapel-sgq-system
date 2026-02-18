import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus } from '../types';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, CartesianGrid, XAxis, Legend, Customized, ReferenceLine } from 'recharts';

interface Props {
  data: RNCRecord[];
}

export const StrategicDashboard: React.FC<Props> = ({ data }) => {
  // --- Real KPI Calculation ---
  const kpis = useMemo(() => {
    const total = data.length;
    const closedRecords = data.filter(d => d.status === RNCStatus.CLOSED && typeof d.days === 'number');
    const closed = data.filter(d => d.status === RNCStatus.CLOSED).length;
    const open = total - closed;

    // Efficiency: (Closed / Total) * 100
    const efficiency = total > 0 ? (closed / total) * 100 : 0;

    // Avg Time (Days) - using logic: sum(days) / closed count
    const totalDays = closedRecords.reduce((acc, r) => acc + (r.days || 0), 0);
    const avgTime = closedRecords.length > 0 ? (totalDays / closedRecords.length) : 0;

    return { total, open, closed, efficiency, avgTime };
  }, [data]);

  // --- Real Chart Data: Monthly Evolution ---
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const stats = new Array(12).fill(0);

    data.forEach(d => {
      if (d.openDate) {
        const m = d.openDate.getMonth();
        if (m >= 0 && m < 12) stats[m]++;
      }
    });

    return months.map((m, i) => ({ name: m, value: stats[i] }));
  }, [data]);

  // --- Real Chart Data: Type Distribution (J5) ---
  const typeData = useMemo(() => {
    // Categories strictly defined
    const stats: Record<string, number> = {
      "Interna": 0,
      "Fornecedor": 0,
      "Cliente - Reclamação": 0,
      "Cliente - Devolução": 0
    };

    data.forEach(d => {
      // Data comes already normalized from the parser, but we handle fallback just in case
      const type = d.type || "Interna";
      if (stats[type] !== undefined) {
        stats[type]++;
      } else {
        stats["Interna"]++;
      }
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [data]);

  const COLORS = ['#00d46a', '#3b82f6', '#f59e0b', '#ef4444'];

  // Custom Label for Pie Chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0 ? (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h1 className="text-white tracking-tight text-2xl font-bold leading-tight">
          Painel Estratégico – KPIs Anuais <span className="text-primary">(SGQ)</span>
        </h1>
        <p className="text-gray-300 text-base font-normal leading-normal">Visão completa do desempenho anual</p>
      </div>

      {/* KPI Cards - 4 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* TOTAL RNCs ABERTAS */}
        <div className="rounded-xl border border-primary/50 bg-[#19241c] p-6 shadow-neon group hover:-translate-y-1 transition-transform">
          <p className="text-sm text-gray-400">RNCs Abertas 📌</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {kpis.open}
          </p>
          <p className="text-xs text-gray-500 mt-1">Em andamento</p>
        </div>

        {/* TOTAL RNCs FECHADAS */}
        <div className="rounded-xl border border-primary/50 bg-[#19241c] p-6 shadow-neon group hover:-translate-y-1 transition-transform">
          <p className="text-sm text-gray-400">RNCs Fechadas 🗂</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {kpis.closed}
          </p>
          <p className="text-xs text-gray-500 mt-1">Concluídas</p>
        </div>

        {/* EFICIÊNCIA */}
        <div className="rounded-xl border border-primary/50 bg-[#19241c] p-6 shadow-neon group hover:-translate-y-1 transition-transform">
          <p className="text-sm text-gray-400">% Eficiência ⚙️</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {kpis.efficiency.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Taxa de resolução</p>
        </div>

        {/* TEMPO MÉDIO */}
        <div className="rounded-xl border border-primary/50 bg-[#19241c] p-6 shadow-neon group hover:-translate-y-1 transition-transform">
          <p className="text-sm text-gray-400">Tempo Médio 🕒</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {kpis.avgTime.toFixed(1)} dias
          </p>
          <p className="text-xs text-gray-500 mt-1">Abertura → Fechamento</p>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Evolution Area Chart */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6">
          <h3 className="mb-4 text-base font-bold text-white">Evolução Anual de RNCs</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d46a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d46a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#6b7280" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0f0d', borderColor: '#00d46a', color: '#fff' }}
                  itemStyle={{ color: '#00d46a' }}
                />
                <Area type="monotone" dataKey="value" stroke="#00d46a" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution by Type (J5) Donut Chart */}
        <div className="glass-panel rounded-xl p-6 border border-primary/20 shadow-[0_0_15px_rgba(0,212,106,0.1)]">
          <h3 className="mb-4 text-base font-bold text-white text-center">Distribuição por Tipo (J5)</h3>
          <div className="h-72 w-full flex items-center justify-center relative">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={5}
                    dataKey="value"
                    stroke="rgba(0,0,0,0.5)"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>

                  {/* Decorative highlighted green outer border */}
                  <Customized component={({ width, height }: any) => {
                    const minDim = Math.min(width, height);
                    // Outer radius of Pie is 80%. We place ring at ~82%
                    const radius = (minDim / 2) * 0.82;
                    const x = width / 2;
                    const y = height / 2;
                    return (
                      <circle cx={x} cy={y} r={radius} stroke="#00d46a" strokeWidth={1} fill="none" opacity={0.6} />
                    );
                  }} />

                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0f0d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                Aguardando dados...
              </div>
            )}

            {/* Center Text Effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <div className="w-24 h-24 rounded-full border-2 border-primary/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};