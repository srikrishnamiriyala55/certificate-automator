import * as XLSX from 'xlsx';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Participant } from '../shared/types.js';

// The maintained SheetJS ESM build intentionally requires an explicit Node
// filesystem adapter instead of auto-detecting one at import time.
XLSX.set_fs(fs);

export function normalizeCell(value: unknown): string { if(value===null||value===undefined)return ''; if(value instanceof Date)return value.toISOString().slice(0,10); return String(value).trim(); }
export function parseParticipantFile(path:string,eventId:string){const book=XLSX.readFile(path,{cellDates:true});const sheet=book.Sheets[book.SheetNames[0]];if(!sheet)throw new Error('The spreadsheet does not contain a worksheet.');const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:'',raw:false});const columns:string[]=[];for(const row of rows)for(const key of Object.keys(row))if(!columns.includes(key.trim()))columns.push(key.trim());const participants:Participant[]=rows.filter(row=>Object.values(row).some(v=>normalizeCell(v)!=='')).map((row,index)=>{const data=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim(),normalizeCell(v)]));return{id:randomUUID(),eventId,rowNumber:index+2,data,status:'ready',errors:[]};});return{columns,participants};}
export function autoMap(fieldName:string,columns:string[]){const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');const target=norm(fieldName);return columns.find(c=>norm(c)===target)||columns.find(c=>norm(c).includes(target)||target.includes(norm(c)))||null;}
