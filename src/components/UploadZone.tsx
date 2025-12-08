import React, { useCallback } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import { RNCRecord } from '../types';

interface UploadZoneProps {
  onDataLoaded: (data: RNCRecord[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onDataLoaded }) => {
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      const allData: RNCRecord[] = [];
      
      for (const file of files) {
        try {
          const records = await parseExcelFile(file);
          allData.push(...records);
        } catch (err) {
          console.error(`Error parsing file ${file.name}`, err);
          alert(`Erro ao ler o arquivo ${file.name}. Verifique se é um Excel válido.`);
        }
      }

      if (allData.length > 0) {
        onDataLoaded(allData);
      }
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
        </div>

        <div className="mt-12 flex w-full flex-col items-center gap-6">
          
          {/* Upload Card */}
          <label className="w-full max-w-md cursor-pointer group">
            <div className="rounded-lg p-6 flex flex-col items-center gap-4 glass-panel hover:bg-white/5 transition-all duration-300 shadow-[0_0_15px_4px_rgba(0,230,77,0.3)] hover:shadow-[0_0_25px_8px_rgba(0,230,77,0.4)]">
              <span className="material-symbols-outlined text-4xl text-primary drop-shadow-[0_0_8px_rgba(0,230,77,0.7)] group-hover:scale-110 transition-transform">cloud_upload</span>
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <p className="text-white text-lg font-bold leading-tight">Upload de Arquivos</p>
                <p className="text-[#A9A9A9] text-sm font-normal leading-normal">Envie planilhas de RNC (Excel) para processamento</p>
                <p className="text-[#A9A9A9] text-xs font-normal leading-normal text-white/50">O sistema extrairá automaticamente os indicadores</p>
              </div>
              <input 
                type="file" 
                multiple 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </label>

          {/* Placeholder for "Access Data" visual only since we are in upload state */}
          <div className="w-full max-w-md rounded-lg p-6 flex flex-col items-center gap-4 glass-panel shadow-[0_0_15px_4px_rgba(0,191,255,0.3)] opacity-70">
            <span className="material-symbols-outlined text-4xl text-[#00BFFF] drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]">bar_chart</span>
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <p className="text-white text-lg font-bold leading-tight">Acessar Dados Processados</p>
              <p className="text-[#A9A9A9] text-sm font-normal leading-normal">Abrir dashboards e visualizar indicadores</p>
              <p className="text-[#A9A9A9] text-xs font-normal leading-normal text-white/50">Painéis interativos com filtros globais</p>
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