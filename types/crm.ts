
export type PipelineStage = 'New Lead' | 'Contacted' | 'Viewing Scheduled' | 'Negotiation' | 'Contract Sent' | 'Closed' | 'Lost';

export interface ClientActivity {
  id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'system' | 'viewing';
  content: string;
  timestamp: string;
  author: string; // 'System' or Agent Name
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: PipelineStage;
  source: 'Website' | 'WhatsApp' | 'Referral' | 'Walk-in' | 'Import';
  lastContact: string;
  assignedAgent: string;
  tags: string[];
  budget?: number; // Budget preference
  preferences?: string; // e.g. "3 Bed Villa, Kyrenia"
  notes?: string; // Quick notes
  activityHistory?: ClientActivity[];
  totalSpend?: number; // Calculated from closed deals
  avatar?: string;
  createdAt?: string;
}

export interface Campaign {
  id: string;
  title: string;
  type: 'Email' | 'SMS' | 'WhatsApp';
  status: 'Draft' | 'Scheduled' | 'Sent';
  audienceSize: number;
  sentDate?: string;
  stats?: {
    openRate: number;
    clickRate: number;
  };
}
