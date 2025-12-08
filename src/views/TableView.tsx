import React from 'react';
import { RNCRecord } from '../types';

interface TableViewProps {
  data: RNCRecord[];
}

export const TableView: React.FC<TableViewProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="text-center pt-2 pb-4">
        <h1 className="text-white tracking-tight text-3xl font-bold leading-tight">Lista de Registros</h1>
        <p className="text-gray-300 text-base font-normal leading-normal">Consulta Detalhada</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#19241c] text-white/70 text-sm font-medium">
                <th className="p-4 border-b border-white/10">Nº</th>
                <th className="p-4 border-b border-white/10">Data Abertura</th>
                <th className="p-4 border-b border-white/10">Setor</th>
                <th className="p-4 border-b border-white/10">Tipo</th>
                <th className="p-4 border-b border-white/10">Status</th>
                <th className="p-4 border-b border-white/10">Responsável</th>
                <th className="p-4 border-b border-white/10">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">{row.number}</td>
                  <td className="p-4 text-gray-300">
                    {row.openDate ? new Date(row.openDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-gray-300">{row.sector}</td>
                  <td className="p-4">
                     <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                        row.type?.toLowerCase().includes('interna') 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-blue-500/20 text-blue-400'
                     }`}>
                        {row.type}
                     </span>
                  </td>
                  <td className="p-4">
                      <span className={`flex items-center gap-2 ${
                          row.status?.toLowerCase().includes('fechada') ? 'text-primary' : 'text-yellow-400'
                      }`}>
                          <span className={`w-2 h-2 rounded-full ${
                              row.status?.toLowerCase().includes('fechada') ? 'bg-primary' : 'bg-yellow-400'
                          }`}></span>
                          {row.status}
                      </span>
                  </td>
                  <td className="p-4 text-gray-300">{row.responsible}</td>
                  <td className="p-4 text-gray-400 max-w-xs truncate">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};