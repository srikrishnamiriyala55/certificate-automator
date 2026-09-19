import nodemailer from 'nodemailer';
import type { EmailSettings } from '../shared/types.js';
import { renderPlaceholders } from './utils.js';

export class EmailService {
  transport(settings:EmailSettings,password:string){return nodemailer.createTransport({host:settings.host,port:settings.port,secure:settings.security==='ssl',requireTLS:settings.security==='starttls',auth:{user:settings.username,pass:password}});}
  async test(settings:EmailSettings,password:string,recipient:string){const tx=this.transport(settings,password);await tx.verify();await tx.sendMail({from:{name:settings.fromName,address:settings.fromEmail},to:recipient,subject:'Certificate Studio – SMTP test',text:'Your Certificate Studio email configuration is working.'});}
  async send(settings:EmailSettings,password:string,to:string,data:Record<string,string>,attachment:string){await this.transport(settings,password).sendMail({from:{name:settings.fromName,address:settings.fromEmail},to,subject:renderPlaceholders(settings.subject,data),text:renderPlaceholders(settings.body,data),attachments:[{filename:attachment.split(/[\\/]/).pop(),path:attachment}]});}
}
