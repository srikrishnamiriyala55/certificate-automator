import { contextBridge, ipcRenderer } from 'electron';
import type { CertificateStudioApi, GenerationProgress } from '../shared/types.js';

const invoke=(channel:string,...args:unknown[])=>ipcRenderer.invoke(channel,...args);
const api:CertificateStudioApi={
  dashboard:()=>invoke('dashboard'),
  events:{list:()=>invoke('events:list'),get:(id)=>invoke('events:get',id),create:(input)=>invoke('events:create',input),update:(id,input)=>invoke('events:update',id,input),remove:(id)=>invoke('events:remove',id),export:(id)=>invoke('events:export',id),import:()=>invoke('events:import')},
  template:{choose:(eventId)=>invoke('template:choose',eventId),data:(eventId)=>invoke('template:data',eventId)},
  fields:{save:(eventId,fields)=>invoke('fields:save',eventId,fields),export:(eventId)=>invoke('fields:export',eventId),import:(eventId)=>invoke('fields:import',eventId)},
  participants:{import:(eventId)=>invoke('participants:import',eventId),saveMappings:(eventId,mappings)=>invoke('participants:mappings',eventId,mappings),validate:(eventId,requireEmail)=>invoke('participants:validate',eventId,requireEmail)},
  workspace:{choose:(eventId)=>invoke('workspace:choose',eventId),open:(eventId)=>invoke('workspace:open',eventId),openFile:(path)=>invoke('workspace:openFile',path)},
  generation:{test:(eventId,participantId)=>invoke('generation:test',eventId,participantId),start:(eventId,behavior)=>invoke('generation:start',eventId,behavior),cancel:(jobId)=>invoke('generation:cancel',jobId),resume:(jobId)=>invoke('generation:resume',jobId),onProgress:(callback)=>{const fn=(_:unknown,p:GenerationProgress)=>callback(p);ipcRenderer.on('generation:progress',fn);return()=>ipcRenderer.removeListener('generation:progress',fn);}},
  email:{get:(eventId)=>invoke('email:get',eventId),save:(eventId,settings,password)=>invoke('email:save',eventId,settings,password),test:(eventId,recipient)=>invoke('email:test',eventId,recipient),send:(eventId)=>invoke('email:send',eventId),retry:(eventId)=>invoke('email:retry',eventId)},
  history:(eventId)=>invoke('history',eventId),settings:{get:()=>invoke('settings:get'),save:(values)=>invoke('settings:save',values)}
};
contextBridge.exposeInMainWorld('studio',api);
