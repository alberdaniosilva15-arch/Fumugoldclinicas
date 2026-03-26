// FumuGold — Screen: Pacientes
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Pacientes() {
  const {patients,setPatients,prescriptions,labResults,viewPatient3D,addNotification} = useClinic();
  const [sel,setSel]=useState(null);
  const [ptab,setPtab]=useState('info');
  const [noteVal,setNoteVal]=useState('');
  const [vfc,setVfc]=useState('');
  const [vspo2,setVspo2]=useState('');
  const [vpa,setVpa]=useState('');
  const [vtemp,setVtemp]=useState('');
  const [nextAlarm,setNextAlarm]=useState(null);
  const [alarmH,setAlarmH]=useState(2);
  const [search,setSearch]=useState('');
  const [modalOpen,setModalOpen]=useState(false);
  const [form,setForm]=useState({nome:'',idade:'',genero:'M',sangue:'A+',bairro:'',seguro:'',num_seg:'',email:'',num:'',alergia:'',diag:'',diagKey:'',obs:'',peso:'',altura:'',pa:'',fc:'',spo2:'',temp:''});
  const [diagSearch,setDiagSearch]=useState('');
  const [diagSugs,setDiagSugs]=useState([]);

  const P=sel?patients.find(p=>p.id===sel):null;
  const alarmKey = sel?('vital_alarm_'+sel):null;

  useEffect(()=>{
    setNoteVal(P?.obs||'');
    setVfc(P?.fc>0?String(P.fc):'');
    setVspo2(P?.spo2>0?String(P.spo2):'');
    setVpa(P?.pa?String(P.pa):'');
    setVtemp(P?.temp?String(P.temp):'');

    if(!alarmKey){
      setNextAlarm(null);
      return;
    }
    try{
      const raw=localStorage.getItem(alarmKey);
      setNextAlarm(raw?parseInt(raw):null);
    }catch(_){
      setNextAlarm(null);
    }
  },[P?.id,alarmKey]);

  useEffect(()=>{
    if(!nextAlarm||!alarmKey||!P?.nome) return;
    const check=setInterval(()=>{
      if(Date.now()>=nextAlarm){
        addNotification('warn','Atualizar sinais vitais de '+P.nome);
        try{localStorage.removeItem(alarmKey);}catch{}
        setNextAlarm(null);
      }
    },30000);
    return()=>clearInterval(check);
  },[nextAlarm,alarmKey,P,addNotification]);
  const statusCol={Activo:G.green,Atenção:G.amber,'Em Tratamento':G.purple,Serviço:G.blue,'Alta Provisória':G.gold,'Alta Completa':G.gold};
  const filtered = patients.filter(p=>
    p.nome.toLowerCase().includes(search.toLowerCase())||
    (p.diag||'').toLowerCase().includes(search.toLowerCase())
  );

  // Diagnóstico search
  useEffect(()=>{
    if(diagSearch.length<2){setDiagSugs([]);return;}
    const q=diagSearch.toLowerCase();
    setDiagSugs(Object.entries(DISEASES).filter(([k,d])=>
      d.label.toLowerCase().includes(q)||d.cat.toLowerCase().includes(q)
    ).slice(0,8));
  },[diagSearch]);

  const addFile = (file) => setPatients(prev=>prev.map(p=>p.id===sel?{...p,files:[...p.files,file]}:p));
  const removeFile = (fileId) => setPatients(prev=>prev.map(p=>p.id===sel?{...p,files:p.files.filter(f=>f.id!==fileId)}:p));

  const savePatient = () => {
    if(!form.nome.trim()) return;
    setPatients(p=>[...p,{
      ...form,
      id:Date.now(),
      tipo:'Paciente',
      status:'Activo',
      consultas:0,
      ultima:new Date().toLocaleDateString('pt-PT'),
      proxima:'—',
      compras:[],
      files:[],
      fc:parseInt(form.fc)||0,
      spo2:parseInt(form.spo2)||0,
      initials:form.nome.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      cor:['#D4AF37','#FF8C00','#00AAFF','#AA55FF','#FF5555','#00CC88','#FFD700','#FF9944'][
        Math.floor(Math.random()*8)
      ]
    }]);
    setModalOpen(false);
    setForm({nome:'',idade:'',genero:'M',sangue:'A+',bairro:'',seguro:'',num_seg:'',email:'',num:'',alergia:'',diag:'',diagKey:'',obs:'',peso:'',altura:'',pa:'',fc:'',spo2:'',temp:''});
  };

  const PTABS=[{id:'info',label:'INFO'},{id:'clinico',label:'CLÍNICO'},
               {id:'ficheiros',label:'FICHEIROS'},
               {id:'historico',label:'HISTÓRICO'},{id:'vitais',label:'VITAIS'}];

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      {/* List */}
      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        <Panel style={{padding:12}}>
          <SectionHeader title={`PACIENTES (${filtered.length})`} action={()=>setModalOpen(true)} actionLabel="NOVO"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Pesquisar por nome ou diagnóstico..."
            style={{width:'100%',background:'rgba(212,175,55,0.05)',border:`1px solid ${G.border}`,
              borderRadius:2,padding:'7px 9px',color:G.text,fontFamily:'Rajdhani',fontSize:12}}/>
        </Panel>
        <Panel style={{flex:1,overflow:'auto'}}>
          {patients.length===0?(
            <div style={{padding:20,textAlign:'center'}}>
              <div style={{fontSize:28,opacity:0.15,marginBottom:10}}>◈</div>
              <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,lineHeight:1.6}}>
                Sem pacientes registados.<br/>Clique <b style={{color:G.gold}}>+ NOVO</b> para adicionar.
              </div>
            </div>
          ):filtered.map((p,i)=>(
            <div key={p.id} onClick={()=>{setSel(p.id);setPtab('info');}}
              style={{display:'flex',gap:8,alignItems:'center',padding:'10px 12px',cursor:'pointer',
                background:sel===p.id?`${p.cor}09`:'transparent',
                borderLeft:sel===p.id?`2px solid ${p.cor}`:'2px solid transparent',
                borderBottom:`1px solid ${G.border}15`,transition:'all 0.15s',
                animation:`fadeUp ${0.15+i*0.04}s ease`}}>
              <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,
                background:`${p.cor}18`,border:`1.5px solid ${p.cor}55`,
                overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'Cinzel',fontSize:12,fontWeight:700,color:p.cor}}>
                {p.avatar?<img src={p.avatar} alt={p.initials} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:p.initials}
              </div>
              <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontFamily:'Rajdhani',fontSize:12,fontWeight:600,color:G.text,
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nome}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
                  <span style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>
                    {p.idade>0?`${p.idade}a · ${p.tipo}`:p.tipo}
                  </span>
                  <Badge text={p.status} col={statusCol[p.status]||G.gold} small/>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      {/* Detail */}
      {P?(
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,overflow:'hidden'}}>
          {/* Header */}
          <Panel style={{padding:'14px 18px'}}>
            <div style={{display:'flex',gap:14,alignItems:'center'}}>
              <div style={{width:58,height:58,borderRadius:'50%',flexShrink:0,
                background:`${P.cor}18`,border:`2.5px solid ${P.cor}`,
                overflow:'hidden',cursor:'pointer',position:'relative'}}
                onClick={()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPatients(prev=>prev.map(p=>p.id===sel?{...p,avatar:ev.target.result}:p));r.readAsDataURL(f);};input.click();}}
                title="Clique para alterar foto">
                {P.avatar?(
                  <img src={P.avatar} alt={P.nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                ):(
                  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'Cinzel',fontSize:22,fontWeight:700,color:P.cor}}>{P.initials}</div>
                )}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Cinzel',fontSize:15,color:G.text}}>{P.nome}</div>
                <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim,letterSpacing:1,marginTop:3}}>
                  {P.tipo.toUpperCase()} · {P.sangue!=='—'?`${P.sangue} · `:''}ID#{P.id.toString().padStart(4,'0')}
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {P.alergia!=='—'&&P.alergia&&(
                  <div style={{background:'rgba(255,37,37,0.08)',border:'1px solid rgba(255,37,37,0.3)',
                    borderRadius:2,padding:'4px 8px'}}>
                    <span style={{fontFamily:'Orbitron',fontSize:7,color:G.red}}>⚠ ALERGIA: </span>
                    <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text}}>{P.alergia}</span>
                  </div>
                )}
                <button onClick={()=>{
                    const pwd=prompt('Senha de confirmação para apagar o paciente:');
                    if(pwd==='fumugold2025'){
                      if(confirm(`Confirma apagamento permanente de ${P.nome}?`)){
                        setPatients(prev=>prev.filter(p=>p.id!==sel));
                        setSel(null);
                      }
                    } else if(pwd!==null){
                      alert('Senha incorrecta.');
                    }
                  }}
                  style={{padding:'5px 10px',fontFamily:'Orbitron',fontSize:7,letterSpacing:1,
                    background:'rgba(255,37,37,0.08)',border:'1px solid rgba(255,37,37,0.3)',color:G.red,
                    borderRadius:2,cursor:'pointer'}} title="Apagar paciente">
                  🗑 APAGAR
                </button>
                {P.diagKey&&DISEASES[P.diagKey]&&(
                  <button onClick={()=>viewPatient3D(P)}
                    style={{padding:'5px 12px',fontFamily:'Orbitron',fontSize:7,letterSpacing:1,
                      background:`${G.gold}12`,border:`1px solid ${G.gold}55`,color:G.gold,
                      borderRadius:2,cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${G.gold}25`}
                    onMouseLeave={e=>e.currentTarget.style.background=`${G.gold}12`}>
                    ⬡ VER 3D
                  </button>
                )}
                <Badge text={P.status} col={statusCol[P.status]||G.gold}/>
              </div>
            </div>
          </Panel>

          {/* Sub-tabs */}
          <div style={{display:'flex',gap:4}}>
            {PTABS.map(t=>(
              <button key={t.id} onClick={()=>setPtab(t.id)}
                style={{padding:'5px 14px',fontFamily:'Orbitron',fontSize:7,letterSpacing:1.5,
                  background:ptab===t.id?`${G.gold}14`:'transparent',
                  border:`1px solid ${ptab===t.id?G.gold:G.border}`,
                  color:ptab===t.id?G.gold:G.dim,borderRadius:1,
                  ...(t.id==='ficheiros'&&P.files&&P.files.length>0?{borderColor:G.teal,color:ptab===t.id?G.teal:G.dim}:{})}}>
                {t.label} {t.id==='ficheiros'&&P.files&&P.files.length>0?`(${P.files.length})`:''}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflow:'auto'}}>
            {ptab==='info'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Panel style={{padding:14}}>
                  <SectionHeader title="DADOS PESSOAIS"/>
                  {[['Nome',P.nome],['Idade',`${P.idade} anos`],['Género',P.genero==='F'?'Feminino':'Masculino'],
                    ['Grupo Sangue',P.sangue],['Bairro',P.bairro],['Telefone',P.num],['Email',P.email]
                  ].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,textAlign:'right',maxWidth:'60%'}}>{v}</span>
                    </div>
                  ))}
                </Panel>
                <Panel style={{padding:14}}>
                  <SectionHeader title="SEGURO & COBERTURA"/>
                  {[['Seguradora',P.seguro],['Nº Apólice',P.num_seg],
                    ['Peso',P.peso!=='—'?`${P.peso} kg`:'—'],['Altura',P.altura!=='—'?`${P.altura} cm`:'—'],
                    ['IMC',P.peso!=='—'&&P.altura!=='—'?`${(parseFloat(P.peso)/Math.pow(parseFloat(P.altura)/100,2)).toFixed(1)} kg/m²`:'—'],
                  ].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text}}>{v}</span>
                    </div>
                  ))}
                  <div style={{marginTop:10,padding:8,background:'rgba(212,175,55,0.04)',borderRadius:2,
                    fontFamily:'Rajdhani',fontSize:11,color:G.dim,lineHeight:1.5}}>{P.obs}</div>
                </Panel>
                <Panel style={{padding:14,gridColumn:'1/-1'}}>
                  <SectionHeader title="PRESCRIÇÕES ACTIVAS"/>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {prescriptions.filter(rx=>rx.patient===P.nome&&rx.status==='Activa').map((rx,i)=>(
                      <div key={i} style={{background:'rgba(212,175,55,0.06)',border:`1px solid ${G.border}`,
                        borderRadius:2,padding:'6px 10px'}}>
                        <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{rx.med}</div>
                        <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,marginTop:2}}>{rx.dose} · {rx.via}</div>
                      </div>
                    ))}
                    {prescriptions.filter(rx=>rx.patient===P.nome).length===0&&(
                      <span style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim}}>Sem prescrições activas</span>
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {ptab==='clinico'&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Panel style={{padding:14}}>
                  <SectionHeader title="DIAGNÓSTICO & CONSULTAS"/>
                  {[['Diagnóstico Principal',P.diag],['Última Consulta',P.ultima],
                    ['Próxima Consulta',P.proxima],[`Nº Consultas`,`${P.consultas} registadas`]
                  ].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}15`}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,textAlign:'right',maxWidth:'60%',lineHeight:1.3}}>{v}</span>
                    </div>
                  ))}
                </Panel>
                <Panel style={{padding:14}}>
                  <SectionHeader title="ÚLTIMOS RESULTADOS"/>
                  {labResults.filter(r=>r.patient===P.nome).slice(0,2).map((r,i)=>(
                    <div key={i} style={{padding:'8px 0',borderBottom:`1px solid ${G.border}15`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{r.exam}</span>
                        <Badge text={r.alert?'⚠ ALERTA':'Normal'} col={r.alert?G.red:G.green} small/>
                      </div>
                      <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>{r.date}</div>
                    </div>
                  ))}
                  {labResults.filter(r=>r.patient===P.nome).length===0&&(
                    <span style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim}}>Sem resultados</span>
                  )}
                </Panel>
                <Panel style={{padding:14,gridColumn:'1/-1'}}>
                  <SectionHeader title="NOTAS CLÍNICAS"/>
                  <>
                    <textarea value={noteVal} onChange={e=>setNoteVal(e.target.value)} rows={5}
                      style={{width:'100%',background:'rgba(212,175,55,0.04)',border:`1px solid ${G.border}`,
                        borderRadius:2,padding:10,color:G.text,fontFamily:'Rajdhani',fontSize:12,
                        lineHeight:1.6,resize:'vertical',marginBottom:8}}/>
                    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                      <button onClick={()=>setPatients(prev=>prev.map(p=>p.id===sel?{...p,obs:noteVal}:p))}
                        style={{fontFamily:'Orbitron',fontSize:7,padding:'6px 16px',background:`${G.gold}18`,
                          border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1,cursor:'pointer'}}>
                        GUARDAR NOTAS
                      </button>
                    </div>
                  </>
                </Panel>
              </div>
            )}

            {ptab==='ficheiros'&&(
              <Panel style={{padding:14}}>
                <SectionHeader title="FICHEIROS DO PACIENTE"/>
                <div style={{marginBottom:10,fontFamily:'Rajdhani',fontSize:12,color:G.dim,lineHeight:1.6}}>
                  Carregue imagens, PDFs, resultados de exames, RX, TAC e outros documentos clínicos.
                </div>
                <FileUploader
                  files={P.files||[]}
                  onAdd={addFile}
                  onRemove={removeFile}
                />
              </Panel>
            )}

            {ptab==='historico'&&(
              <Panel style={{padding:14}}>
                <SectionHeader title="HISTÓRICO CLÍNICO"/>
                <div style={{position:'relative',paddingLeft:20}}>
                  <div style={{position:'absolute',left:6,top:0,bottom:0,width:1,background:G.border}}/>
                  {[
                    {date:P.ultima,title:'Última consulta — '+P.diag,desc:P.obs,col:G.gold},
                    {date:'15/01/2025',title:'Análises laboratoriais',desc:'Resultados dentro dos parâmetros de controlo esperados.',col:G.teal},
                    {date:'10/12/2024',title:'Consulta de rotina',desc:'Avaliação de resposta terapêutica. Sem intercorrências.',col:G.green},
                    {date:'05/11/2024',title:'Prescrição renovada',desc:`Renovação de medicação crónica por ${P.consultas} meses.`,col:G.amber},
                  ].map((ev,i)=>(
                    <div key={i} style={{position:'relative',paddingBottom:16,paddingLeft:16,
                      animation:`fadeUp ${0.2+i*0.08}s ease`}}>
                      <div style={{position:'absolute',left:-2,top:3,width:9,height:9,borderRadius:'50%',
                        background:ev.col,boxShadow:`0 0 6px ${ev.col}`,zIndex:1}}/>
                      <div style={{fontFamily:'Orbitron',fontSize:8,color:ev.col,marginBottom:3}}>{ev.date}</div>
                      <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600,marginBottom:4}}>{ev.title}</div>
                      <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,lineHeight:1.5}}>{ev.desc}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {ptab==='vitais'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {P.fc>0?(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                    {[['Frequência Cardíaca',`${P.fc} BPM`,G.green,'normal'],
                      ['SpO₂',`${P.spo2}%`,P.spo2>=95?G.green:G.red,P.spo2>=95?'normal':'crítico'],
                      ['Pressão Arterial',P.pa||'—',G.amber,'reg.'],
                      ['Temperatura',P.temp?`${P.temp} °C`:'—',G.green,'normal'],
                    ].map(([l,v,c,s])=>(
                      <Panel key={l} style={{padding:16}}>
                        <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginBottom:6}}>{l}</div>
                        <div style={{fontFamily:'Orbitron',fontSize:26,fontWeight:700,color:c,lineHeight:1}}>{v}</div>
                        <div style={{marginTop:8}}><Badge text={s} col={c}/></div>
                        <div style={{marginTop:8}}><VitalWave color={c} amp={0.8} h={35}/></div>
                      </Panel>
                    ))}
                  </div>
                ):(
                  <Panel style={{padding:16}}>
                    <div style={{fontFamily:'Cinzel',fontSize:10,color:G.dim,marginBottom:12}}>ACTUALIZAR SINAIS VITAIS</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <FormRow label="FC (bpm)"><GInput type="number" value={vfc} onChange={e=>setVfc(e.target.value)} placeholder="72"/></FormRow>
                      <FormRow label="SpO2 (%)"><GInput type="number" value={vspo2} onChange={e=>setVspo2(e.target.value)} placeholder="98"/></FormRow>
                      <FormRow label="PA (mmHg)"><GInput value={vpa} onChange={e=>setVpa(e.target.value)} placeholder="120/80"/></FormRow>
                      <FormRow label="Temp C"><GInput value={vtemp} onChange={e=>setVtemp(e.target.value)} placeholder="36.5"/></FormRow>
                      <div style={{gridColumn:'1/-1',textAlign:'right'}}>
                        <button onClick={()=>{if(!vfc)return;setPatients(prev=>prev.map(p=>p.id===sel?{...p,fc:parseInt(vfc),spo2:parseInt(vspo2)||0,pa:vpa,temp:vtemp}:p));}}
                          style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1,cursor:'pointer'}}>
                          REGISTAR VITAIS
                        </button>
                      </div>
                    </div>
                  </Panel>
                )}
                {/* Vitals alarm */}
                <Panel style={{padding:14}}>
                  <div style={{fontFamily:'Cinzel',fontSize:9,color:G.gold,letterSpacing:2,marginBottom:10}}>⏰ ALARME DE ACTUALIZAÇÃO</div>
                  <>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>Proximo alarme em</span>
                      <GSelect value={alarmH} onChange={e=>setAlarmH(parseInt(e.target.value)||2)} options={[1,2,3,4,6,8,12,24].map(h=>({v:h,l:`${h}h`}))}/>
                      <button onClick={()=>{
                        const t=Date.now()+alarmH*3600000;
                        if(alarmKey){
                          try{localStorage.setItem(alarmKey,t);}catch{}
                        }
                        setNextAlarm(t);
                        addNotification('info','Alarme de vitais de '+P.nome+' em '+alarmH+'h');
                      }}
                        style={{fontFamily:'Orbitron',fontSize:7,padding:'5px 12px',background:`${G.teal}14`,
                          border:`1px solid ${G.teal}`,color:G.teal,borderRadius:1,cursor:'pointer'}}>
                        ACTIVAR
                      </button>
                    </div>
                    {nextAlarm&&<div style={{fontFamily:'Rajdhani',fontSize:11,color:G.green,padding:'6px 8px',background:`${G.green}08`,borderRadius:2}}>
                      Alarme as {new Date(nextAlarm).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}
                    </div>}
                  </>
                </Panel>
              </div>
            )}
          </div>
        </div>
      ):(
        <Panel style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',
          alignItems:'center',textAlign:'center',padding:20}}>
          <div style={{fontSize:40,opacity:0.1,marginBottom:14}}>◈</div>
          <div style={{fontFamily:'Cinzel',fontSize:11,color:G.dim,lineHeight:1.8}}>
            Seleccione um paciente para ver o perfil completo
          </div>
        </Panel>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="NOVO PACIENTE" width={560}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{gridColumn:'1/-1'}}>
            <FormRow label="Nome Completo *"><GInput value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome completo do paciente"/></FormRow>
          </div>
          <div>
            <FormRow label="Idade"><GInput type="number" value={form.idade} onChange={e=>setForm({...form,idade:e.target.value})} placeholder="Anos"/></FormRow>
          </div>
          <div>
            <FormRow label="Género"><GSelect value={form.genero} onChange={e=>setForm({...form,genero:e.target.value})} options={['M','F']}/></FormRow>
          </div>
          <div>
            <FormRow label="Grupo Sanguíneo"><GSelect value={form.sangue} onChange={e=>setForm({...form,sangue:e.target.value})} options={['A+','A-','B+','B-','AB+','AB-','O+','O-','?']}/></FormRow>
          </div>
          <div>
            <FormRow label="Telefone"><GInput value={form.num} onChange={e=>setForm({...form,num:e.target.value})} placeholder="+244 ..."/></FormRow>
          </div>
        </div>
        <FormRow label="Email"><GInput value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@..."/></FormRow>
        <FormRow label="Bairro / Município"><GInput value={form.bairro} onChange={e=>setForm({...form,bairro:e.target.value})} placeholder="Bairro, Luanda"/></FormRow>
        <FormRow label="Seguro / Número"><GInput value={form.seguro} onChange={e=>setForm({...form,seguro:e.target.value})} placeholder="ENSA, INSS, AAA..."/></FormRow>
        <FormRow label="Alergias"><GInput value={form.alergia} onChange={e=>setForm({...form,alergia:e.target.value})} placeholder="Penicilina, AINEs... (ou deixar vazio)"/></FormRow>

        {/* Diagnosis with searchable disease list */}
        <FormRow label="Diagnóstico Principal">
          <div style={{position:'relative'}}>
            <input value={diagSearch||form.diag} onChange={e=>{setDiagSearch(e.target.value);setForm({...form,diag:e.target.value,diagKey:''});}}
              placeholder="Pesquisar diagnóstico (ex: malária, diabetes...)"
              style={{width:'100%',background:'rgba(212,175,55,0.05)',border:`1px solid ${G.border}`,
                borderRadius:2,padding:'7px 9px',color:G.text,fontFamily:'Rajdhani',fontSize:12}}/>
            {diagSugs.length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#0D0900',
                border:`1px solid ${G.border}`,zIndex:300,maxHeight:180,overflowY:'auto',
                boxShadow:'0 8px 24px rgba(0,0,0,0.9)'}}>
                {diagSugs.map(([k,d])=>(
                  <div key={k} onMouseDown={()=>{
                    setForm({...form,diag:d.label,diagKey:k});
                    setDiagSearch(d.label);
                    setDiagSugs([]);
                  }}
                    style={{padding:'7px 10px',cursor:'pointer',borderBottom:`1px solid ${G.border}15`,
                      display:'flex',alignItems:'center',gap:8}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.1)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:d.sevC,flexShrink:0}}/>
                    <div>
                      <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text}}>{d.label}</div>
                      <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>{d.cat}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormRow>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginTop:4}}>
          <FormRow label="PA (mmHg)"><GInput value={form.pa} onChange={e=>setForm({...form,pa:e.target.value})} placeholder="120/80"/></FormRow>
          <FormRow label="FC (bpm)"><GInput type="number" value={form.fc} onChange={e=>setForm({...form,fc:e.target.value})} placeholder="72"/></FormRow>
          <FormRow label="SpO₂ (%)"><GInput type="number" value={form.spo2} onChange={e=>setForm({...form,spo2:e.target.value})} placeholder="98"/></FormRow>
          <FormRow label="Temp °C"><GInput value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})} placeholder="36.5"/></FormRow>
        </div>

        <FormRow label="Observações Clínicas">
          <textarea value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} rows={3}
            placeholder="Observações, história clínica, notas..."
            style={{width:'100%',background:'rgba(212,175,55,0.05)',border:`1px solid ${G.border}`,
              borderRadius:2,padding:'7px 9px',color:G.text,fontFamily:'Rajdhani',fontSize:12,
              resize:'vertical',minHeight:56}}/>
        </FormRow>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button onClick={()=>{setModalOpen(false);setDiagSugs([]);}}
            style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',
              border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
          <button onClick={savePatient} disabled={!form.nome.trim()}
            style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,
              border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1,
              opacity:form.nome.trim()?1:0.4}}>◈ REGISTAR PACIENTE</button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESCRIÇÕES
═══════════════════════════════════════════════════════════ */

export default Pacientes;
