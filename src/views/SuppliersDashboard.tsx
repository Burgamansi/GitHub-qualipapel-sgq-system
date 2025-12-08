import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus, RNCType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props {
  data: RNCRecord[];
}

export const SuppliersDashboard: React.FC<Props> = ({ data }) => {
  // 1. Filter only Supplier RNCs
  const supplierData = useMemo(() => {
    return data.filter(d => d.type === RNCType.SUPPLIER);
  }, [data]);

  // 2. Compute KPIs
  const kpis = useMemo(() => {
    const total = supplierData.length;
    const closedRecords = supplierData.filter(d => d.status === RNCStatus.CLOSED && typeof d.days === 'number');
    const closed = supplierData.filter(d => d.status === RNCStatus.CLOSED).length;
    const open = total - closed;
    const efficiency = total > 0 ? ((closed / total) * 100).toFixed(1) : "0.0";

    const totalDays = closedRecords.reduce((acc, r) => acc + (r.days || 0), 0);
    const avgTime = closedRecords.length > 0 ? (totalDays / closedRecords.length) : 0;

    return { open, closed, efficiency, avgTime };
  }, [supplierData]);

  // 3. Prepare Chart Data: RNCs per Supplier
  const supplierChartData = useMemo(() => {
    const stats: Record<string, number> = {};
    supplierData.forEach(d => {
      // Clean up supplier name if possible
      const supName = d.supplier && d.supplier.length > 2 ? d.supplier : 'Não Identificado';
      stats[supName] = (stats[supName] || 0) + 1;
    });
    return Object.keys(stats)
      .map(key => ({ name: key, value: stats[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [supplierData]);

  // 4. Prepare Chart Data: Top Causes
  const causeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    supplierData.forEach(d => {
      const c = d.cause || 'Não especificado';
      stats[c] = (stats[c] || 0) + 1;
    });
    const totalCauses = supplierData.length || 1; 
    return Object.keys(stats)
      .map(key => ({ 
        label: key, 
        count: stats[key], 
        percentage: ((stats[key] / totalCauses) * 100).toFixed(0) 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [supplierData]);

  return (
    <div className="space-y-6 pb-10">
        <div className="text-center pt-2 pb-4">
            <h1 className="text-white tracking-tight text-3xl font-bold leading-tight">Fornecedores</h1>
            <p className="text-gray-300 text-base font-normal leading-normal">Monitoramento de Qualidade Externa</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4 relative overflow-hidden bg-white/5 group hover:bg-white/10 transition-all">
                <p className="text-sm font-medium text-white/80 uppercase tracking-wider">RNCs Abertas 📦</p>
                <p className="text-3xl font-bold text-white mt-1">{kpis.open}</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            </div>
            <div className="glass-panel rounded-xl p-4 relative overflow-hidden bg-white/5 group hover:bg-white/10 transition-all">
                <p className="text-sm font-medium text-white/80 uppercase tracking-wider">RNCs Fechadas ✅</p>
                <p className="text-3xl font-bold text-white mt-1">{kpis.closed}</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
            </div>
            <div className="glass-panel rounded-xl p-4 relative overflow-hidden bg-white/5 group hover:bg-white/10 transition-all">
                <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Eficiência % 📈</p>
                <p className="text-3xl font-bold text-white mt-1">{kpis.efficiency}%</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            </div>
            <div className="glass-panel rounded-xl p-4 relative overflow-hidden bg-white/5 group hover:bg-white/10 transition-all">
                <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Fechamento ⏳</p>
                <p className="text-3xl font-bold text-white mt-1">{kpis.avgTime.toFixed(1)}d</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
            </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* RNCs by Supplier Chart */}
            <div className="glass-panel rounded-xl p-6 bg-white/5">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">bar_chart</span>
                    <p className="text-base font-medium text-white">RNCs por Fornecedor (Top 10)</p>
                </div>
                
                <div className="h-[300px] w-full">
                  {supplierChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          contentStyle={{ backgroundColor: '#0f261d', border: '1px solid #1f4f38', borderRadius: '8px', color: '#fff' }} 
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                           {supplierChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#00d46a" fillOpacity={0.8} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500 text-sm italic">
                      Nenhum dado de fornecedor encontrado.
                    </div>
                  )}
                </div>
            </div>

            {/* Top Causes Progress Bars */}
            <div className="glass-panel rounded-xl p-6 bg-white/5">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">warning</span>
                    <p className="text-base font-medium text-white">Top Causas – Fornecedor</p>
                </div>
                
                <div className="space-y-5">
                    {causeStats.length > 0 ? (
                      causeStats.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[140px_1fr_40px] items-center gap-4">
                            <p className="text-sm font-medium text-white/80 truncate" title={item.label}>{item.label}</p>
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-1000 ease-out" 
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-gray-400 text-right">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-gray-500 text-sm italic">
                        Nenhuma causa registrada.
                      </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};