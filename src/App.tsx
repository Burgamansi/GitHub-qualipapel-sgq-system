import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { StrategicDashboard } from './views/StrategicDashboard';
import { InternalDashboard } from './views/InternalDashboard';
import { SuppliersDashboard } from './views/SuppliersDashboard';
import { ProcessDeviationDashboard } from './views/ProcessDeviationDashboard';
import { EficacyDashboard } from './views/EficacyDashboard';
import { MonthlyDashboard } from './views/MonthlyDashboard';
import { LandingPage } from './views/LandingPage';
import { EndSession } from './views/EndSession';
import { RNCRecord } from './types';
import { parseExcelFile } from './utils/excelParser';
import { usePersistence } from './hooks/usePersistence';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const { data: rncData, setData: setRncData, saveData, saveAllData, clearData, upsertToCloud, lastSync, isSyncing } = usePersistence();
  const [activeView, setActiveView] = useState('general');
  const [showLanding, setShowLanding] = useState(true);
  const [showEndSession, setShowEndSession] = useState(false);

  // --- Filter State ---
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');

  // Auto-enter dashboard if data exists on mount (handled by usePersistence + effect here)
  useEffect(() => {
    if (rncData.length > 0 && showLanding) {
      setShowLanding(false);
    }
  }, [rncData]);

  // Helper to append data (UPSERT Logic)
  // Implements strict deduplication & update logic and AUTO-SAVES
  const handleDataLoaded = useCallback(async (newData: RNCRecord[]) => {
    // 0. Filter invalid items from input
    const validImports = newData.filter(rec => rec && rec.number && rec.number !== "S/N");

    if (validImports.length === 0) {
      toast("Nenhum dado novo encontrado.", { icon: 'ℹ️' });
      return;
    }

    try {
      // 1. Direct Cloud Upsert (Single Source of Truth)
      // We rely on Firestore's realtime subscription to update the UI
      await rncService.upsertMany(validImports);
      toast.success(`Importação enviada: ${validImports.length} registros processados.`);
    } catch (error) {
      console.error("Falha na importação", error);
      toast.error("Erro ao salvar dados na nuvem.");
    }
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      const allData: RNCRecord[] = [];
      let hasError = false;

      // Optional: Show loading state if needed, but for now we just process

      for (const file of files) {
        try {
          const records = await parseExcelFile(file);
          if (records.length > 0) {
            allData.push(...records);
          }
        } catch (err) {
          console.error(`Error parsing file ${file.name}`, err);
          hasError = true;
          toast.error(`Erro ao ler o arquivo ${file.name}`);
        }
      }

      if (allData.length > 0) {
        handleDataLoaded(allData);
        // Toast is now handled inside handleDataLoaded to show specific counts
      } else if (!hasError) {
        toast("Nenhum dado válido encontrado nos arquivos.", { icon: '⚠️' });
      }

      // Reset input
      event.target.value = '';
    }
  }, [handleDataLoaded]);

  // --- Dynamic Filter Options ---
  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const sectors = new Set<string>();
    const types = new Set<string>();
    const responsibles = new Set<string>();

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    rncData.forEach(item => {
      if (item.openDate) {
        years.add(item.openDate.getFullYear().toString());
        months.add(monthNames[item.openDate.getMonth()]);
      }
      if (item.sector) sectors.add(item.sector);
      if (item.type) types.add(item.type.toString());
      if (item.responsible) responsibles.add(item.responsible);
    });

    const yearlyOptions = Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending

    if (process.env.NODE_ENV === 'development') {
      console.log("[FILTER] Computed Years:", yearlyOptions);
    }

    return {
      years: yearlyOptions,
      months: Array.from(months),
      sectors: Array.from(sectors).sort(),
      types: Array.from(types).sort(),
      responsibles: Array.from(responsibles).sort(),
    };
  }, [rncData]);

  // --- Apply Filters ---
  const filteredData = useMemo(() => {
    return rncData.filter(item => {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      // Year Filter (Priority)
      const matchYear = selectedYear ? (item.openDate && item.openDate.getFullYear().toString() === selectedYear) : true;
      const matchMonth = selectedMonth ? (item.openDate && monthNames[item.openDate.getMonth()] === selectedMonth) : true;
      const matchSector = selectedSector ? item.sector === selectedSector : true;
      const matchType = selectedType ? item.type === selectedType : true;
      const matchResponsible = selectedResponsible ? item.responsible === selectedResponsible : true;

      return matchYear && matchMonth && matchSector && matchType && matchResponsible;
    });
  }, [rncData, selectedYear, selectedMonth, selectedSector, selectedType, selectedResponsible]);

  // --- Apply Sorting (Descending by Number) ---
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const getNum = (str: string | undefined) => {
        if (!str) return 0;
        const nums = String(str).replace(/\D/g, '');
        return nums ? Number(nums) : 0;
      };

      const numA = getNum(a.number);
      const numB = getNum(b.number);

      return numB - numA; // Descending (Higher number first)
    });
  }, [filteredData]);

  const clearFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedSector('');
    setSelectedType('');
    setSelectedResponsible('');
  };

  const renderView = () => {
    // Pass sortedData instead of filteredData or rncData
    const dataToUse = sortedData;

    switch (activeView) {
      case 'general': return <StrategicDashboard data={dataToUse} />;
      case 'internal': return <InternalDashboard data={dataToUse} />;
      case 'suppliers': return <SuppliersDashboard data={dataToUse} />;
      case 'efficacy': return <EficacyDashboard data={dataToUse} />;
      case 'monthly': return <MonthlyDashboard data={dataToUse} />;
      case 'deviation': return <ProcessDeviationDashboard data={dataToUse} />;
      default: return <StrategicDashboard data={dataToUse} />;
    }
  };

  const handleLogoutRequest = () => {
    setShowEndSession(true);
  };

  const handleManualSave = useCallback(() => {
    saveAllData();
    toast.success("Dados salvos na nuvem ☁️");
  }, [saveAllData]);

  const handleSaveAndExit = () => {
    saveAllData();
    toast.success("Arquivos salvos com sucesso!");

    // Delay for toast visibility before redirecting
    setTimeout(() => {
      setShowEndSession(false);
      setShowLanding(true);
      // Data is NOT cleared here, complying with "Sair e Salvar" requirements
      clearFilters();
    }, 800);
  };

  const handleClearAndExit = () => {
    clearData(); // Clears storage and cloud
    toast.success("Dados apagados com sucesso.");
    clearFilters();
    setShowEndSession(false);
    setShowLanding(true);
  };

  // --- ROUTING LOGIC ---
  if (showLanding) {
    return (
      <LandingPage
        onDataLoaded={handleDataLoaded}
        onEnterDashboard={() => setShowLanding(false)}
        savedDataCount={rncData.length}
      />
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {showEndSession && (
        <EndSession
          onSaveAndExit={handleSaveAndExit}
          onClearAndExit={handleClearAndExit}
          onCancel={() => setShowEndSession(false)}
        />
      )}

      <div className="flex min-h-screen w-full bg-background-dark font-display text-white selection:bg-primary selection:text-black">
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          onSave={handleManualSave}
          onLogout={handleLogoutRequest}
        />

        <main className="ml-64 flex-1 p-8">
          {/* Top Header Section */}
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Search Bar */}
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">search</span>
                <input
                  type="text"
                  placeholder="Buscar RNC..."
                  className="w-64 rounded-lg border border-white/10 bg-[#19241c] py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner"
                />
              </div>

              {/* Sync Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#19241c] border border-white/5 text-xs text-gray-400">
                <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin text-primary' : 'text-primary'}`}>
                  {isSyncing ? 'sync' : 'cloud_done'}
                </span>
                {isSyncing ? (
                  <span>Sincronizando...</span>
                ) : (
                  <span>
                    {lastSync ? `Sincronizado às ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary px-4 py-2 rounded-lg transition-all group shadow-[0_0_10px_rgba(0,212,106,0.1)] hover:shadow-[0_0_15px_rgba(0,212,106,0.3)]">
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">cloud_upload</span>
                <span className="text-sm font-bold">Importar Dados</span>
                <input
                  type="file"
                  multiple
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#19241c] border border-white/5 text-gray-400 hover:text-white hover:border-primary/50 transition-all hover:shadow-[0_0_10px_rgba(0,212,106,0.2)]">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </div>
          </header>

          {/* Dynamic Universal Filters Bar */}
          <div className="mb-8 rounded-lg border border-white/10 bg-[#19241c]/50 p-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-4">

              {/* Year Filter */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#28392f] py-2 pl-4 pr-10 text-sm font-medium text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-[#2f4236] transition-colors"
                >
                  <option value="">Ano (todos)</option>
                  {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
              </div>

              {/* Month Filter */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#28392f] py-2 pl-4 pr-10 text-sm font-medium text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-[#2f4236] transition-colors"
                >
                  <option value="">Mês (todos)</option>
                  {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
              </div>

              {/* Sector Filter */}
              <div className="relative">
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#28392f] py-2 pl-4 pr-10 text-sm font-medium text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-[#2f4236] transition-colors"
                >
                  <option value="">Setor (todos)</option>
                  {filterOptions.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#28392f] py-2 pl-4 pr-10 text-sm font-medium text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-[#2f4236] transition-colors"
                >
                  <option value="">Tipo (todos)</option>
                  {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
              </div>

              {/* Responsible Filter */}
              <div className="relative">
                <select
                  value={selectedResponsible}
                  onChange={(e) => setSelectedResponsible(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#28392f] py-2 pl-4 pr-10 text-sm font-medium text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer hover:bg-[#2f4236] transition-colors"
                >
                  <option value="">Responsável (todos)</option>
                  {filterOptions.responsibles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">expand_more</span>
              </div>

              <div className="ml-auto flex gap-3">
                <button
                  onClick={clearFilters}
                  className="rounded-lg border border-gray-600 px-6 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white hover:border-gray-400"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="animate-fade-in">
            {renderView()}
          </div>

          {/* Global Footer */}
          <footer className="mt-12 py-6 text-center border-t border-white/5">
            <p className="text-sm text-gray-500">© 2025 QUALIPAPEL — SGQ System</p>
          </footer>
        </main>
      </div>
    </>
  );
}

export default App;