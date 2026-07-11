// Core domain types shared between frontend and backend.

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;
export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;
export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

// The canonical GrowEasy CRM record shape. All fields are optional except
// the ones we can guarantee (email/mobile presence is validated separately).
export interface CrmRecord {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | null;
  crm_note: string | null;
  data_source: DataSource | null;
  possession_time: string | null;
  description: string | null;
}

export const CRM_FIELDS: (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

// A raw row as parsed straight from the uploaded CSV, before any AI mapping.
export type RawCsvRow = Record<string, string>;

export interface SkippedRecord {
  rowIndex: number;
  raw: RawCsvRow;
  reason: string;
}

export interface ExtractResponse {
  importId: string;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalReceived: number;
  batches: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface ExtractProgressEvent {
  type: "progress" | "done" | "error";
  batchIndex?: number;
  totalBatches?: number;
  message?: string;
  result?: ExtractResponse;
}
