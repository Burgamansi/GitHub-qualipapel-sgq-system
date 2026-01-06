const STORAGE_KEY = "QPL_SGQ_RNC_DATA_V1";

export function salvarDadosRNC(payload: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("Erro ao salvar:", e);
    return false;
  }
}

export function carregarDadosRNC() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Erro ao carregar:", e);
    return null;
  }
}

export function limparDadosRNC() {
  localStorage.removeItem(STORAGE_KEY);
}
