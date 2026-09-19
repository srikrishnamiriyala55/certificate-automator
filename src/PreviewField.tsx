import { useMemo } from 'react';
import type { TemplateField } from '../shared/types';
import './preview.css';

interface PreviewFieldProps {
  field: TemplateField;
  text: string;
  templateWidth: number;
  templateHeight: number;
  displayedWidth: number;
  displayedHeight: number;
}

let measurementCanvas: HTMLCanvasElement | null = null;

function measure(text: string, size: number, family: string, weight: string) {
  measurementCanvas ??= document.createElement('canvas');
  const context = measurementCanvas.getContext('2d');
  if (!context) return 0;
  context.font = `${weight} ${size}px "${family}"`;
  return context.measureText(text).width;
}

function wrapText(text: string, width: number, size: number, family: string, weight: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measure(candidate, size, family, weight) <= width) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function calculateLayout(field: TemplateField, text: string, templateWidth: number, templateHeight: number) {
  const width = field.width * templateWidth;
  const height = field.height * templateHeight;
  let size = field.fontSize;
  let lines = field.wrapping ? wrapText(text, width, size, field.fontFamily, field.fontWeight) : [text];
  if (field.autoFit) {
    while (size > field.minFontSize) {
      const tooWide = lines.some(line => measure(line, size, field.fontFamily, field.fontWeight) > width);
      const tooTall = lines.length * size * 1.12 > height;
      if (!tooWide && !tooTall) break;
      size -= 1;
      lines = field.wrapping ? wrapText(text, width, size, field.fontFamily, field.fontWeight) : [text];
    }
  }
  return { size, lines };
}

export default function PreviewField({field,text,templateWidth,templateHeight,displayedWidth,displayedHeight}:PreviewFieldProps) {
  const result = useMemo(() => calculateLayout(field,text,templateWidth,templateHeight), [field,text,templateWidth,templateHeight]);
  const scale = Math.min(displayedWidth/templateWidth || 1, displayedHeight/templateHeight || 1);
  return <div className="preview-field" style={{
    left:`${field.x*100}%`, top:`${field.y*100}%`, width:`${field.width*100}%`, height:`${field.height*100}%`,
    fontFamily:field.fontFamily, fontSize:`${result.size*scale}px`, fontWeight:field.fontWeight,
    color:field.color, textAlign:field.horizontalAlign,
    justifyContent:field.verticalAlign==='top'?'flex-start':field.verticalAlign==='bottom'?'flex-end':'center',
    lineHeight:1.12,
  }}>{result.lines.map((line,index)=><span key={index}>{line || '\u00a0'}</span>)}</div>;
}
