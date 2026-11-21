// Row shapes of the tables the frontend reads (see supabase/migrations).
// The Supabase client itself is untyped; pages use these interfaces for the data they hold.

import type { TestDetails } from '../utils/testAnalytics';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface RegistryRow {
  id: number;
  name: string;
  title: string;
  cert: string;
  date: string;
}

export interface TestScoreRow {
  id: string;
  user_id: string;
  mode: string;
  score: number;
  total: number;
  passed: boolean;
  details: TestDetails | null;
  created_at: string;
}

export interface UploadedDocument {
  id?: string;
  name: string;
  size: string;
  type?: string;
  dataUrl?: string;
}

export interface SignatureDetails {
  type?: string;
  standard?: string;
  signerName?: string;
  signerDrfo?: string;
  issuer?: string;
  serialNumber?: string;
  timestamp?: string;
  signature?: string;
  certificate?: string;
  signedData?: string;
  status?: string;
  ocspStatus?: string;
  uploaded_documents?: {
    passport?: UploadedDocument[];
    education?: UploadedDocument[];
    experience?: UploadedDocument[];
    other?: UploadedDocument[];
  };
}

export interface ApplicationRow {
  id: string;
  app_number: string;
  lname: string;
  fname: string;
  mname: string | null;
  birthdate: string;
  passport: string | null;
  phone: string;
  email: string;
  level: string;
  education: string;
  experience: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  email_verified: boolean;
  // Loaded only for a single application (it carries the uploaded scans); may be a JSON string in old rows.
  signature_details?: SignatureDetails | string | null;
}
