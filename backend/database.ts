import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EventRecord, FieldMapping, HistoryJob, Participant, TemplateField } from '../shared/types.js';

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const bool = (value: unknown) => Boolean(value);

export class AppDatabase {
  readonly db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }
  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT NOT NULL, event_date TEXT, description TEXT NOT NULL DEFAULT '', template_path TEXT, template_width INTEGER, template_height INTEGER, output_directory TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS template_fields (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, name TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, width REAL NOT NULL, height REAL NOT NULL, horizontal_align TEXT NOT NULL, vertical_align TEXT NOT NULL, font_family TEXT NOT NULL, font_size REAL NOT NULL, min_font_size REAL NOT NULL, font_weight TEXT NOT NULL, color TEXT NOT NULL, auto_fit INTEGER NOT NULL, wrapping INTEGER NOT NULL, locked INTEGER NOT NULL, fixed_value TEXT);
      CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, row_number INTEGER NOT NULL, data_json TEXT NOT NULL, status TEXT NOT NULL, errors_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS field_mappings (event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, field_id TEXT NOT NULL REFERENCES template_fields(id) ON DELETE CASCADE, source_column TEXT, fixed_value TEXT, PRIMARY KEY(event_id, field_id));
      CREATE TABLE IF NOT EXISTS generation_jobs (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, type TEXT NOT NULL, status TEXT NOT NULL, total INTEGER NOT NULL, succeeded INTEGER NOT NULL DEFAULT 0, skipped INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, options_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, completed_at TEXT);
      CREATE TABLE IF NOT EXISTS generation_items (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE, participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE, status TEXT NOT NULL, file_path TEXT, error TEXT, email_status TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS email_settings (event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE, host TEXT NOT NULL DEFAULT '', port INTEGER NOT NULL DEFAULT 587, security TEXT NOT NULL DEFAULT 'starttls', username TEXT NOT NULL DEFAULT '', from_name TEXT NOT NULL DEFAULT '', from_email TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL DEFAULT 'Certificate – {{event_name}}', body TEXT NOT NULL DEFAULT 'Dear {{name}},\n\nPlease find your certificate attached.\n', concurrency INTEGER NOT NULL DEFAULT 3, encrypted_password TEXT);
      CREATE TABLE IF NOT EXISTS application_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_event ON generation_jobs(event_id);
    `);
  }
  close() { this.db.close(); }
  toEvent(row: Row): EventRecord { return { id: String(row.id), name: String(row.name), eventDate: row.event_date as string | null, description: String(row.description), templatePath: row.template_path as string | null, templateWidth: row.template_width as number | null, templateHeight: row.template_height as number | null, outputDirectory: row.output_directory as string | null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
  listEvents() { return (this.db.prepare('SELECT * FROM events ORDER BY updated_at DESC').all() as Row[]).map(r => this.toEvent(r)); }
  getEvent(id: string) { const row = this.db.prepare('SELECT * FROM events WHERE id=?').get(id) as Row | undefined; return row ? this.toEvent(row) : null; }
  createEvent(event: EventRecord) { this.db.prepare('INSERT INTO events VALUES (@id,@name,@eventDate,@description,@templatePath,@templateWidth,@templateHeight,@outputDirectory,@createdAt,@updatedAt)').run(event); return event; }
  updateEvent(id: string, values: Partial<EventRecord>) { const old = this.getEvent(id); if (!old) throw new Error('Event not found'); const next = { ...old, ...values, id, updatedAt: now() }; this.db.prepare('UPDATE events SET name=@name,event_date=@eventDate,description=@description,template_path=@templatePath,template_width=@templateWidth,template_height=@templateHeight,output_directory=@outputDirectory,updated_at=@updatedAt WHERE id=@id').run(next); return next; }
  deleteEvent(id: string) { this.db.prepare('DELETE FROM events WHERE id=?').run(id); }
  listFields(eventId: string): TemplateField[] { return (this.db.prepare('SELECT * FROM template_fields WHERE event_id=?').all(eventId) as Row[]).map(r => ({ id:String(r.id), eventId:String(r.event_id), name:String(r.name), x:Number(r.x), y:Number(r.y), width:Number(r.width), height:Number(r.height), horizontalAlign:r.horizontal_align as TemplateField['horizontalAlign'], verticalAlign:r.vertical_align as TemplateField['verticalAlign'], fontFamily:String(r.font_family), fontSize:Number(r.font_size), minFontSize:Number(r.min_font_size), fontWeight:r.font_weight as 'normal'|'bold', color:String(r.color), autoFit:bool(r.auto_fit), wrapping:bool(r.wrapping), locked:bool(r.locked), fixedValue:r.fixed_value as string|null })); }
  saveFields(eventId: string, fields: TemplateField[]) { const tx=this.db.transaction(()=>{ this.db.prepare('DELETE FROM template_fields WHERE event_id=?').run(eventId); const q=this.db.prepare(`INSERT INTO template_fields VALUES (@id,@eventId,@name,@x,@y,@width,@height,@horizontalAlign,@verticalAlign,@fontFamily,@fontSize,@minFontSize,@fontWeight,@color,@autoFit,@wrapping,@locked,@fixedValue)`); for(const f of fields) q.run({...f,eventId,autoFit:+f.autoFit,wrapping:+f.wrapping,locked:+f.locked}); }); tx(); return this.listFields(eventId); }
  listParticipants(eventId: string): Participant[] { return (this.db.prepare('SELECT * FROM participants WHERE event_id=? ORDER BY row_number').all(eventId) as Row[]).map(r=>({id:String(r.id),eventId:String(r.event_id),rowNumber:Number(r.row_number),data:JSON.parse(String(r.data_json)) as Record<string,string>,status:r.status as Participant['status'],errors:JSON.parse(String(r.errors_json)) as string[]})); }
  replaceParticipants(eventId:string, participants:Participant[]) { const tx=this.db.transaction(()=>{this.db.prepare('DELETE FROM participants WHERE event_id=?').run(eventId);const q=this.db.prepare('INSERT INTO participants VALUES (@id,@eventId,@rowNumber,@data,@status,@errors)');for(const p of participants)q.run({id:p.id,eventId,rowNumber:p.rowNumber,data:JSON.stringify(p.data),status:p.status,errors:JSON.stringify(p.errors)});});tx(); }
  listMappings(eventId:string):FieldMapping[]{return (this.db.prepare('SELECT * FROM field_mappings WHERE event_id=?').all(eventId) as Row[]).map(r=>({fieldId:String(r.field_id),sourceColumn:r.source_column as string|null,fixedValue:r.fixed_value as string|null}));}
  saveMappings(eventId:string,mappings:FieldMapping[]){const tx=this.db.transaction(()=>{this.db.prepare('DELETE FROM field_mappings WHERE event_id=?').run(eventId);const q=this.db.prepare('INSERT INTO field_mappings VALUES (?,?,?,?)');for(const m of mappings)q.run(eventId,m.fieldId,m.sourceColumn,m.fixedValue);});tx();}
  listHistory(eventId?:string):HistoryJob[]{const sql=eventId?'SELECT * FROM generation_jobs WHERE event_id=? ORDER BY created_at DESC':'SELECT * FROM generation_jobs ORDER BY created_at DESC';return ((eventId?this.db.prepare(sql).all(eventId):this.db.prepare(sql).all()) as Row[]).map(r=>({id:String(r.id),eventId:String(r.event_id),type:r.type as HistoryJob['type'],status:String(r.status),total:Number(r.total),succeeded:Number(r.succeeded),skipped:Number(r.skipped),failed:Number(r.failed),createdAt:String(r.created_at),completedAt:r.completed_at as string|null}));}
}
