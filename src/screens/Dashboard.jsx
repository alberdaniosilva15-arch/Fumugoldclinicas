// FumuGold — Screen: Dashboard
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Dashboard({setTab}) {
  const {
    patients,
    appointments,
    labResults,
    notifications,
    beds,
    invoices,
    prescriptions,
    messages,
    staff,
    integrations,
    addNotification,
  } = useClinic();

  const [liveTime,setLiveTime] = useState(new Date());
  const [period,setPeriod] = useState('7d');
  const [riskFilter,setRiskFilter] = useState('all');

  useEffect(()=>{
    const t = setInterval(()=>setLiveTime(new Date()), 1000);
    return ()=>clearInterval(t);
  },[]);

  const parseDate = useCallback((value)=>{
    if(!value) return null;
    if(value instanceof Date) return value;
    const raw = String(value).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00`);
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d,m,y] = raw.split('/');
      return new Date(`${y}-${m}-${d}T00:00:00`);
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  },[]);

  const rangeDays = period==='today' ? 1 : period==='30d' ? 30 : 7;
  const rangeStart = useMemo(()=>{
    const d = new Date(liveTime);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (rangeDays - 1));
    return d;
  },[liveTime,rangeDays]);

  const inRange = useCallback((value)=>{
    const d = parseDate(value);
    if(!d) return false;
    return d >= rangeStart && d <= liveTime;
  },[liveTime,parseDate,rangeStart]);

  const todayISO = useMemo(()=>{
    const y = liveTime.getFullYear();
    const m = String(liveTime.getMonth()+1).padStart(2,'0');
    const d = String(liveTime.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  },[liveTime]);

  const filteredAppointments = useMemo(
    ()=>appointments.filter(a=>inRange(a.date || todayISO)),
    [appointments,inRange,todayISO]
  );

  const activePatients = useMemo(
    ()=>patients.filter(p=>p.tipo==='Paciente' && p.status!=='Alta Completa'),
    [patients]
  );

  const triageQueue = useMemo(()=>(
    filteredAppointments
      .filter(a=>['Aguarda','Confirmada','Em curso'].includes(a.status))
      .sort((a,b)=>String(a.time||'99:99').localeCompare(String(b.time||'99:99')))
  ),[filteredAppointments]);

  const criticalLabs = useMemo(
    ()=>labResults.filter(r=>r.alert && inRange(r.date || todayISO)),
    [labResults,inRange,todayISO]
  );

  const unreadAlerts = useMemo(
    ()=>notifications.filter(n=>!n.read),
    [notifications]
  );

  const bedsOccupied = useMemo(
    ()=>beds.filter(b=>b.status==='Ocupada').length,
    [beds]
  );

  const invoiceTotals = useMemo(()=>{
    const total = invoices.reduce((sum,inv)=>sum+(inv.total||0),0);
    const paid = invoices.reduce((sum,inv)=>sum+(inv.pago||0),0);
    const pending = invoices.reduce((sum,inv)=>sum+(inv.pendente||0),0);
    return {total,paid,pending};
  },[invoices]);

  const collectionRate = invoiceTotals.total>0
    ? Math.round((invoiceTotals.paid / invoiceTotals.total) * 100)
    : 0;

  const statusColors = {
    'Em curso': G.green,
    Confirmada: G.gold,
    Aguarda: G.amber,
    Faltou: G.red,
  };

  const riskPatients = useMemo(()=>{
    const labByPatient = new Set(criticalLabs.map(r=>r.patient));
    const evalRisk = (p)=>{
      let score = 0;
      if(Number(p.fc)>120 || (Number(p.fc)>0 && Number(p.fc)<50)) score += 3;
      if(Number(p.spo2)>0 && Number(p.spo2)<93) score += 4;
      if(String(p.temp||'').trim() && Number(p.temp)>=38.2) score += 2;
      if(String(p.pa||'').includes('/')) {
        const [sys,dia] = String(p.pa).split('/').map(Number);
        if((sys && sys>=170) || (dia && dia>=105)) score += 3;
      }
      if(labByPatient.has(p.nome)) score += 3;
      if(p.status==='Atenção' || p.status==='Em Tratamento') score += 2;
      return score;
    };

    return activePatients
      .map(p=>({
        ...p,
        risk: evalRisk(p),
      }))
      .filter(p=>p.risk>0)
      .sort((a,b)=>b.risk-a.risk)
      .filter(p=>riskFilter==='all' ? true : riskFilter==='high' ? p.risk>=7 : p.risk<7)
      .slice(0,8);
  },[activePatients,criticalLabs,riskFilter]);

  const avgQueuePressure = triageQueue.length * 12 + criticalLabs.length * 8;
  const predictedNoShow = Math.round((filteredAppointments.filter(a=>a.status==='Confirmada').length * 0.12) * 10) / 10;
  const occupancyRate = beds.length>0 ? Math.round((bedsOccupied / beds.length) * 100) : 0;

  const detectChannel = useCallback((m)=>{
    const text = `${m.from||''} ${m.msg||''} ${m.channel||''}`.toLowerCase();
    if(text.includes('whatsapp') || text.includes('+244') || text.includes('+55') || m.channel==='whatsapp') return 'WhatsApp';
    if(m.type==='lab' || text.includes('lab')) return 'Laboratorio';
    if(m.type==='agenda' || text.includes('consulta')) return 'Agenda';
    return 'Interno';
  },[]);

  const channelStats = useMemo(()=>{
    const base = {WhatsApp:0,Interno:0,Agenda:0,Laboratorio:0};
    messages.forEach(m=>{ base[detectChannel(m)] = (base[detectChannel(m)]||0)+1; });
    return base;
  },[detectChannel,messages]);

  const omniInbox = useMemo(()=>{
    const raw = messages
      .map(m=>({
        id: m.id || Date.now()+Math.random(),
        from: m.from || 'Sistema',
        msg: m.msg || 'Sem conteúdo',
        time: m.time || '--:--',
        channel: detectChannel(m),
        unread: !!m.unread,
        priority: m.type==='alerta' ? 'alta' : m.type==='lab' ? 'media' : 'normal',
      }))
      .sort((a,b)=>String(b.time).localeCompare(String(a.time)));

    if(raw.length>0) return raw.slice(0,8);

    return [
      {id:'seed1',from:'WhatsApp Bot',msg:'Sem mensagens novas no momento.',time:liveTime.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),channel:'WhatsApp',unread:false,priority:'normal'},
      {id:'seed2',from:'Sistema',msg:'Integração n8n pronta para recebimento.',time:liveTime.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),channel:'Interno',unread:false,priority:'normal'},
    ];
  },[detectChannel,liveTime,messages]);

  const integrationReady = Boolean(
    integrations?.supabaseUrl && integrations?.supabaseAnonKey && integrations?.n8nWebhookIn
  );

  const goTab = (tabName, note) => {
    if(note) addNotification('info', note);
    setTab(tabName);
  };

  const periodBtn = (id,label)=>(
    <button key={id} onClick={()=>setPeriod(id)}
      style={{
        fontFamily:'Orbitron',
        fontSize:7,
        padding:'4px 10px',
        borderRadius:2,
        background:period===id?`${G.gold}1c`:'transparent',
        border:`1px solid ${period===id?G.gold:G.border}`,
        color:period===id?G.gold:G.dim,
        letterSpacing:1,
      }}>
      {label}
    </button>
  );

  return(
    <div style={{padding:12,display:'flex',flexDirection:'column',gap:10,height:'100%',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'8px 12px',
        background:'rgba(6,4,0,0.88)',border:`1px solid ${G.border}`,borderRadius:2}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Dot col={G.green} pulse/>
          <span style={{fontFamily:'Orbitron',fontSize:8,color:G.green,letterSpacing:1.5}}>COMMAND CENTER ONLINE</span>
        </div>
        <div style={{display:'flex',gap:6,marginLeft:6}}>{['today','7d','30d'].map(id=>periodBtn(id,id==='today'?'HOJE':id.toUpperCase()))}</div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <Badge text={integrationReady?'SUPABASE + N8N OK':'INTEGRACAO PENDENTE'} col={integrationReady?G.green:G.amber} pulse={!integrationReady}/>
          <span style={{fontFamily:'Orbitron',fontSize:8,color:G.goldL,letterSpacing:1.2}}>{liveTime.toLocaleTimeString('pt-PT')}</span>
        </div>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <StatCard label="Pacientes Ativos" val={activePatients.length} sub={`${patients.filter(p=>p.tipo==='Paciente').length} total`} ic="PS" col={G.gold} i={0}/>
        <StatCard label="Fila Clinica" val={triageQueue.length} sub={`${avgQueuePressure} min de pressao`} ic="Q" col={G.teal} i={1}/>
        <StatCard label="Risco Elevado" val={riskPatients.filter(p=>p.risk>=7).length} sub={`${criticalLabs.length} alertas de lab`} ic="!" col={G.red} i={2}/>
        <StatCard label="Ocupacao Camas" val={`${bedsOccupied}/${beds.length}`} sub={`${occupancyRate}% ocupacao`} ic="BED" col={G.purple} i={3}/>
        <StatCard label="Recebimento" val={`${collectionRate}%`} sub={`${(invoiceTotals.paid||0).toLocaleString('pt-AO')} AOA`} ic="$" col={G.green} i={4}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:10,alignItems:'start'}}>
        <Panel style={{padding:14,minHeight:360}}>
          <SectionHeader title="Fluxo Assistencial" action={()=>goTab('agendamento','Abrindo agenda operacional.')} actionLabel="ABRIR AGENDA"/>
          {triageQueue.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,padding:'14px 0',textAlign:'center'}}>Sem fila clinica no periodo selecionado.</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {triageQueue.slice(0,8).map((a,i)=>(
                <div key={`${a.patient}-${i}`} style={{display:'grid',gridTemplateColumns:'52px 1fr auto',gap:10,alignItems:'center',
                  padding:'8px 0',borderBottom:`1px solid ${G.border}15`}}>
                  <div style={{fontFamily:'Orbitron',fontSize:11,color:G.gold}}>{a.time||'--:--'}</div>
                  <div>
                    <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{a.patient||'Paciente sem nome'}</div>
                    <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{a.doctor||'Sem medico'} · {a.specialty||'Clinica geral'}</div>
                  </div>
                  <Badge text={a.status||'Aguarda'} col={statusColors[a.status]||G.dim}/>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:12}}>
            <div style={{padding:10,border:`1px solid ${G.border}`,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,letterSpacing:1}}>PREVISAO NO-SHOW</div>
              <div style={{fontFamily:'Orbitron',fontSize:18,color:G.amber,marginTop:6}}>{predictedNoShow}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>consultas potencialmente ausentes</div>
            </div>
            <div style={{padding:10,border:`1px solid ${G.border}`,borderRadius:2,background:'rgba(212,175,55,0.03)'}}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,letterSpacing:1}}>ALERTAS NAO LIDOS</div>
              <div style={{fontFamily:'Orbitron',fontSize:18,color:unreadAlerts.length>0?G.red:G.green,marginTop:6}}>{unreadAlerts.length}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>pendencias para equipe clinica</div>
            </div>
          </div>
        </Panel>

        <Panel style={{padding:14,minHeight:360}}>
          <SectionHeader title="Radar de Risco"/>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {[['all','TODOS'],['high','ALTO'],['medium','MODERADO']].map(([id,label])=>(
              <button key={id} onClick={()=>setRiskFilter(id)} style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 9px',
                borderRadius:2,background:riskFilter===id?`${G.gold}18`:'transparent',
                border:`1px solid ${riskFilter===id?G.gold:G.border}`,color:riskFilter===id?G.gold:G.dim}}>{label}</button>
            ))}
          </div>

          {riskPatients.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,padding:'10px 0',textAlign:'center'}}>Nenhum paciente com score de risco no momento.</div>
          ):(riskPatients.map((p,i)=>{
            const col = p.risk>=7 ? G.red : G.amber;
            return(
              <div key={p.id||i} style={{padding:'8px 0',borderBottom:`1px solid ${G.border}15`,display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
                <div>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{p.nome}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>FC {p.fc||'--'} · SpO2 {p.spo2||'--'} · PA {p.pa||'--/--'}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <Badge text={`R${p.risk}`} col={col}/>
                  <button onClick={()=>goTab('pacientes',`Abrindo prontuario de ${p.nome}.`)} style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 8px',
                    background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>ABRIR</button>
                </div>
              </div>
            );
          }))}

          <div style={{marginTop:12}}>
            <VitalWave color={riskPatients.some(p=>p.risk>=7)?G.red:G.green} amp={riskPatients.some(p=>p.risk>=7)?1.3:0.7} h={44}/>
          </div>
        </Panel>

        <Panel style={{padding:14,minHeight:360}}>
          <SectionHeader title="Inbox Omnichannel" action={()=>goTab('comunicacao','Abrindo central de comunicacao.')} actionLabel="ABRIR CHAT"/>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
            {Object.entries(channelStats).map(([k,v])=>(
              <div key={k} style={{padding:'6px 4px',border:`1px solid ${G.border}`,borderRadius:2,textAlign:'center'}}>
                <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>{k.toUpperCase().slice(0,8)}</div>
                <div style={{fontFamily:'Orbitron',fontSize:13,color:G.gold,marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {omniInbox.map((item)=>{
              const col = item.priority==='alta' ? G.red : item.priority==='media' ? G.amber : G.teal;
              return(
                <div key={item.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,padding:'7px 0',borderBottom:`1px solid ${G.border}15`,opacity:item.unread?1:0.85}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{item.from}</span>
                      <Badge text={item.channel} col={col} small/>
                    </div>
                    <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,lineHeight:1.35,marginTop:2}}>{item.msg}</div>
                  </div>
                  <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim}}>{item.time}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}>
        <Panel style={{padding:14}}>
          <SectionHeader title="Ciclo de Receita" action={()=>goTab('financeiro','Abrindo modulo financeiro.')} actionLabel="VER FINANCEIRO"/>
          {invoices.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,padding:'10px 0',textAlign:'center'}}>Sem faturas no periodo.</div>
          ):(
            <>
              <BarChart data={[
                {label:'Faturado',val:invoiceTotals.total||1,col:G.gold},
                {label:'Recebido',val:invoiceTotals.paid||1,col:G.green},
                {label:'Pendente',val:invoiceTotals.pending||1,col:G.amber},
              ]} h={72}/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:10}}>
                <div style={{padding:8,border:`1px solid ${G.border}`,borderRadius:2}}>
                  <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>FATURADO</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.gold,marginTop:3}}>{invoiceTotals.total.toLocaleString('pt-AO')} AOA</div>
                </div>
                <div style={{padding:8,border:`1px solid ${G.border}`,borderRadius:2}}>
                  <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>RECEBIDO</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.green,marginTop:3}}>{invoiceTotals.paid.toLocaleString('pt-AO')} AOA</div>
                </div>
                <div style={{padding:8,border:`1px solid ${G.border}`,borderRadius:2}}>
                  <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>PENDENTE</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.amber,marginTop:3}}>{invoiceTotals.pending.toLocaleString('pt-AO')} AOA</div>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel style={{padding:14}}>
          <SectionHeader title="Capacidade Clinica"/>
          <div style={{display:'flex',justifyContent:'space-around'}}>
            <Ring val={bedsOccupied} max={Math.max(beds.length,1)} col={G.amber} label="Camas"/>
            <Ring val={criticalLabs.length} max={Math.max(labResults.length,1)} col={G.red} label="Labs criticos"/>
            <Ring val={prescriptions.filter(r=>r.status==='Activa').length} max={Math.max(prescriptions.length,1)} col={G.teal} label="Rx ativa"/>
          </div>
          <div style={{marginTop:10,fontFamily:'Rajdhani',fontSize:11,color:G.dim,lineHeight:1.45}}>
            Staff online: {staff.filter(s=>s.status==='Servico' || s.status==='Serviço' || s.status==='ServiÃ§o').length} ·
            Leitos livres: {Math.max(beds.length-bedsOccupied,0)}
          </div>
        </Panel>

        <Panel style={{padding:14}}>
          <SectionHeader title="Acoes Rapidas"/>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            <button onClick={()=>goTab('pacientes','Abrindo cadastro de pacientes.')} style={{padding:'8px 10px',textAlign:'left',fontFamily:'Rajdhani',fontSize:12,
              background:`${G.gold}10`,border:`1px solid ${G.border}`,color:G.text,borderRadius:2}}>Novo paciente / prontuario</button>
            <button onClick={()=>goTab('agendamento','Abrindo agenda para nova consulta.')} style={{padding:'8px 10px',textAlign:'left',fontFamily:'Rajdhani',fontSize:12,
              background:`${G.teal}10`,border:`1px solid ${G.border}`,color:G.text,borderRadius:2}}>Nova consulta e triagem</button>
            <button onClick={()=>goTab('laboratorio','Abrindo painel laboratorial.')} style={{padding:'8px 10px',textAlign:'left',fontFamily:'Rajdhani',fontSize:12,
              background:`${G.amber}10`,border:`1px solid ${G.border}`,color:G.text,borderRadius:2}}>Registrar resultado de laboratorio</button>
            <button onClick={()=>{addNotification('crit','Escalada manual: rever fila critica imediatamente.');}} style={{padding:'8px 10px',textAlign:'left',fontFamily:'Rajdhani',fontSize:12,
              background:`${G.red}10`,border:`1px solid ${G.red}66`,color:G.red,borderRadius:2}}>Escalar fila critica</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   HOLOGRAFIA 3D — ATLAS 3D SKETCHFAB INTEGRADO
═══════════════════════════════════════════════════════════ */

const ATLAS_MODELS = {
  body_xr:      {id:'e89f83cd30ad48c980c7e1a152c6b172',label:'Corpo Completo XR',       icon:'🧬',parts:['head','chest','abdomen','pelvis','spine']},
  body_full:    {id:'9306344c4b554268a520c72c0d988b5b',label:'Anatomia Humana Completa', icon:'👤',parts:['head','chest','abdomen','pelvis','spine']},
  body_organs:  {id:'8a43f3a308994699a4000b17004d5220',label:'Órgãos Internos',          icon:'🫀',parts:['abdomen','stomach','liver','spleen','pancreas']},
  body_holo:    {id:'f62ec13f32114cc093f282ab0dbce4ae',label:'Holograma Corpo Completo', icon:'💠',parts:['head','chest','abdomen','pelvis','spine','arm_L','arm_R']},
  muscles_bones:{id:'db7be21587804a32ab3a99e165c56e19',label:'Músculos e Ossos',         icon:'💪',parts:['chest','abdomen','pelvis','spine','knee_L','knee_R','bone_pelvis']},
  stomach:      {id:'e0f1952de7204654ba469c3e887a029b',label:'Estômago Realista',         icon:'🟡',parts:['stomach','abdomen']},
  brain:        {id:'c9c9d4d671b94345952d012cc2ea7a24',label:'Cérebro Humano',            icon:'🧠',parts:['brain','head']},
  lungs:        {id:'ce09f4099a68467880f46e61eb9a3531',label:'Pulmões Realistas',         icon:'🫁',parts:['lung_L','lung_R','chest']},
  liver:        {id:'6c4e9bd0d49f4828b804259330c0c6c4',label:'Fígado e Vesícula',         icon:'🔴',parts:['liver','abdomen']},
  kidney:       {id:'e1476ceb1e3b4412af5418eee9c5ed08',label:'Rim Humano',                icon:'🫘',parts:['kidney_L','kidney_R','abdomen']},
  eye:          {id:'b42d09ed18034063a528d9b1a2a9654a',label:'Olho Humano',               icon:'👁', parts:['eye_L','eye_R','head']},
  spine:        {id:'bcd9eee09ce044ef98a69c315aa792e2',label:'Coluna Vertebral',          icon:'🦴',parts:['spine','neck','pelvis']},
  reproductive: {id:'17bdcd1c2e9046d1abde72eff5c2cd0d',label:'Sistema Reprodutivo',      icon:'🔵',parts:['pelvis','abdomen']},
  pelvis:       {id:'c24dc91c4aae4114abe1aaf5f71fb03a',label:'Pelve e Coxas',             icon:'🦵',parts:['pelvis','bone_pelvis','thigh_L','thigh_R','knee_L','knee_R']},
};

const PART_TO_MODEL = {
  brain:'brain',    head:'brain',
  lung_L:'lungs',   lung_R:'lungs',    chest:'lungs',
  heart:'body_xr',
  liver:'liver',    spleen:'liver',
  stomach:'stomach',pancreas:'body_organs',abdomen:'body_organs',
  kidney_L:'kidney',kidney_R:'kidney', bladder:'kidney',
  eye_L:'eye',      eye_R:'eye',
  spine:'spine',    neck:'spine',
  pelvis:'pelvis',  bone_pelvis:'pelvis',thigh_L:'pelvis',thigh_R:'pelvis',
  knee_L:'muscles_bones',knee_R:'muscles_bones',
  hand_L:'muscles_bones',hand_R:'muscles_bones',
  foot_L:'muscles_bones',foot_R:'muscles_bones',
  shin_L:'muscles_bones',shin_R:'muscles_bones',
  skin:'body_holo', thyroid:'spine',
  arm_L:'muscles_bones',arm_R:'muscles_bones',
};


export default Dashboard;
