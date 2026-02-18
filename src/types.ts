export enum RNCStatus {
  OPEN = 'Aberta',
  CLOSED = 'Fechada',
  LATE = 'Atrasada'
}

export enum RNCType {
  INTERNAL = 'Interna',
  SUPPLIER = 'Fornecedor',
  CUSTOMER = 'Cliente'
}

export interface RNCRecord {
  id: string;
  number: string;
  description: string;
  sector: string;
  type: RNCType | string;
  status: RNCStatus | string;
  openDate: Date | null;
  closeDate: Date | null;
  responsible: string;
  cause: string;
  action: string;
  supplier: string;
  deadline: Date | null;
  product: string;
  batch: string;
  days: number | null;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface KPIMetrics {
  total: number;
  open: number;
  closed: number;
  efficiency: number;
  avgCloseTime: number;
}