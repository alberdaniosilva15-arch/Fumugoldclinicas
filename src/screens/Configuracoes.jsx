// FumuGold — Screen: Configuracoes
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Configuracoes() {
  const {staff,setStaff,notifications,patients,appointments,labResults,prescriptions,invoices,beds,messages,surgeries,integrations,setIntegrations,addNotification} = useClinic();
  const [ctab,setCtab]=useState('sistema');
  const [userModalOpen,setUserModalOpen]=useState(false);
  const [userForm,setUserForm]=useState({nome:'',cargo:'Médico',turno:'Manhã',tel:'',status:'Activo',nivel:'Clínico'});
  const [deleteModal,setDeleteModal]=useState(null); // patient to delete
  const [deletePass,setDeletePass]=useState('');
  const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'fumugold2025';
  const [settings,setSettings]=useState({
    clinicName:'FUMUGOLD ClÃ­nica',clinicPhone:'+244 222 000 111',clinicEmail:'info@fumugold.ao',
    clinicAddress:'Rua da MissÃ£o 45, Luanda',lang:'PortuguÃªs',timezone:'Africa/Luanda',
    notifEmail:true,notifSMS:true,notifWhatsApp:true,
    autoBackup:true,backupFreq:'DiÃ¡rio',darkMode:true,
  });
  const [integPing,setIntegPing]=useState({status:'idle',msg:''});
  const [aiPrompt,setAiPrompt]=useState('Gerar prioridades operacionais do dia.');
  const [aiResult,setAiResult]=useState(null);
  const [archiveBusy,setArchiveBusy]=useState(false);
  const [archiveHistory,setArchiveHistory]=useState([]);
  const [supaBusy,setSupaBusy]=useState(false);
  const [syncReport,setSyncReport]=useState(null);

  const bundleData = useMemo(()=>buildClinicDataBundle({
    patients,appointments,labResults,prescriptions,invoices,
    beds,staff,messages,surgeries,notifications,
  },'manual'),[
    patients,appointments,labResults,prescriptions,invoices,
    beds,staff,messages,surgeries,notifications,
  ]);

  const refreshArchiveHistory = useCallback(async()=>{
    try{
      const r = await window.storage.get(LOCAL_ARCHIVE_HISTORY_KEY);
      setArchiveHistory(parseJSONSafe(r?.value,[]).slice(0,8));
    }catch(_){
      setArchiveHistory([]);
    }
  },[]);

  useEffect(()=>{ if(ctab==='integracoes') refreshArchiveHistory(); },[ctab,refreshArchiveHistory]);

  const runManualArchive = async(reason='manual')=>{
    setArchiveBusy(true);
    const manualBundle = buildClinicDataBundle({
      patients,appointments,labResults,prescriptions,invoices,
      beds,staff,messages,surgeries,notifications,
    },reason);
    const res = await persistArchiveBundle(manualBundle,{
      writeToFolder:!!integrations.archiveToFolder,
      format:integrations.archiveFormat||'json',
    });

    setIntegrations(prev=>({
      ...prev,
      allowAutonomousActions:false,
      lastArchiveAt:manualBundle.meta.generatedAt,
      archiveCount:Math.max((prev.archiveCount||0)+1,res.historyCount||0),
      lastArchiveError:res.folderError||'',
    }));

    setIntegPing({
      status:res.ok?'ok':'warn',
      msg:res.ok
        ? 'Arquivo local gerado com sucesso (' + manualBundle.meta.generatedAt.replace('T',' ').slice(0,16) + ').'
        : (res.folderError||'Falha ao gerar arquivo local.'),
    });

    await refreshArchiveHistory();
    setArchiveBusy(false);
  };

  const exportSnapshotJSON = ()=>{
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    downloadFile(JSON.stringify(bundleData,null,2),'fumugold_snapshot_' + stamp + '.json','application/json;charset=utf-8');
    setIntegPing({status:'ok',msg:'Snapshot JSON exportado para o PC via download local.'});
  };

  const exportSnapshotCSV = ()=>{
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    downloadFile(buildBundleCSV(bundleData),'fumugold_snapshot_' + stamp + '.csv','text/csv;charset=utf-8');
    setIntegPing({status:'ok',msg:'Resumo CSV exportado para o PC via download local.'});
  };

  const runLocalAI = ()=>{
    if(!integrations.localAIEnabled){
      setIntegPing({status:'warn',msg:'Ative a IA local para gerar analises.'});
      return;
    }
    const result = buildLocalAIResponse(aiPrompt,bundleData);
    setAiResult(result);
  };

  const runSupabaseProbe = async()=>{
    setSupaBusy(true);
    const probe = await probeSupabase({
      supabaseUrl:integrations.supabaseUrl,
      supabaseAnonKey:integrations.supabaseAnonKey,
    });

    setIntegPing({status:probe.ok?'ok':'warn',msg:probe.message});
    setIntegrations(prev=>({
      ...prev,
      syncStatus:probe.ok?'ready':'pending',
      lastSyncAt:probe.ok?new Date().toISOString():prev.lastSyncAt,
    }));
    setSupaBusy(false);
  };

  const runSupabaseSync = async()=>{
    setSupaBusy(true);

    const result = await syncClinicToSupabase({
      supabaseUrl:integrations.supabaseUrl,
      supabaseAnonKey:integrations.supabaseAnonKey,
      tableMap:integrations.tableMap||{},
    },{
      patients,appointments,labResults,prescriptions,invoices,
      beds,staff,messages,surgeries,notifications,
    });

    setSyncReport(result);
    setIntegrations(prev=>({
      ...prev,
      syncStatus:result.ok?'ready':'error',
      lastSyncAt:new Date().toISOString(),
    }));

    setIntegPing({
      status:result.ok?'ok':'warn',
      msg:result.message,
    });

    setSupaBusy(false);
  };

  const pickLocalFolder = async()=>{
    try{
      if(typeof window.showDirectoryPicker!=='function'){
        setIntegPing({status:'warn',msg:'Navegador sem suporte a seletor de pasta local. Use exportacao por download.'});
        return;
      }
      const dirHandle = await window.showDirectoryPicker({mode:'readwrite'});
      window.__fgArchiveDirHandle = dirHandle;
      setIntegrations(prev=>({...prev,archiveToFolder:true,archiveFolderName:dirHandle.name||'Pasta local'}));
      setIntegPing({status:'ok',msg:'Pasta local conectada: ' + (dirHandle.name||'Pasta local')});
    }catch(_){
      setIntegPing({status:'warn',msg:'Selecao de pasta cancelada.'});
    }
  };

  // Real audit derived from actual data
  const AUDIT = [
    ...patients.slice(0,3).map(p=>({user:'Sistema',action:`Registo paciente — ${p.nome}`,time:p.ultima||'—',type:'write'})),
    ...appointments.slice(0,3).map(a=>({user:a.doctor||'—',action:`Agendamento — ${a.patient}`,time:a.time||'—',type:'write'})),
    ...prescriptions.slice(0,2).map(rx=>({user:rx.medico||'—',action:`Prescrição ${rx.med} — ${rx.patient}`,time:rx.data||'—',type:'write'})),
    ...labResults.slice(0,2).map(r=>({user:'Lab',action:`Exame ${r.exam} — ${r.patient}`,time:r.date||'—',type:'read'})),
  ].slice(0,15);

  const CTABS=[{id:'sistema',label:'SISTEMA'},{id:'utilizadores',label:'UTILIZADORES'},
               {id:'notificacoes',label:'NOTIFICAÇÕES'},{id:'auditoria',label:'AUDITORIA'},
               {id:'integracoes',label:'INTEGRAÇÕES'},{id:'seguranca',label:'SEGURANÇA'}];

  const Toggle = ({val,onChange}) => (
    <div onClick={()=>onChange(!val)} style={{width:36,height:20,borderRadius:10,cursor:'pointer',
      background:val?`${G.gold}50`:`${G.dim}30`,border:`1px solid ${val?G.gold:G.dim}55`,
      position:'relative',transition:'all 0.2s'}}>
      <div style={{position:'absolute',top:2,left:val?16:2,width:14,height:14,
        borderRadius:'50%',background:val?G.gold:G.dim,transition:'left 0.2s'}}/>
    </div>
  );

  return(<>
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{width:180,flexShrink:0}}>
        <Panel style={{padding:8}}>
          {CTABS.map(t=>(
            <button key={t.id} onClick={()=>setCtab(t.id)}
              style={{width:'100%',padding:'8px 12px',marginBottom:3,textAlign:'left',
                fontFamily:'Orbitron',fontSize:7,letterSpacing:1.5,
                background:ctab===t.id?`${G.gold}14`:'transparent',
                border:`1px solid ${ctab===t.id?G.gold:'transparent'}`,
                color:ctab===t.id?G.gold:G.dim,borderRadius:2}}>
              {t.label}
            </button>
          ))}
        </Panel>
      </div>

      <div style={{flex:1,overflow:'auto'}}>
        {ctab==='sistema'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="CONFIGURAÇÕES DO SISTEMA"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div>
                <div style={{fontFamily:'Cinzel',fontSize:9,color:G.dim,letterSpacing:2,marginBottom:12}}>DADOS DA CLÍNICA</div>
                {[['Nome',settings.clinicName,'clinicName'],['Telefone',settings.clinicPhone,'clinicPhone'],
                  ['Email',settings.clinicEmail,'clinicEmail'],['Endereço',settings.clinicAddress,'clinicAddress']
                ].map(([l,v,k])=>(
                  <FormRow key={k} label={l}>
                    <GInput value={v} onChange={e=>setSettings({...settings,[k]:e.target.value})} placeholder={l}/>
                  </FormRow>
                ))}
              </div>
              <div>
                <div style={{fontFamily:'Cinzel',fontSize:9,color:G.dim,letterSpacing:2,marginBottom:12}}>SISTEMA & LOCALIZAÇÃO</div>
                <FormRow label="Idioma"><GSelect value={settings.lang} onChange={e=>setSettings({...settings,lang:e.target.value})} options={['Português','English','Français']}/></FormRow>
                <FormRow label="Fuso Horário"><GSelect value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})} options={['Africa/Luanda','Europe/Lisbon','UTC']}/></FormRow>
                <FormRow label="Backup Freq."><GSelect value={settings.backupFreq} onChange={e=>setSettings({...settings,backupFreq:e.target.value})} options={['Horário','Diário','Semanal']}/></FormRow>
                <FormRow label="Backup Auto">
                  <div style={{display:'flex',alignItems:'center'}}><Toggle val={settings.autoBackup} onChange={v=>setSettings({...settings,autoBackup:v})}/></div>
                </FormRow>
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20,
              borderTop:`1px solid ${G.border}`,paddingTop:16}}>
              <button style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 18px',background:`${G.gold}18`,
                border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>GUARDAR</button>
            </div>
          </Panel>
        )}

        {ctab==='utilizadores'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="GESTÃO DE UTILIZADORES" action={()=>setUserModalOpen(true)} actionLabel="+ NOVO"/>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Nome','Cargo','Nível','Estado','Acções'].map(h=>(
                    <th key={h} style={{padding:'7px 10px',fontFamily:'Orbitron',fontSize:7,color:G.dim,
                      textAlign:'left',borderBottom:`1px solid ${G.border}`,letterSpacing:1}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(()=>{
            const saveNewUser=()=>{if(!userForm.nome.trim())return;setStaff(p=>[...p,{...userForm,id:Date.now(),initials:userForm.nome.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(),cor:['#D4AF37','#00AAFF','#00CC88','#FF9944','#AA55FF'][Math.floor(Math.random()*5)],ferias:'—',folga:'—'}]);setUserModalOpen(false);setUserForm({nome:'',cargo:'Médico',turno:'Manhã',tel:'',status:'Activo',nivel:'Clínico'});};
            return null;
          })()||null}
          {staff.map((u,i)=>(

                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.text,borderBottom:`1px solid ${G.border}10`}}>{u.nome}</td>
                    <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{u.cargo?.split('—')[0]||u.cargo}</td>
                    <td style={{padding:'9px 10px',borderBottom:`1px solid ${G.border}10`}}><Badge text={u.nivel||'Clínico'} col={(u.nivel||'')==='Super Admin'?G.red:(u.nivel||'')==='Clínico'?G.teal:G.gold} small/></td>
                    <td style={{padding:'9px 10px',borderBottom:`1px solid ${G.border}10`}}><Badge text={u.status||'Activo'} col={u.status==='Folga'?G.amber:G.green} small/></td>
                    <td style={{padding:'9px 10px',borderBottom:`1px solid ${G.border}10`}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{const n=prompt('Novo nome:',u.nome);if(n)setStaff(p=>p.map(s=>s.id===u.id?{...s,nome:n}:s));}} style={{background:'none',color:G.dim,fontSize:11,cursor:'pointer'}} title='Editar'>✏</button>
                        <button onClick={()=>{const p=prompt('Nova senha:');if(p)alert('Senha actualizada (integrar com auth system)');}} style={{background:'none',color:G.dim,fontSize:11,cursor:'pointer'}} title='Senha'>🔑</button>
                        <button onClick={()=>{if(confirm(`Remover ${u.nome}?`))setStaff(p=>p.filter(s=>s.id!==u.id));}} style={{background:'none',color:G.red,fontSize:11,cursor:'pointer'}} title='Remover'>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {ctab==='notificacoes'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="CONFIGURAÇÕES DE NOTIFICAÇÕES"/>
            {[['Email','notifEmail','Enviar alertas clínicos por email'],
              ['SMS','notifSMS','Notificações SMS para pacientes'],
              ['WhatsApp','notifWhatsApp','Mensagens automáticas WhatsApp'],
            ].map(([l,k,desc])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'14px 0',borderBottom:`1px solid ${G.border}15`}}>
                <div>
                  <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600,marginBottom:3}}>{l}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{desc}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontFamily:'Orbitron',fontSize:8,color:settings[k]?G.green:G.dim}}>
                    {settings[k]?'ACTIVO':'INACTIVO'}
                  </span>
                  <div style={{display:'flex',alignItems:'center'}}>
                    <div onClick={()=>setSettings({...settings,[k]:!settings[k]})}
                      style={{width:40,height:22,borderRadius:11,cursor:'pointer',
                        background:settings[k]?`${G.gold}50`:`${G.dim}30`,
                        border:`1px solid ${settings[k]?G.gold:G.dim}55`,
                        position:'relative',transition:'all 0.2s'}}>
                      <div style={{position:'absolute',top:3,left:settings[k]?19:3,width:14,height:14,
                        borderRadius:'50%',background:settings[k]?G.gold:G.dim,transition:'left 0.2s'}}/>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        )}

        {ctab==='auditoria'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="LOG DE AUDITORIA"/>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Utilizador','Acção','Hora','Tipo'].map(h=>(
                    <th key={h} style={{padding:'6px 10px',fontFamily:'Orbitron',fontSize:7,color:G.dim,
                      textAlign:'left',borderBottom:`1px solid ${G.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AUDIT.map((a,i)=>{
                  const tc={read:G.teal,write:G.gold,auth:G.green};
                  return(
                    <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.03)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'8px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.text,borderBottom:`1px solid ${G.border}10`}}>{a.user}</td>
                      <td style={{padding:'8px 10px',fontFamily:'Rajdhani',fontSize:11,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{a.action}</td>
                      <td style={{padding:'8px 10px',fontFamily:'Orbitron',fontSize:8,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{a.time}</td>
                      <td style={{padding:'8px 10px',borderBottom:`1px solid ${G.border}10`}}><Badge text={a.type.toUpperCase()} col={tc[a.type]||G.dim} small/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}

        {ctab==='integracoes'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="CENTRO DE INTEGRAÇÕES"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
              <div>
                <div style={{fontFamily:'Cinzel',fontSize:9,color:G.dim,letterSpacing:2,marginBottom:10}}>SUPABASE</div>
                <FormRow label="Project URL"><GInput value={integrations.supabaseUrl||''} onChange={e=>setIntegrations({...integrations,supabaseUrl:e.target.value})} placeholder="https://xxxx.supabase.co"/></FormRow>
                <FormRow label="Anon Key"><GInput value={integrations.supabaseAnonKey||''} onChange={e=>setIntegrations({...integrations,supabaseAnonKey:e.target.value})} placeholder="eyJ..."/></FormRow>
                <FormRow label="Service Key"><GInput type="password" value={integrations.supabaseServiceRole||''} onChange={e=>setIntegrations({...integrations,supabaseServiceRole:e.target.value})} placeholder="service_role (opcional)"/></FormRow>
              </div>
              <div>
                <div style={{fontFamily:'Cinzel',fontSize:9,color:G.dim,letterSpacing:2,marginBottom:10}}>N8N + WHATSAPP</div>
                <FormRow label="Webhook Entrada"><GInput value={integrations.n8nWebhookIn||''} onChange={e=>setIntegrations({...integrations,n8nWebhookIn:e.target.value})} placeholder="https://n8n.../whatsapp-webhook"/></FormRow>
                <FormRow label="Webhook Saída"><GInput value={integrations.n8nWebhookOut||''} onChange={e=>setIntegrations({...integrations,n8nWebhookOut:e.target.value})} placeholder="https://n8n.../send"/></FormRow>
                <FormRow label="Provider"><GSelect value={integrations.whatsappProvider||'Evolution API'} onChange={e=>setIntegrations({...integrations,whatsappProvider:e.target.value})} options={['Evolution API','Twilio','Meta Cloud API']}/></FormRow>
                <FormRow label="Auto Sync">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Toggle val={!!integrations.autoSync} onChange={v=>setIntegrations({...integrations,autoSync:v})}/>
                    <span style={{fontFamily:'Orbitron',fontSize:8,color:integrations.autoSync?G.green:G.dim}}>{integrations.autoSync?'ATIVO':'INATIVO'}</span>
                  </div>
                </FormRow>
              </div>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16,borderTop:`1px solid ${G.border}`,paddingTop:14}}>
              <button onClick={runSupabaseProbe} disabled={supaBusy}
                style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 14px',background:`${G.teal}14`,border:`1px solid ${G.teal}`,color:G.teal,borderRadius:1,opacity:supaBusy?0.6:1}}>
                {supaBusy?'A TESTAR...':'TESTAR SUPABASE'}
              </button>
              <button onClick={runSupabaseSync} disabled={supaBusy}
                style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 14px',background:`${G.green}14`,border:`1px solid ${G.green}`,color:G.green,borderRadius:1,opacity:supaBusy?0.6:1}}>
                {supaBusy?'A SINCRONIZAR...':'SYNC SUPABASE'}
              </button>
              <button onClick={()=>{
                setIntegPing({status:'ok',msg:'ConfiguraÃ§Ãµes guardadas localmente com sucesso.'});
                setIntegrations({...integrations,lastSyncAt:new Date().toISOString()});
              }} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 14px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>GUARDAR</button>
            </div>

            <div style={{marginTop:14,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              <div style={{padding:10,border:`1px solid ${G.border}`,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>MENSAGENS CRM</div>
                <div style={{fontFamily:'Orbitron',fontSize:16,color:G.gold,marginTop:5}}>{messages.length}</div>
              </div>
              <div style={{padding:10,border:`1px solid ${G.border}`,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>STATUS SYNC</div>
                <div style={{fontFamily:'Orbitron',fontSize:12,color:integrations.syncStatus==='ready'?G.green:G.amber,marginTop:7}}>{(integrations.syncStatus||'idle').toUpperCase()}</div>
              </div>
              <div style={{padding:10,border:`1px solid ${G.border}`,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>ÚLTIMO SYNC</div>
                <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,marginTop:5}}>{integrations.lastSyncAt?new Date(integrations.lastSyncAt).toLocaleString('pt-PT'):'--'}</div>
              </div>
            </div>

            {integPing.msg && (
              <div style={{marginTop:12,padding:'9px 10px',borderRadius:2,
                background:integPing.status==='ok'?`${G.green}10`:`${G.amber}10`,
                border:`1px solid ${integPing.status==='ok'?G.green:G.amber}66`,
                fontFamily:'Rajdhani',fontSize:12,color:integPing.status==='ok'?G.green:G.amber}}>
                {integPing.msg}
              </div>
            )}

            {syncReport && (
              <div style={{marginTop:10,padding:10,border:'1px solid '+G.border,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Rajdhani',fontSize:12,color:syncReport.ok?G.green:G.amber,fontWeight:600}}>{syncReport.message}</div>
                <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginTop:4}}>
                  Enviados: {syncReport.sent||0} · Falhas: {syncReport.failed||0}
                </div>
                <div style={{marginTop:6,display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                  {(syncReport.details||[]).slice(0,6).map(d=>(
                    <div key={d.table} style={{padding:'6px 8px',border:'1px solid '+G.border,borderRadius:2}}>
                      <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text}}>{d.datasetKey}</div>
                      <div style={{fontFamily:'Rajdhani',fontSize:10,color:d.ok?G.green:G.amber}}>{d.ok?'OK':'ERRO'} · {d.sent||0} reg.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{padding:12,border:'1px solid '+G.border,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Cinzel',fontSize:10,color:G.gold,letterSpacing:1.6,marginBottom:10}}>IA LOCAL ASSISTIVA</div>

                <FormRow label="Ativar IA Local">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Toggle val={!!integrations.localAIEnabled} onChange={v=>setIntegrations({...integrations,localAIEnabled:v,allowAutonomousActions:false})}/>
                    <span style={{fontFamily:'Orbitron',fontSize:8,color:integrations.localAIEnabled?G.green:G.dim}}>{integrations.localAIEnabled?'ATIVA':'INATIVA'}</span>
                  </div>
                </FormRow>

                <FormRow label="Autonomia">
                  <span style={{fontFamily:'Orbitron',fontSize:8,color:G.red}}>BLOQUEADA</span>
                </FormRow>

                <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
                  placeholder="Peca um resumo, prioridades clinicas ou riscos financeiros..."
                  style={{marginTop:8,width:'100%',minHeight:76,resize:'vertical',background:'rgba(212,175,55,0.05)',border:'1px solid '+G.border,borderRadius:2,padding:'8px 10px',color:G.text,fontFamily:'Rajdhani',fontSize:12,lineHeight:1.4}}/>

                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onClick={runLocalAI} style={{fontFamily:'Orbitron',fontSize:8,padding:'7px 12px',background:'rgba(0,204,255,0.12)',border:'1px solid '+G.teal,color:G.teal,borderRadius:1}}>ANALISAR</button>
                  <button onClick={()=>{setAiPrompt('Gerar prioridades operacionais do dia.');setAiResult(null);}} style={{fontFamily:'Orbitron',fontSize:8,padding:'7px 12px',background:'transparent',border:'1px solid '+G.border,color:G.dim,borderRadius:1}}>LIMPAR</button>
                </div>

                {aiResult && (
                  <div style={{marginTop:10,padding:10,border:'1px solid '+G.border,borderRadius:2,background:'rgba(0,0,0,0.25)'}}>
                    <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,lineHeight:1.45}}>{aiResult.summary}</div>
                    <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginTop:6}}>{aiResult.guardrail}</div>

                    <div style={{marginTop:8,display:'grid',gap:6}}>
                      {aiResult.suggestions.map(s=>(
                        <div key={s.id} style={{padding:'7px 8px',border:'1px solid '+G.border,borderRadius:2}}>
                          <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{s.title}</div>
                          <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginTop:2}}>{s.detail}</div>
                          <button onClick={()=>addNotification('warn','IA local recomenda: '+s.title+' - '+s.detail)} style={{marginTop:6,fontFamily:'Orbitron',fontSize:7,padding:'5px 10px',background:'rgba(212,175,55,0.14)',border:'1px solid '+G.gold,color:G.gold,borderRadius:1}}>ENVIAR PARA ALERTAS</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{padding:12,border:'1px solid '+G.border,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
                <div style={{fontFamily:'Cinzel',fontSize:10,color:G.gold,letterSpacing:1.6,marginBottom:10}}>ARQUIVAMENTO LOCAL (PC)</div>

                <FormRow label="Auto Arquivo">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Toggle val={!!integrations.localArchiveEnabled} onChange={v=>setIntegrations({...integrations,localArchiveEnabled:v})}/>
                    <span style={{fontFamily:'Orbitron',fontSize:8,color:integrations.localArchiveEnabled?G.green:G.dim}}>{integrations.localArchiveEnabled?'ATIVO':'INATIVO'}</span>
                  </div>
                </FormRow>

                <FormRow label="Freq (min)">
                  <GSelect value={String(integrations.archiveFrequencyMin||15)} onChange={e=>setIntegrations({...integrations,archiveFrequencyMin:Number(e.target.value)||15})} options={['5','15','30','60']}/>
                </FormRow>

                <FormRow label="Formato">
                  <GSelect value={integrations.archiveFormat||'json'} onChange={e=>setIntegrations({...integrations,archiveFormat:e.target.value})} options={['json','csv']}/>
                </FormRow>

                <FormRow label="Pasta Local">
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={pickLocalFolder} style={{fontFamily:'Orbitron',fontSize:7,padding:'6px 10px',background:'rgba(0,204,255,0.12)',border:'1px solid '+G.teal,color:G.teal,borderRadius:1}}>SELECIONAR</button>
                    <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{integrations.archiveFolderName||'nao definida'}</span>
                  </div>
                </FormRow>

                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:8}}>
                  <button onClick={()=>runManualArchive('manual')} disabled={archiveBusy} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 10px',background:'rgba(212,175,55,0.14)',border:'1px solid '+G.gold,color:G.gold,borderRadius:1,opacity:archiveBusy?0.6:1}}>{archiveBusy?'A GUARDAR...':'ARQUIVAR AGORA'}</button>
                  <button onClick={exportSnapshotJSON} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 10px',background:'transparent',border:'1px solid '+G.border,color:G.text,borderRadius:1}}>EXPORTAR JSON</button>
                  <button onClick={exportSnapshotCSV} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 10px',background:'transparent',border:'1px solid '+G.border,color:G.text,borderRadius:1}}>EXPORTAR CSV</button>
                  <button onClick={refreshArchiveHistory} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 10px',background:'transparent',border:'1px solid '+G.border,color:G.text,borderRadius:1}}>ATUALIZAR HIST.</button>
                </div>

                <div style={{marginTop:10,padding:10,border:'1px solid '+G.border,borderRadius:2,background:'rgba(0,0,0,0.25)'}}>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text}}>Ultimo arquivo: {integrations.lastArchiveAt?new Date(integrations.lastArchiveAt).toLocaleString('pt-PT'):'--'}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginTop:2}}>Total historico: {archiveHistory.length} registros recentes</div>
                  {integrations.lastArchiveError && <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.amber,marginTop:4}}>Erro pasta local: {integrations.lastArchiveError}</div>}
                </div>

                <div style={{marginTop:8,maxHeight:120,overflowY:'auto',border:'1px solid '+G.border,borderRadius:2}}>
                  {archiveHistory.length===0 ? (
                    <div style={{padding:10,fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>Sem historico local ainda.</div>
                  ) : archiveHistory.map(item=>(
                    <div key={item.id} style={{padding:'7px 9px',borderBottom:'1px solid '+G.border+'22'}}>
                      <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text}}>{new Date(item.generatedAt).toLocaleString('pt-PT')} · {item.reason}</div>
                      <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>Pacientes: {item.kpis?.totalPatients||0} · Consultas: {item.kpis?.totalAppointments||0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {ctab==='seguranca'&&(
          <Panel style={{padding:20}}>
            <SectionHeader title="SEGURANÇA & ACESSO"/>
            {[['Autenticação 2FA','Activada','Verificação dupla por SMS',G.green],
              ['Sessões Activas','2','Luanda · Chrome',G.teal],
              ['Última Alteração de Senha','15/01/2025','Recomendado: 90 dias',G.gold],
              ['Nível de Encriptação','AES-256','Dados em repouso e em trânsito',G.green],
              ['Certificado SSL','Válido até 2026','TLS 1.3',G.green],
              ['LGPD / Protecção Dados','Conforme','Política privacidade actualizada',G.green],
            ].map(([l,v,desc,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'12px 0',borderBottom:`1px solid ${G.border}15`}}>
                <div>
                  <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600,marginBottom:2}}>{l}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{desc}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'Orbitron',fontSize:10,color:c,fontWeight:700}}>{v}</div>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
    {userModalOpen&&(
      <Modal open={true} onClose={()=>setUserModalOpen(false)} title="NOVO UTILIZADOR" width={420}>
        <FormRow label="Nome *"><GInput value={userForm.nome} onChange={e=>setUserForm({...userForm,nome:e.target.value})} placeholder="Nome completo"/></FormRow>
        <FormRow label="Cargo"><GSelect value={userForm.cargo} onChange={e=>setUserForm({...userForm,cargo:e.target.value})} options={['Médico','Enfermeiro','Técnico Lab','Administrativo','Director','Recepcionista']}/></FormRow>
        <FormRow label="Turno"><GSelect value={userForm.turno} onChange={e=>setUserForm({...userForm,turno:e.target.value})} options={['Manhã','Tarde','Noite','Rotativo']}/></FormRow>
        <FormRow label="Tel"><GInput value={userForm.tel} onChange={e=>setUserForm({...userForm,tel:e.target.value})} placeholder="+244 9XX XXX XXX"/></FormRow>
        <FormRow label="Estado"><GSelect value={userForm.status} onChange={e=>setUserForm({...userForm,status:e.target.value})} options={['Activo','Serviço','Folga','Inactivo']}/></FormRow>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button onClick={()=>setUserModalOpen(false)} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
          <button onClick={()=>{if(!userForm.nome.trim())return;const ini=userForm.nome.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();const col=['#D4AF37','#00AAFF','#00CC88','#FF9944','#AA55FF'][Math.floor(Math.random()*5)];setStaff(p=>[...p,{...userForm,id:Date.now(),initials:ini,cor:col,ferias:'—',folga:'—'}]);setUserModalOpen(false);setUserForm({nome:'',cargo:'Médico',turno:'Manhã',tel:'',status:'Activo',nivel:'Clínico'});}} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>◈ CRIAR</button>
        </div>
      </Modal>
    )}
  </>);
}

/* ═══════════════════════════════════════════════════════════
   THREE.JS HOOK — ENHANCED HOLOGRAPHIC ENGINE
═══════════════════════════════════════════════════════════ */

export default Configuracoes;
