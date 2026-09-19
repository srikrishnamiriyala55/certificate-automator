import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { CertificateGenerator } from '../backend/generator';

describe('PDF generation',()=>{it('creates exactly one correctly-sized certificate page',async()=>{const dir=mkdtempSync(join(tmpdir(),'certificate-pdf-'));try{const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8W6WQAAAABJRU5ErkJggg==','base64');const template=join(dir,'template.png'),output=join(dir,'generated','Ravi.pdf');writeFileSync(template,png);const event={id:'e',name:'Workshop',eventDate:'2026-08-22',description:'',templatePath:template,templateWidth:1000,templateHeight:700,outputDirectory:dir,createdAt:'',updatedAt:''};await new CertificateGenerator().generate({event,participant:{id:'p',eventId:'e',rowNumber:2,data:{name:'Ravi Kumar'},status:'ready',errors:[]},fields:[{id:'f',eventId:'e',name:'name',x:.2,y:.4,width:.6,height:.1,horizontalAlign:'center',verticalAlign:'middle',fontFamily:'Arial',fontSize:60,minFontSize:20,fontWeight:'bold',color:'#000000',autoFit:true,wrapping:false,locked:false,fixedValue:null}],mappings:[{fieldId:'f',sourceColumn:'name',fixedValue:null}],outputPath:output});const pdf=await PDFDocument.load(readFileSync(output));expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getSize()).toEqual({width:1000,height:700})}finally{rmSync(dir,{recursive:true,force:true})}})});
