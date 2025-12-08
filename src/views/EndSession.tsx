import React from 'react';

interface EndSessionProps {
    onSaveAndExit: () => void;
    onClearAndExit: () => void;
    onCancel: () => void;
}

export const EndSession: React.FC<EndSessionProps> = ({ onSaveAndExit, onClearAndExit, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl transform rounded-2xl border border-white/10 bg-[#0c0f0d] p-8 shadow-[0_0_50px_rgba(0,212,106,0.1)] transition-all">
                <h2 className="mb-2 text-center text-3xl font-bold text-white">Encerrar Sessão</h2>
                <p className="mb-8 text-center text-gray-400">Como você deseja finalizar seus trabalhos?</p>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Option 1: Save & Exit */}
                    <button
                        onClick={onSaveAndExit}
                        className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-8 transition-all hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_20px_rgba(0,212,106,0.2)]"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">save</span>
                        </div>
                        <div className="text-center">
                            <h3 className="mb-1 text-xl font-bold text-white group-hover:text-primary">Sair e Salvar</h3>
                            <p className="text-sm text-gray-400">
                                Seus dados serão mantidos.<br />
                                Ao retornar, tudo estará aqui.
                            </p>
                        </div>
                    </button>

                    {/* Option 2: Clear & Exit */}
                    <button
                        onClick={onClearAndExit}
                        className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-8 transition-all hover:bg-red-500/10 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">delete_forever</span>
                        </div>
                        <div className="text-center">
                            <h3 className="mb-1 text-xl font-bold text-white group-hover:text-red-500">Sair e Limpar</h3>
                            <p className="text-sm text-gray-400">
                                Todos os dados serão apagados.<br />
                                A próxima sessão iniciará vazia.
                            </p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-gray-500 transition-colors hover:text-white hover:bg-white/5"
                >
                    <span className="material-symbols-outlined">close</span>
                    Cancelar e Voltar
                </button>
            </div>
        </div>
    );
};
