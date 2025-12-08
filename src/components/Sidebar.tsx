import React, { useState } from 'react';

interface SidebarProps {
  activeView: string;
  onChangeView: (view: string) => void;
  onLogout?: () => void;
  onSave?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView, onLogout, onSave }) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const menuItems = [
    { id: 'general', label: 'Visão Geral', icon: 'grid_view' },
    { id: 'internal', label: 'Processos Internos', icon: 'hub' },
    { id: 'suppliers', label: 'Fornecedores', icon: 'local_shipping' },
    { id: 'efficacy', label: 'Eficácia & Indicadores', icon: 'check_circle' },
    { id: 'monthly', label: 'Painel Mensal', icon: 'calendar_month' },
    { id: 'deviation', label: 'Desvios por Processo', icon: 'warning' },
  ];

  const handleSaveClick = () => {
    if (onSave) {
      onSave();
      setLastSaved(new Date());
    }
  };

  return (
    <aside className="fixed z-20 flex h-full w-64 flex-col bg-gradient-to-b from-[#0c0f0d] to-[#011409] p-4 border-r border-white/5">
      <div className="flex items-center gap-2 px-4 py-2 mb-6">
        <span className="material-symbols-outlined text-3xl text-primary [text-shadow:0_0_10px_theme(colors.primary)]">eco</span>
        <span className="text-xl font-bold text-white">QUALIPAPEL</span>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors text-left ${activeView === item.id
                ? 'bg-primary/10 text-primary font-semibold [text-shadow:0_0_5px_theme(colors.primary)] shadow-[inset_0_0_10px_rgba(0,212,106,0.1)]'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* AÇÕES - BLOCO DO SIDEBAR */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-white/40 text-xs font-semibold px-4 mb-3 tracking-wide">
          AÇÕES
        </p>

        {/* Botão Salvar Dados */}
        <button
          onClick={handleSaveClick}
          disabled={!!lastSaved}
          title={lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString()}` : 'Salvar dados permanentemente'}
          className={`flex items-center gap-3 w-full px-4 py-2 rounded-lg font-semibold transition-all duration-300 
            ${lastSaved
              ? 'bg-primary/10 text-primary border border-primary/30 cursor-not-allowed shadow-none'
              : 'bg-primary text-black shadow-[0_0_15px_rgba(0,212,106,0.4)] hover:shadow-[0_0_25px_rgba(0,212,106,0.6)] hover:bg-[#00e676] active:scale-95'
            }`}
        >
          <span className="material-symbols-outlined text-lg">
            {lastSaved ? 'check_circle' : 'save'}
          </span>
          {lastSaved ? 'Dados Salvos' : 'Salvar Dados'}
        </button>

        {/* Botão Exportar PDF */}
        <button className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-white hover:bg-white/10 transition mt-2">
          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          Exportar PDF
        </button>

        {/* Botão Sair / Upload */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-white hover:bg-white/10 transition mt-2"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Sair / Upload
        </button>
      </div>

      {/* RODAPÉ DO SIDEBAR – PERFIL DO USUÁRIO */}
      <div className="mt-auto border-t border-white/10 px-4 py-4 flex items-center gap-3">
        {/* Avatar com iniciais */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
          DS
        </div>

        {/* Nome e função */}
        <div className="flex flex-col">
          <p className="text-white text-sm font-semibold leading-tight">
            Douglas S.
          </p>
          <p className="text-white/50 text-xs leading-tight">
            SGQ Qualipapel
          </p>
        </div>
      </div>
    </aside>
  );
};