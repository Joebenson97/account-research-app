export interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  foundedYear?: number;
  employeeCount?: number;
  revenue?: number;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  accountScore?: number;
  researchNotes?: string;
  aiSummary?: {
    companyOverview: string;
    likelyPriorities: string[];
    suggestedOutreachAngle: string;
    keyRisks: string[];
  };
  aiSummaryUpdatedAt?: Date;
  signals?: Array<{
    type: 'funding' | 'hiring' | 'leadership' | 'product' | 'other';
    title: string;
    detail: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
  }>;
  signalsUpdatedAt?: Date;
  status: 'active' | 'inactive' | 'prospect' | 'customer';
  value: 'low' | 'medium' | 'high';
}

export interface SearchFilters {
  query?: string;
  industry?: string;
  location?: string;
  status?: Account['status'];
  value?: Account['value'];
  tags?: string[];
}

export interface ResearchData {
  accounts: Account[];
  totalAccounts: number;
  lastUpdated: Date;
}
