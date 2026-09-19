import type { DryRunResult, EventRecord, FieldMapping, Participant, TemplateField } from '../shared/types.js';
import { isEmail, sanitizeFilename } from './utils.js';

export function validateEvent(event:EventRecord,fields:TemplateField[],participants:Participant[],mappings:FieldMapping[],requireEmail=false):DryRunResult{
  if(!event.templatePath)throw new Error('Upload a certificate template.');if(!event.outputDirectory)throw new Error('Select an output directory.');if(!fields.length)throw new Error('Configure at least one certificate field.');
  const missingMappings=fields.filter(f=>!f.fixedValue&&!mappings.some(m=>m.fieldId===f.id&&(m.sourceColumn||m.fixedValue))&&!['event_name','date'].includes(f.name)).map(f=>f.name);
  const missingNames:number[]=[];const missingEmails:number[]=[];const invalidEmails:number[]=[];const names=new Map<string,number>();
  const get=(p:Participant,key:string)=>{const f=fields.find(x=>x.name===key||key==='name'&&x.name==='participant_name');const m=f?mappings.find(x=>x.fieldId===f.id):undefined;return (m?.sourceColumn?p.data[m.sourceColumn]:p.data[key])?.trim()||'';};
  for(const p of participants){const name=get(p,'name');if(!name)missingNames.push(p.rowNumber);else names.set(sanitizeFilename(name),(names.get(sanitizeFilename(name))||0)+1);if(requireEmail){const email=p.data.email||p.data.Email||'';if(!email)missingEmails.push(p.rowNumber);else if(!isEmail(email))invalidEmails.push(p.rowNumber);}}
  const duplicateNames=[...names.entries()].filter(([,n])=>n>1).map(([n])=>n);const invalidRows=new Set([...missingNames,...missingEmails,...invalidEmails]);return{ready:participants.length-invalidRows.size,invalid:invalidRows.size,missingNames,missingEmails,invalidEmails,missingMappings,duplicateNames};
}
