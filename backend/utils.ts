import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { DuplicateBehavior, TemplateField } from '../shared/types.js';

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function sanitizeFilename(value: string) { const clean=value.replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').replace(/[. ]+$/g,'').trim(); return (clean || 'certificate').slice(0,180); }
export function resolveOutputPath(directory:string,name:string,behavior:DuplicateBehavior){const base=sanitizeFilename(name);const direct=join(directory,`${base}.pdf`);if(!existsSync(direct)||behavior==='overwrite')return {path:direct,skip:false};if(behavior==='skip')return {path:direct,skip:true};let i=2;while(existsSync(join(directory,`${base}_${i}.pdf`)))i++;return {path:join(directory,`${base}_${i}.pdf`),skip:false};}
export function fitFontSize(measure:(text:string,size:number)=>number,text:string,maxWidth:number,maxSize:number,minSize:number){let size=Math.max(minSize,maxSize);while(size>minSize&&measure(text,size)>maxWidth)size=Math.max(minSize,size-1);return size;}
export function canvasToPdf(field:Pick<TemplateField,'x'|'y'|'width'|'height'>,pageWidth:number,pageHeight:number){return{x:field.x*pageWidth,y:pageHeight-(field.y+field.height)*pageHeight,width:field.width*pageWidth,height:field.height*pageHeight};}
export function pdfTextBaselines(boxY:number,boxHeight:number,lineCount:number,glyphHeight:number,ascent:number,vertical:'top'|'middle'|'bottom'){
  const descent=Math.max(0,glyphHeight-ascent);const lineHeight=glyphHeight*1.12;const blockHeight=glyphHeight+Math.max(0,lineCount-1)*lineHeight;const blockBottom=vertical==='top'?boxY+boxHeight-blockHeight:vertical==='bottom'?boxY:boxY+(boxHeight-blockHeight)/2;const firstBaseline=blockBottom+blockHeight-ascent;return{firstBaseline,lineHeight,blockHeight,descent};
}
export function renderPlaceholders(template:string,data:Record<string,string>){return template.replace(/{{\s*([^{}]+?)\s*}}/g,(_,key:string)=>data[key]??'');}
export const safeError=(error:unknown)=>error instanceof Error?error.message:'An unexpected error occurred';
export function assertAllowedFile(path:string,extensions:string[]){const ext=extname(path).toLowerCase();if(!extensions.includes(ext))throw new Error(`Unsupported file type: ${ext||basename(path)}`);}
