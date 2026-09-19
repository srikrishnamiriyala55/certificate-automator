export type HorizontalAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type DuplicateBehavior = 'skip' | 'overwrite' | 'duplicate';

export interface EventRecord {
  id: string; name: string; eventDate: string | null; description: string; templatePath: string | null;
  templateWidth: number | null; templateHeight: number | null; outputDirectory: string | null;
  createdAt: string; updatedAt: string;
}
export interface TemplateField {
  id: string; eventId: string; name: string; x: number; y: number; width: number; height: number;
  horizontalAlign: HorizontalAlignment; verticalAlign: VerticalAlignment; fontFamily: string;
  fontSize: number; minFontSize: number; fontWeight: 'normal' | 'bold'; color: string;
  autoFit: boolean; wrapping: boolean; locked: boolean; fixedValue: string | null;
}
export interface Participant {
  id: string; eventId: string; rowNumber: number; data: Record<string, string>; status: 'ready' | 'invalid'; errors: string[];
}
export interface FieldMapping { fieldId: string; sourceColumn: string | null; fixedValue: string | null; }
export interface DashboardStats { totalEvents: number; totalParticipants: number; generated: number; sent: number; failedEmails: number; recentEvents: Array<EventRecord & { participantCount: number; generatedCount: number; sentCount: number }>; }
export interface DryRunResult { ready: number; invalid: number; missingNames: number[]; missingEmails: number[]; invalidEmails: number[]; missingMappings: string[]; duplicateNames: string[]; }
export interface GenerationProgress { jobId: string; current: number; total: number; participantName: string; status: 'running' | 'cancelled' | 'completed' | 'failed'; }
export interface GenerationResult { jobId: string; generated: number; skipped: number; failed: number; files: string[]; errors: Array<{ participantId: string; message: string }>; }
export interface EmailSettings { host: string; port: number; security: 'ssl' | 'starttls' | 'tls'; username: string; fromName: string; fromEmail: string; subject: string; body: string; concurrency: number; hasPassword?: boolean; }
export interface HistoryJob { id: string; eventId: string; type: 'generation' | 'email'; status: string; total: number; succeeded: number; skipped: number; failed: number; createdAt: string; completedAt: string | null; }
export interface EventBundle { event: EventRecord; fields: TemplateField[]; participants: Participant[]; mappings: FieldMapping[]; }

export interface CertificateStudioApi {
  dashboard(): Promise<DashboardStats>;
  events: { list(): Promise<EventRecord[]>; get(id: string): Promise<EventBundle>; create(input: { name: string; eventDate?: string; description?: string }): Promise<EventRecord>; update(id: string, input: Partial<EventRecord>): Promise<EventRecord>; remove(id: string): Promise<void>; export(id: string): Promise<string | null>; import(): Promise<EventRecord | null>; };
  template: { choose(eventId: string): Promise<EventRecord | null>; data(eventId: string): Promise<string | null>; };
  fields: { save(eventId: string, fields: TemplateField[]): Promise<TemplateField[]>; export(eventId: string): Promise<string | null>; import(eventId: string): Promise<TemplateField[]>; };
  participants: { import(eventId: string): Promise<{ participants: Participant[]; columns: string[] } | null>; saveMappings(eventId: string, mappings: FieldMapping[]): Promise<void>; validate(eventId: string, requireEmail: boolean): Promise<DryRunResult>; };
  workspace: { choose(eventId: string): Promise<string | null>; open(eventId: string): Promise<void>; openFile(path: string): Promise<void>; };
  generation: { test(eventId: string, participantId: string): Promise<string>; start(eventId: string, behavior: DuplicateBehavior): Promise<GenerationResult>; cancel(jobId: string): Promise<void>; resume(jobId: string): Promise<GenerationResult>; onProgress(callback: (p: GenerationProgress) => void): () => void; };
  email: { get(eventId: string): Promise<EmailSettings>; save(eventId: string, settings: EmailSettings, password?: string): Promise<void>; test(eventId: string, recipient: string): Promise<void>; send(eventId: string): Promise<GenerationResult>; retry(eventId: string): Promise<GenerationResult>; };
  history(eventId?: string): Promise<HistoryJob[]>;
  settings: { get(): Promise<Record<string, string>>; save(values: Record<string, string>): Promise<void>; };
}
