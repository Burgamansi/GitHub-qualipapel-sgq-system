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

// ===============================================
// 🔥 PARSER UNIVERSAL – GARANTE LEITURA DE TODAS AS RNCs
// ===============================================

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

// Encontra automaticamente a aba certa usando heurística de nomes ou última aba
function getFormulario(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const keywords = ["rnc", "qualipapel", "plan", "form", "folha"];
  
  const sheetName = workbook.SheetNames.find(name =>
    keywords.some(k => name.toLowerCase().includes(k))
  );

  if (sheetName) {
    return workbook.Sheets[sheetName];
  }
  
  // Fallback: usar a última aba do arquivo
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

// Função robusta para encontrar data de fechamento
function findClosingDate(sheet: XLSX.WorkSheet): Date | null {
  
  // 0. CORREÇÃO DEFINITIVA (B78/B77) - Prioridade Máxima
  // Formato esperado: "Data:  2025-10-18 00:00:00"
  const bCandidates = ["B78", "B77"];
  for (const cell of bCandidates) {
      const rawVal = read(sheet, cell, null);
      if (rawVal && typeof rawVal === "string" && rawVal.toLowerCase().includes("data")) {
          // Remove "Data:" ou "Data" e espaços
          const extracted = rawVal.replace(/Data:?/i, "").trim();
          // Tenta fazer o parse da string de data (ex: ISO ou YYYY-MM-DD)
          const parsed = Date.parse(extracted);
          if (!isNaN(parsed)) {
              return new Date(parsed);
          }
      }
  }

  // 1. CORREÇÃO DATA DE FECHAMENTO QUALIPAPEL – PRIORIDADE CELULA I78
  const priorityCell = "I78";
  const valI78 = read(sheet, priorityCell, null);
  const dI78 = normalizeDate(valI78);
  if (dI78) return dI78;

  // 2. Candidatos secundários se I78 falhar
  const candidates = ["H65", "I77", "I79"];
  for (const cell of candidates) {
    const val = read(sheet, cell, null);
    const d = normalizeDate(val);
    if (d) return d;
  }

  // 3. Busca por rótulo "Data de Fechamento" ou similar
  for (const key in sheet) {
    if (key.startsWith('!')) continue;
    
    // Verifica se o valor da célula contém "fechamento"
    const val = sheet[key]?.v;
    if (typeof val === 'string' && val.toLowerCase().includes("fechamento")) {
      // Tenta pegar a data na coluna I da mesma linha
      // Ex: se "Data Fechamento" está em H78, tenta I78
      const targetKey = key.replace(/^[A-Z]+/, "I");
      
      if (targetKey !== key) {
         const targetVal = read(sheet, targetKey, null);
         const d = normalizeDate(targetVal);
         if (d) return d;
      }
    }
  }

  return null;
}

export const parseExcelFile = async (file: File): Promise<RNCRecord[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Support XLSM and XLSX
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // 1. Find Sheet
        const formSheet = getFormulario(workbook);
        if (!formSheet) {
            resolve([]); 
            return;
        }

        const ishikawaSheet = workbook.Sheets["CAUSA&EFEITO"];

        // 2. Extract Fields (Strict Mapping)
        
        // Tipo da RNC (J5)
        const rawType = String(read(formSheet, "J5", "Não informado")).trim();
        
        // Setor (H8)
        const rawSector = String(read(formSheet, "H8", "")).trim();
        
        // Fornecedor (D9)
        const rawSupplier = String(read(formSheet, "D9", "")).trim();
        
        // Número da RNC (H5)
        const rncNumber = String(read(formSheet, "H5", "")).trim() || "S/N";
        
        // Data de Abertura (H7)
        const openDate = normalizeDate(read(formSheet, "H7", null));

        // Data de Fechamento: Busca inteligente com prioridade B78/B77 > I78
        const closeDate = findClosingDate(formSheet);

        // Status: Se existe data de fechamento válida -> Fechada, senão -> Aberta
        const status = closeDate !== null ? RNCStatus.CLOSED : RNCStatus.OPEN;

        // Outros campos
        const d17Val = String(read(formSheet, "D17", "")).trim();
        const description = String(read(formSheet, "D15", "")).trim() || "Sem descrição";

        // 3. Normalization Logic
        
        // Type Normalization (J5)
        let normalizedType = "Interna";
        const lowerType = rawType.toLowerCase();
        if (lowerType.includes("reclamação")) {
            normalizedType = "Cliente - Reclamação";
        } else if (lowerType.includes("devolução")) {
            normalizedType = "Cliente - Devolução";
        } else if (lowerType.includes("fornecedor")) {
            normalizedType = "Fornecedor";
        } else if (lowerType.includes("interna") || lowerType.includes("não conformidade")) {
            normalizedType = "Interna";
        }

        // Sector Normalization (H8)
        const normalizedSector = normalizeSector(rawSector);

        // Supplier Normalization (D9)
        const normalizedSupplier = normalizeSupplier(rawSupplier, normalizedType);

        // Root Cause extraction
        let cause = String(read(formSheet, "C26", "")).trim();
        if ((!cause || cause === "") && ishikawaSheet) {
             cause = String(read(ishikawaSheet, "B25", "")).trim();
        }
        if (!cause) cause = "Não especificado";

        // Calculate days if closed
        let days: number | null = null;
        if (status === RNCStatus.CLOSED && openDate && closeDate) {
            const diff = closeDate.getTime() - openDate.getTime();
            days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        // 4. Construct Record
        const record: RNCRecord = {
          id: rncNumber, 
          number: rncNumber,
          description: description,
          sector: normalizedSector, 
          type: normalizedType, 
          status: status,
          openDate: openDate,
          closeDate: closeDate,
          responsible: String(read(formSheet, "I10", "")).trim() || "Não atribuído",
          cause: cause,
          action: d17Val, 
          supplier: normalizedSupplier,
          deadline: null, 
          product: String(read(formSheet, "C11", "")).trim(),
          batch: String(read(formSheet, "C13", "")).trim(),
          days: days
        };

        // Validation: If mostly empty, skip
        if (rncNumber === "S/N" && description === "Sem descrição" && !openDate) {
             resolve([]);
             return;
        }

        resolve([record]);

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