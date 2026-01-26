import * as XLSX from 'xlsx';
import { RNCRecord, RNCStatus } from '../types';

const APPROVED_SECTORS = [
  "Impressão",
  "Corte e Solda",
  "Picote",
  "Logística",
  "Extrusão",
  "Recuperadora",
  "Almoxarifado",
  "Compras",
  "Controle de Qualidade",
  "Clicheria",
  "Sacoleiras"
];

const normalizeSector = (raw: string): string => {
  if (!raw || raw.trim() === "") return "Indefinido";

  // Remove accents and lowercase for comparison
  const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const cleanRaw = normalizeStr(raw);

  for (const sector of APPROVED_SECTORS) {
    const cleanSector = normalizeStr(sector);

    // Check for inclusion (e.g., "Setor Extrusão" -> "Extrusão")
    if (cleanRaw.includes(cleanSector) || cleanSector.includes(cleanRaw)) {
      return sector;
    }
  }

  return "Indefinido";
};

// Normalizes supplier name based on specific business rules
const normalizeSupplier = (raw: string, type: string): string => {
  // Only process supplier if type is "Fornecedor"
  if (!type.toLowerCase().includes('fornecedor')) return '';

  if (!raw || raw.trim() === '') return 'Não Identificado';

  const clean = raw.trim();
  const lower = clean.toLowerCase();

  const invalidTerms = [
    'não se aplica',
    'nao se aplica',
    'n/a',
    '-',
    'x',
    'xxx'
  ];

  if (invalidTerms.includes(lower)) {
    return 'Não Identificado';
  }

  return clean;
};

function normalizeDate(value: any): Date | null {
  if (!value) return null;

  // Se for um Date válido
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Se for número (serial date do Excel)
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  // Tenta converter texto
  if (typeof value === "string") {
    // Normaliza separadores para barra (-, . -> /)
    const cleanValue = value.trim().replace(/[-.]/g, "/");

    // Tenta formato DD/MM/YYYY
    const parts = cleanValue.split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);

      // Validação básica de dia/mês/ano
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d > 0 && d <= 31 && m > 0 && m <= 12) {
        return new Date(y, m - 1, d);
      }
    }

    // Fallback genérico para datas ISO ou outros formatos
    const d = new Date(cleanValue);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

// ===============================================
// 📝 FORM PARSER HELPERS
// ===============================================

// Encontra automaticamente a aba certa usando heurística de nomes ou última aba
function getFormulario(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const keywords = ["formulário", "formulario", "form", "rnc", "qualipapel"];

  // Try to find exact match or contains
  const sheetName = workbook.SheetNames.find(name =>
    keywords.some(k => name.toLowerCase().includes(k))
  );

  if (sheetName) {
    return workbook.Sheets[sheetName];
  }

  // Fallback: usar a última aba do arquivo (Comportamento original do Form Parser)
  const lastSheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
  return workbook.Sheets[lastSheetName];
}

// 🔍 LEITURA SEGURA DO CAMPO
function read(sheet: XLSX.WorkSheet, cell: string, fallback = ""): any {
  try {
    return sheet[cell] ? sheet[cell].v : fallback;
  } catch {
    return fallback;
  }
}

// Função robusta para encontrar data de fechamento no FORM
function findClosingDate(sheet: XLSX.WorkSheet): Date | null {
  // 0. CORREÇÃO DEFINITIVA (B78/B77) - Prioridade Máxima
  const bCandidates = ["B78", "B77"];
  for (const cell of bCandidates) {
    const rawVal = read(sheet, cell, null);
    if (rawVal && typeof rawVal === "string" && rawVal.toLowerCase().includes("data")) {
      const extracted = rawVal.replace(/Data:?/i, "").trim();
      const parsed = Date.parse(extracted);
      if (!isNaN(parsed)) return new Date(parsed);
    }
  }

  // 1. CORREÇÃO DATA DE FECHAMENTO QUALIPAPEL – PRIORIDADE CELULA I78
  const priorityCell = "I78";
  const valI78 = read(sheet, priorityCell, null);
  const dI78 = normalizeDate(valI78);
  if (dI78) return dI78;

  // 2. Outros candidatos
  const candidates = ["H65", "I77", "I79"];
  for (const cell of candidates) {
    const val = read(sheet, cell, null);
    const d = normalizeDate(val);
    if (d) return d;
  }

  return null;
}

