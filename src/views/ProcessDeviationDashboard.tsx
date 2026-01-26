import React, { useMemo } from 'react';
import { RNCRecord, RNCStatus } from '../types';
import { ResponsiveContainer, BarChart, Bar, Tooltip, PieChart, Pie, Cell, XAxis, YAxis, Legend, CartesianGrid, LabelList } from 'recharts';

interface Props {
    data: RNCRecord[];
}

import { normalizeStatus } from '../utils/excelParser';

export const ProcessDeviationDashboard: React.FC<Props> = ({ data }) => {
    // 0. DEDUPLICATION & NORMALIZATION (Strict)
    const cleanData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const uniqueMap = new Map<string, RNCRecord>();
        const duplicates: string[] = [];

        data.forEach(item => {
            // Priority Key: Number (trimmed) -> ID
            const key = item.number && item.number !== "S/N" ? item.number.trim() : item.id;

            if (uniqueMap.has(key)) {
                if (duplicates.length < 5) duplicates.push(key);
            }

            // "Keep newest": Since we iterate, the last one overwrites the previous one
            // Re-normalize status just in case
            const normalizedItem = {
                ...item,
                status: normalizeStatus(item.status, item.closeDate ? new Date(item.closeDate) : null)
            };
            uniqueMap.set(key, normalizedItem);
        });

        const finalData = Array.from(uniqueMap.values());

        // DEV LOGS
        if (process.env.NODE_ENV === 'development') {
            console.log("--- DASHBOARD DATA AUDIT ---");
            console.log(`Total Loaded: ${data.length}`);
            console.log(`After Dedup: ${finalData.length}`);
            console.log(`Duplicates Found: ${data.length - finalData.length} (First 5: ${duplicates.join(', ')})`);
            const open = finalData.filter(d => d.status === RNCStatus.OPEN).length;
            const closed = finalData.filter(d => d.status === RNCStatus.CLOSED).length;
            console.log(`Stats -> Abertas: ${open}, Fechadas: ${closed}`);
            console.log("----------------------------");
        }

        return finalData;
    }, [data]);

    // Compute KPIs using cleanData
    const kpis = useMemo(() => {
        if (!cleanData || cleanData.length === 0) {
            return { total: 0, closed: 0, efficiency: 0, avgDays: 0 };
        }

        const total = cleanData.length;
        const closedRecords = cleanData.filter(d => d.status === RNCStatus.CLOSED && typeof d.days === 'number');
        const closed = cleanData.filter(d => d.status === RNCStatus.CLOSED).length;
        const open = total - closed; // STRICT: derived from subtraction
        const efficiency = total > 0 ? Math.round((closed / total) * 100) : 0;

        const totalDays = closedRecords.reduce((acc, r) => acc + (r.days || 0), 0);
        const avgDays = closedRecords.length > 0 ? (totalDays / closedRecords.length) : 0;

        if (process.env.NODE_ENV === 'development') {
            console.log("--- KPI AUDIT ---");
            console.log({ total, fechadas: closed, abertas: open });
        }

        return { total, open, closed, efficiency, avgDays };
    }, [cleanData]);

    // Ishikawa Logic
    const { ishikawaData, topOccurrences, donutData } = useMemo(() => {
        if (!cleanData || cleanData.length === 0) {
            return { ishikawaData: [], topOccurrences: [], donutData: [] };
        }

        // 6M Categories + Outros
        const ishikawaCategories = ['Método', 'Mão de Obra', 'Máquina', 'Matéria-prima', 'Medição', 'Meio Ambiente', 'Outros'];
        const causeStats: Record<string, number> = {};
        ishikawaCategories.forEach(c => causeStats[c] = 0);

        const occurrences: any[] = [];

        cleanData.forEach(d => {
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
    }, [cleanData]);

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
        return [...cleanData].sort((a, b) => {
            const dateA = a.openDate ? new Date(a.openDate).getTime() : 0;
            const dateB = b.openDate ? new Date(b.openDate).getTime() : 0;
            return dateB - dateA; // Descending (Most recent first)
        });
    }, [cleanData]);

    // --- NEW: Priorities Data (Backlog & List) ---
    const { backlogChartData, openRNCList } = useMemo(() => {
        if (!cleanData) return { backlogChartData: [], openRNCList: [] };

        const openRNCs = cleanData.filter(d => d.status !== RNCStatus.CLOSED);
        const stats: Record<string, { name: string, count: number }> = {};

        // 1. Chart Data (Split multiple responsibles)
        openRNCs.forEach(d => {
            const rawRes = d.responsible || "Não atribuído";

            // FILTER: Never render data with "Não atribuído" in chart (User requirement)
            if (rawRes === "Não atribuído") return;

            // Create array of cleaned names
            const names = rawRes.split(/[\/,;-]+/).map(s => s.trim()).filter(s => s !== "");

            names.forEach(name => {
                if (!stats[name]) {
                    stats[name] = { name: name, count: 0 };
                }
                stats[name].count++;
            });
        });

        const chartData = Object.values(stats)
            .sort((a, b) => b.count - a.count);

        // 2. List Data (Top 10 Open - Priority by Days Open Descending)
        // Ensure calculations are safe (prevent NaN)
        const listData = [...openRNCs].map(d => {
            let daysOpen = 0;
            if (d.openDate) {
                const diff = new Date().getTime() - new Date(d.openDate).getTime();
                daysOpen = Math.ceil(diff / (1000 * 60 * 60 * 24));
            }
            // Fallback for safety
            if (isNaN(daysOpen)) daysOpen = 0;
            return { ...d, daysOpen };
        })
            .sort((a, b) => b.daysOpen - a.daysOpen) // Oldest first (Highest priority)
            .slice(0, 10);

        return { backlogChartData: chartData, openRNCList: listData };
    }, [cleanData]);

    // --- Responsible Data (New Chart) ---
    const responsibleData = useMemo(() => {
        if (!cleanData || cleanData.length === 0) return [];

        const stats: Record<string, { name: string, open: number, closed: number, total: number }> = {};

        cleanData.forEach(d => {
            const responsible = d.responsible || 'Sem Responsável';
            if (!stats[responsible]) {
                stats[responsible] = { name: responsible, open: 0, closed: 0, total: 0 };
            }

            stats[responsible].total++;
            if (d.status === RNCStatus.CLOSED) {
                stats[responsible].closed++;
            } else {
                stats[responsible].open++;
            }
        });

        return Object.values(stats)
            .sort((a, b) => {
                if (b.total !== a.total) return b.total - a.total; // Total Descending
                return b.open - a.open; // Then Open Descending
            });
    }, [cleanData]);

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

            {/* NOVO: RNCs e Responsáveis — Prioridades */}
            <div className="flex flex-col rounded-xl border-t-4 border-t-primary bg-[#19241c] p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] shadow-[0_4px_14px_0_rgba(34,197,94,0.1)]">
                <div className="flex flex-col mb-6">
                    <p className="text-white text-lg font-bold leading-normal">RNCs e Responsáveis — Prioridades 🎯</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Abertas: {kpis.open}</span>
                        <span className="text-white/20">•</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Fechadas: {kpis.closed}</span>
                        <span className="text-white/20">•</span>
                        <span>Eficiência Geral: {kpis.efficiency}%</span>
                    </div>
                </div>

                {backlogChartData.length > 0 || openRNCList.length > 0 ? (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* ESQUERDA: Gráfico (60%) */}
                        <div className="w-full lg:w-[60%] flex flex-col gap-2">
                            <p className="text-sm text-gray-400 font-medium">Backlog por Responsável (Abertas)</p>
                            <div className="h-[300px] w-full min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={backlogChartData}
                                        margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
                                        barSize={24}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={180}
                                            tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 500 }}
                                            tickFormatter={(value) => {
                                                if (typeof value !== 'string') return value;
                                                return value.length > 18 ? `${value.slice(0, 18)}…` : value;
                                            }}
                                            interval={0}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#0c0f0d', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#EF4444' }}
                                            formatter={(value: any) => [value, "RNCs Abertas"]}
                                        />
                                        <Bar dataKey="count" name="RNCs Abertas" fill="#EF4444" radius={[0, 4, 4, 0]}>
                                            <LabelList dataKey="count" position="right" fill="#fff" fontSize={12} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DIREITA: Lista (40%) */}
                        <div className="w-full lg:w-[40%] flex flex-col gap-2">
                            <p className="text-sm text-gray-400 font-medium">RNCs em aberto (Top 10)</p>
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {openRNCList.map((item, idx) => {
                                    const isOverdue = item.daysOpen > 30;
                                    return (
                                        <div key={idx} className="flex flex-col gap-1 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:bg-white/10 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-black text-base tracking-tight group-hover:text-primary transition-colors">RNC-{item.number}</span>
                                                </div>
                                                {isOverdue ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 uppercase tracking-wider">
                                                        Atrasado
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
                                                        Em Prazo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-300 my-0.5">
                                                <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                                                <span className="truncate max-w-[150px] font-medium text-white/90">{item.responsible}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 border-t border-white/5 pt-2">
                                                <span>{item.sector} • {item.type}</span>
                                                <span className={`${isOverdue ? "text-red-400 font-bold" : "text-gray-400"}`}>{item.daysOpen} dias</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                        <span className="material-symbols-outlined text-4xl opacity-50">check_circle</span>
                        <p>Sem pendências no período</p>
                    </div>
                )}
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

            {/* NOVO GRÁFICO: RNCs por Responsável (Abertas x Fechadas) */}
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#19241c] p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]">
                <p className="text-white text-base font-medium leading-normal">RNCs por Responsável — Abertas x Fechadas</p>
                <div className="h-[400px] w-full">
                    {responsibleData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={responsibleData}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                barSize={20}
                            >
                                {/* Eixo X: Quantidade */}
                                <XAxis type="number" hide />

                                {/* Eixo Y: Nomes */}
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    interval={0}
                                />

                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#0c0f0d', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: number, name: string, props: any) => {
                                        if (name === 'open') return [value, 'Abertas'];
                                        if (name === 'closed') return [value, 'Fechadas'];
                                        return [value, name];
                                    }}
                                    labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                {/* Barras Empilhadas */}
                                <Bar dataKey="open" name="Abertas" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="closed" name="Fechadas" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-500">
                            Sem dados para exibir
                        </div>
                    )}
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
