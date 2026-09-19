import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { autoMap, parseParticipantFile } from '../backend/importer';
import { canvasToPdf, fitFontSize, isEmail, pdfTextBaselines, renderPlaceholders, resolveOutputPath, sanitizeFilename } from '../backend/utils';
import { AppDatabase } from '../backend/database';
import type { EventRecord, TemplateField } from '../shared/types';

const dirs:string[]=[];const temp=()=>{const d=mkdtempSync(join(tmpdir(),'certificate-studio-'));dirs.push(d);return d};afterEach(()=>{while(dirs.length)rmSync(dirs.pop()!,{recursive:true,force:true})});

describe('participant import',()=>{
  it('parses quoted UTF-8 CSV, trims cells, and ignores empty rows',()=>{const path=join(temp(),'people.csv');writeFileSync(path,'Participant Name,branch,email\r\n"Rao, Krishna", CSE ,rao@example.com\r\n,,\r\n');const result=parseParticipantFile(path,'event');expect(result.columns).toEqual(['Participant Name','branch','email']);expect(result.participants).toHaveLength(1);expect(result.participants[0].data['Participant Name']).toBe('Rao, Krishna');expect(result.participants[0].data.branch).toBe('CSE')});
  it('parses Excel by headers regardless of column order',()=>{const path=join(temp(),'people.xlsx');const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Email:'a@example.com',Name:'Anita',Branch:'ECE'}]),'Participants');XLSX.writeFile(wb,path);const result=parseParticipantFile(path,'event');expect(result.participants[0].data).toMatchObject({Email:'a@example.com',Name:'Anita',Branch:'ECE'})});
  it('maps normalized column names',()=>{expect(autoMap('participant_name',['Email','Participant Name'])).toBe('Participant Name');expect(autoMap('branch',['Department','BRANCH'])).toBe('BRANCH')});
});
describe('generation utilities',()=>{
  it('sanitizes Windows filenames',()=>expect(sanitizeFilename(' Ravi<>:"/\\|?* . ')).toBe('Ravi_________'));
  it('handles duplicates without overwriting',()=>{const dir=temp();writeFileSync(join(dir,'Ravi.pdf'),'x');expect(resolveOutputPath(dir,'Ravi','skip').skip).toBe(true);expect(resolveOutputPath(dir,'Ravi','duplicate').path).toBe(join(dir,'Ravi_2.pdf'))});
  it('fits fonts with measured glyph widths',()=>{const measure=(s:string,size:number)=>s==='WWW'?size*3:size;expect(fitFontSize(measure,'WWW',120,72,20)).toBe(40);expect(fitFontSize(measure,'i',120,72,20)).toBe(72)});
  it('converts top-left normalized coordinates to PDF coordinates',()=>expect(canvasToPdf({x:.1,y:.2,width:.3,height:.1},1000,500)).toEqual({x:100,y:350,width:300,height:50}));
  it('aligns visible PDF glyph bounds instead of the raw text baseline',()=>{expect(pdfTextBaselines(100,100,1,40,32,'middle').firstBaseline).toBe(138);expect(pdfTextBaselines(100,100,1,40,32,'top').firstBaseline).toBe(168);expect(pdfTextBaselines(100,100,1,40,32,'bottom').firstBaseline).toBe(108)});
  it('renders all placeholders and validates emails',()=>{expect(renderPlaceholders('Hi {{ name }} – {{event_name}}',{name:'Ravi',event_name:'IoT'})).toBe('Hi Ravi – IoT');expect(isEmail('a@b.com')).toBe(true);expect(isEmail('bad')).toBe(false)});
});
describe('event isolation',()=>{it('keeps participants and fields scoped to their event',()=>{const db=new AppDatabase(join(temp(),'app.db'));const make=(id:string):EventRecord=>({id,name:id,eventDate:null,description:'',templatePath:null,templateWidth:null,templateHeight:null,outputDirectory:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});db.createEvent(make('one'));db.createEvent(make('two'));const field:TemplateField={id:'f1',eventId:'one',name:'name',x:0,y:0,width:1,height:.1,horizontalAlign:'center',verticalAlign:'middle',fontFamily:'Arial',fontSize:60,minFontSize:20,fontWeight:'normal',color:'#000000',autoFit:true,wrapping:false,locked:false,fixedValue:null};db.saveFields('one',[field]);db.replaceParticipants('two',[{id:'p2',eventId:'two',rowNumber:2,data:{name:'Only two'},status:'ready',errors:[]}]);expect(db.listFields('two')).toEqual([]);expect(db.listParticipants('one')).toEqual([]);expect(db.listParticipants('two')[0].data.name).toBe('Only two');db.close()})});
