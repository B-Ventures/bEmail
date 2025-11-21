
export interface ParsedEmailData {
  subject: string;
  headerBrand: string;
  headerCourseName: string;
  headerTitle: string;
  headerSubtitle: string;
  greeting: string;
  introduction: string;
  mainContent: string;
  actionStep: {
    heading: string;
    text: string;
    buttonText?: string;
    buttonLink?: string;
  };
  closing: string;
  ps?: string;
}

export interface Email {
  day: number;
  subject: string;
  htmlBody: string;
  parsedData: ParsedEmailData;
}

// An "Asset" is the raw output from the AI Generator
export interface Asset {
  id: string;
  title: string; // The course name
  createdAt: string;
  emails: {
    day: number;
    subject: string;
    htmlBody: string;
    parsedData: ParsedEmailData;
  }[];
}

// CRM FEATURES

export interface Subscriber {
  id: string;
  email: string;
  firstName: string;
  joinedAt: string;
  status: 'active' | 'unsubscribed';
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  subscribers: Subscriber[];
}

export type StepType = 'text' | 'html' | 'asset_ref';

export interface SequenceStep {
  id: string;
  orderIndex: number;
  delayHours: number; // 0 for immediate
  subject: string;
  contentType: StepType;
  content: string; // Text content, HTML string, or Asset ID + Day Index
  assetRef?: {
    assetId: string;
    dayIndex: number;
  }
}

export interface Sequence {
  id: string;
  name: string;
  createdAt: string;
  steps: SequenceStep[];
}

export interface Campaign {
  id: string;
  name: string;
  audienceId: string;
  sequenceId: string;
  runType: 'broadcast' | 'evergreen'; 
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'draft';
  scheduledFor?: string; 
  createdAt?: string; 
  startedAt?: string;
  emails: {
    day: number;
    subject: string;
  }[];
  stats: {
    sent: number;
    opened: number;
    clicks: number;
  };
  progress: {
    totalSubscribers: number;
    completedSubscribers: number;
    currentStepIndex: Record<string, number>; // Map subscriberID to step index
    lastActionAt: Record<string, string>; // ADDED: Map subscriberID to ISO string of last email sent time
  }
}

export interface SmtpConfig {
  method: 'simulation' | 'webhook'; 
  webhookUrl: string; 
  authHeader?: string; 
  host: string;
  port: string;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  isConfigured: boolean;
}

// Generator Task State
export interface EmailTask {
  id: number;
  day: number;
  title: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}
