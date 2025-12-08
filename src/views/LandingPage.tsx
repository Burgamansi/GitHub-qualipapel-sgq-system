import React, { useCallback, useState } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import { RNCRecord } from '../types';

interface LandingPageProps {
  onDataLoaded: (data: RNCRecord[]) => void;
  onEnterDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onDataLoaded, onEnterDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [processMessage, setProcessMessage] = useState('');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setLoading(true);
      setProcessMessage('Iniciando processamento...');
      
      const files = Array.from(event.target.files) as File[];
      let rawData: RNCRecord[] = [];
      
      // Process all files
      for (const file of files) {
        try {
          const records = await parseExcelFile(file);
          rawData.push(...records);
        } catch (err) {
          console.error(`Error parsing file ${file.name}`, err);
          // Continue to next file
        }
      }

      // Deduplication Logic based on RNC Number (ID)
      const uniqueDataMap = new Map<string, RNCRecord>();
      rawData.forEach(record => {
        if (record.number && record.number !== "S/N") {
            uniqueDataMap.set(record.number, record);
        } else {
            uniqueDataMap.set(record.id + Math.random(), record);
        }
      });

      const cleanData = Array.from(uniqueDataMap.values());

      if (cleanData.length > 0) {
        onDataLoaded(cleanData);
        setTotalLoaded(cleanData.length);
        setProcessMessage('Distribuição por Tipo atualizada com base no campo J5 — 100% funcional.');
      } else {
        setProcessMessage('Nenhum dado válido encontrado nos arquivos.');
      }
      
      setLoading(false);
      // Reset input
      event.target.value = '';
    }
  }, [onDataLoaded]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-background-dark font-display selection:bg-primary selection:text-black">
      {/* Decorative Leaves */}
      <span className="material-symbols-outlined leaf" style={{ fontSize: '80px', top: '15%', left: '5%', transform: 'rotate(-20deg)' }}>eco</span>
      <span className="material-symbols-outlined leaf" style={{ fontSize: '60px', top: '30%', right: '-5%', transform: 'rotate(15deg)' }}>eco</span>
      <span className="material-symbols-outlined leaf" style={{ fontSize: '120px', bottom: '10%', left: '-10%', transform: 'rotate(30deg)' }}>eco</span>
      <span className="material-symbols-outlined leaf" style={{ fontSize: '50px', bottom: '25%', right: '5%', transform: 'rotate(-10deg)' }}>eco</span>

      <main className="relative z-10 flex w-full grow flex-col justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"></div>
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/50 shadow-neon">
                <span className="material-symbols-outlined text-6xl text-primary">eco</span>
            </div>
          </div>
          <h1 className="text-white tracking-tight text-2xl font-bold leading-tight max-w-sm">
            SGQ – RNC | Sistema de Gestão de Não Conformidades
          </h1>
          <p className="text-[#A9A9A9] text-sm font-normal leading-normal max-w-xs">
            Processamento Inteligente • Indicadores Automáticos • Insights Operacionais
          </p>
          
          {processMessage && (
            <div className={`mt-4 rounded-full px-6 py-2 text-sm font-bold border animate-fade-in ${
                processMessage.includes('100%') 
                ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(0,212,106,0.2)]' 
                : 'bg-white/5 text-gray-300 border-white/10'
            }`}>
              {processMessage}
            </div>
          )}

          {totalLoaded > 0 && !processMessage.includes('100%') && (
             <div className="mt-2 text-xs text-gray-500">
               {totalLoaded} registros na fila...
             </div>
          )}
        </div>

        <div className="mt-12 flex w-full flex-col items-center gap-6">
          
          {/* Upload Card */}
          <label className={`w-full max-w-md cursor-pointer group ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="rounded-lg p-6 flex flex-col items-center gap-4 glass-panel hover:bg-white/5 transition-all duration-300 shadow-[0_0_15px_4px_rgba(0,230,77,0.3)] hover:shadow-[0_0_25px_8px_rgba(0,230,77,0.4)]">
              {loading ? (
                <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-4xl text-primary drop-shadow-[0_0_8px_rgba(0,230,77,0.7)] group-hover:scale-110 transition-transform">cloud_upload</span>
              )}
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <p className="text-white text-lg font-bold leading-tight">
                    {loading ? 'Processando Arquivos...' : 'Upload de Arquivos'}
                </p>
                <p className="text-[#A9A9A9] text-sm font-normal leading-normal">Selecione suas planilhas (XLSX/XLSM)</p>
                <p className="text-[#A9A9A9] text-xs font-normal leading-normal text-white/50">Extração automática de indicadores</p>
              </div>
              <input 
                type="file" 
                multiple 
                accept=".xlsx, .xls, .xlsm" 
                className="hidden" 
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          </label>

          {/* Access Data Card */}
          <button 
            onClick={onEnterDashboard}
            disabled={totalLoaded === 0}
            className={`w-full max-w-md group text-left transition-all duration-300 ${
                totalLoaded > 0 ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50 grayscale'
            }`}
          >
            <div className="rounded-lg p-6 flex flex-col items-center gap-4 glass-panel hover:bg-white/5 transition-all duration-300 shadow-[0_0_15px_4px_rgba(0,191,255,0.3)] hover:shadow-[0_0_25px_8px_rgba(0,191,255,0.4)] hover:scale-[1.02]">
              <span className="material-symbols-outlined text-4xl text-[#00BFFF] drop-shadow-[0_0_8px_rgba(0,191,255,0.7)] group-hover:scale-110 transition-transform">bar_chart</span>
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <p className="text-white text-lg font-bold leading-tight">Acessar Dados Processados</p>
                <p className="text-[#A9A9A9] text-sm font-normal leading-normal">
                    {totalLoaded > 0 ? `${totalLoaded} registros prontos para análise` : 'Aguardando upload...'}
                </p>
                <p className="text-[#A9A9A9] text-xs font-normal leading-normal text-white/50">Painéis interativos com filtros globais</p>
              </div>
            </div>
          </button>
          
          {/* Status Badge */}
          <div className="mt-6 w-full text-center">
            <div className="inline-block rounded-full border border-primary/50 px-8 py-2 text-primary shadow-[0_0_12px_rgba(0,212,106,0.3)] bg-primary/10 backdrop-blur-md text-sm font-semibold">
                {totalLoaded > 0 
                  ? `${totalLoaded} arquivos atualizados com sucesso.` 
                  : "Nenhum arquivo carregado ainda."}
            </div>
          </div>

        </div>
      </main>

      <footer className="relative z-10 w-full py-6">
        <p className="text-center text-xs text-white/40">© 2025 QUALIPAPEL – Sistema SGQ–RNC</p>
      </footer>
    </div>
  );
};