function parseFormLayout(workbook: XLSX.WorkBook): RNCRecord[] {
  const formSheet = getFormulario(workbook);
  if (!formSheet) return [];

  const ishikawaSheet = workbook.Sheets["CAUSA&EFEITO"];

  // 2. Extract Fields (Label-Based Search with Fallbacks)

  // Helper: Read with Merge Support
  const getMergedValue = (cellAddress: string): string => {
    const cell = formSheet[cellAddress];
    if (cell && cell.v) return String(cell.v).trim();
    if (formSheet['!merges']) {
      const decode = XLSX.utils.decode_cell(cellAddress);
      for (const range of formSheet['!merges']) {
        if (decode.c >= range.s.c && decode.c <= range.e.c &&
          decode.r >= range.s.r && decode.r <= range.e.r) {
          const topLeftRef = XLSX.utils.encode_cell(range.s);
          return String(formSheet[topLeftRef]?.v || "").trim();
        }
      }
    }
    return "";
  };

  // Helper: Search Label & Get Right Value
  const getValueRightOfLabel = (labelText: string): string => {
    const range = XLSX.utils.decode_range(formSheet['!ref'] || "A1:Z100");
    const maxRow = Math.min(range.e.r, 50); // Search top 50 rows
    const maxCol = Math.min(range.e.c, 30); // Search first 30 cols

    // Normalize label for comparison (trim + collapse spaces + lowercase)
    const cleanLabel = labelText.trim().replace(/\s+/g, " ").toLowerCase();

    for (let R = range.s.r; R <= maxRow; ++R) {
      for (let C = range.s.c; C <= maxCol; ++C) {
        const addr = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = formSheet[addr];
        if (cell && cell.v) {
          const cellVal = String(cell.v).trim().replace(/\s+/g, " ").toLowerCase();
          // Check exact match (normalized)
          if (cellVal === cleanLabel) {
            // Found! Return Right Neighbor (C+1)
            const rightAddr = XLSX.utils.encode_cell({ c: C + 1, r: R });
            return getMergedValue(rightAddr);
          }
        }
      }
    }
    return "";
  };

  // RNC Number Extraction
  // 1. Label Search
  let rncNumber = getValueRightOfLabel("N° de Registro RNC -");
  // 2. Fallbacks
  if (!rncNumber) rncNumber = getMergedValue("H5");
  if (!rncNumber) rncNumber = getMergedValue("G4");
  if (!rncNumber) rncNumber = "S/N";

  // Responsible Extraction
  // 1. Label Search
  let responsible = getValueRightOfLabel("Responsável-N/C:");
  // 2. Fallbacks
  if (!responsible) responsible = getMergedValue("H9");
  if (!responsible) responsible = getMergedValue("G8");

  // Normalize Responsible
  responsible = responsible.trim();
  if (!responsible) responsible = "Não atribuído";

  if (process.env.NODE_ENV === 'development') {
    console.log(`FORM PARSER -> RNC: ${rncNumber}, Responsible: "${responsible}"`);
  }

  const rawType = String(read(formSheet, "J5", "Não informado")).trim();
  const rawSector = String(read(formSheet, "H8", "")).trim();
  const rawSupplier = String(read(formSheet, "D9", "")).trim();

  const openDate = normalizeDate(read(formSheet, "H7", null));
  const closeDate = findClosingDate(formSheet);
  const status = closeDate !== null ? RNCStatus.CLOSED : RNCStatus.OPEN;
  const d17Val = String(read(formSheet, "D17", "")).trim();
  const description = String(read(formSheet, "D15", "")).trim() || "Sem descrição";

  // 3. Normalization Logic
  let normalizedType = "Interna";
  const lowerType = rawType.toLowerCase();
  if (lowerType.includes("reclamação")) normalizedType = "Cliente - Reclamação";
  else if (lowerType.includes("devolução")) normalizedType = "Cliente - Devolução";
  else if (lowerType.includes("fornecedor")) normalizedType = "Fornecedor";
  else if (lowerType.includes("interna") || lowerType.includes("não conformidade")) normalizedType = "Interna";

  const normalizedSector = normalizeSector(rawSector);
  const normalizedSupplier = normalizeSupplier(rawSupplier, normalizedType);

  let cause = String(read(formSheet, "C26", "")).trim();
  if ((!cause || cause === "") && ishikawaSheet) {
    cause = String(read(ishikawaSheet, "B25", "")).trim();
  }
  if (!cause) cause = "Não especificado";

  let days: number | null = null;
  if (status === RNCStatus.CLOSED && openDate && closeDate) {
    const diff = closeDate.getTime() - openDate.getTime();
    days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const record: RNCRecord = {
    id: rncNumber,
    number: rncNumber,
    description: description,
    sector: normalizedSector,
    type: normalizedType,
    status: status,
    openDate: openDate,
    closeDate: closeDate,
    responsible: responsible,
    cause: cause,
    action: d17Val,
    supplier: normalizedSupplier,
    deadline: null,
    product: String(read(formSheet, "C11", "")).trim(),
    batch: String(read(formSheet, "C13", "")).trim(),
    days: days
  };

  if (rncNumber === "S/N" && description === "Sem descrição" && !openDate) {
    return [];
  }

  return [record];
}

// ===============================================
// 📊 TABLE PARSER HELPERS
// ===============================================

function parseTableLayout(workbook: XLSX.WorkBook): RNCRecord[] {
  // Usually the first sheet contains the data table
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const records: RNCRecord[] = [];

  for (const row of jsonData) {
    // Basic Validation: Must have at least a Number or Description
    const rncNumber = String(row["Número"] || row["Numero"] || row["RNC"] || "S/N").trim();
    const description = String(row["Descrição"] || row["Descricao"] || row["Defeito"] || "").trim();

    if (rncNumber === "S/N" && description === "") continue;

    // Date Parsing
    const openDate = normalizeDate(row["Data"] || row["Data Abertura"] || row["Abertura"]);
    const closeDate = normalizeDate(row["Data Fechamento"] || row["Fechamento"] || row["Encerramento"]);
    const status = closeDate ? RNCStatus.CLOSED : (String(row["Status"] || "").toLowerCase().includes("fech") ? RNCStatus.CLOSED : RNCStatus.OPEN);

    // Fields
    const rawSector = String(row["Setor"] || row["Área"] || "").trim();
    const rawType = String(row["Tipo"] || row["Classificação"] || "").trim();
    const rawSupplier = String(row["Fornecedor"] || "").trim();

    let normalizedType = "Interna";
    const lowerType = rawType.toLowerCase();
    if (lowerType.includes("reclamação")) normalizedType = "Cliente - Reclamação";
    else if (lowerType.includes("devolução")) normalizedType = "Cliente - Devolução";
    else if (lowerType.includes("fornecedor")) normalizedType = "Fornecedor";

    const normalizedSector = normalizeSector(rawSector);
    const normalizedSupplier = normalizeSupplier(rawSupplier, normalizedType);

    // Days Calc
    let days: number | null = null;
    if (status === RNCStatus.CLOSED && openDate && closeDate) {
      const diff = closeDate.getTime() - openDate.getTime();
      days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    records.push({
      id: rncNumber,
      number: rncNumber,
      description: description,
      sector: normalizedSector,
      type: normalizedType,
      status: status,
      openDate: openDate,
      closeDate: closeDate,
      responsible: String(row["Responsável"] || row["Responsavel"] || "Não atribuído").trim(),
      cause: String(row["Causa"] || row["Causa Raiz"] || "Não especificado").trim(),
      action: String(row["Ação"] || row["Acao"] || row["Disposição"] || "").trim(),
      supplier: normalizedSupplier,
      deadline: normalizeDate(row["Prazo"] || null),
      product: String(row["Produto"] || "").trim(),
      batch: String(row["Lote"] || "").trim(),
      days: days
    });
  }

  return records;
}

// ===============================================
// 🚀 MAIN ENTRY POINT
// ===============================================

export const parseExcelFile = async (file: File): Promise<RNCRecord[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // 🕵️ DETECT FORMAT STRATEGY

        // 1. Check for specific Form sheet name
        const keywords = ["formulário", "formulario", "folha de rnc"];
        const hasFormSheet = workbook.SheetNames.some(name =>
          keywords.some(k => name.toLowerCase().includes(k))
        );

        if (hasFormSheet) {
          // High confidence it's a Form
          resolve(parseFormLayout(workbook));
          return;
        }

        // 2. Check header of first sheet to see if it looks like a Table
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstRowSnippet = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 0, defval: "" })[0] as string[];

        if (firstRowSnippet && Array.isArray(firstRowSnippet)) {
          const headerStr = firstRowSnippet.join(" ").toLowerCase();
          const tableKeywords = ["número", "numero", "descrição", "setor", "status", "data"];
          const matchCount = tableKeywords.filter(k => headerStr.includes(k)).length;

          if (matchCount >= 2) {
            // It looks like a table!
            resolve(parseTableLayout(workbook));
            return;
          }
        }

        // 3. Fallback: Try Form Layout (Original default behavior)
        resolve(parseFormLayout(workbook));

      } catch (error) {
        console.error("Error parsing excel", error);
        resolve([]);
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error", error);
      resolve([]);
    };
    reader.readAsArrayBuffer(file);
  });
};