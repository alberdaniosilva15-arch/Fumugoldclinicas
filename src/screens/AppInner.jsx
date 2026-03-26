// FumuGold — AppInner (navegação principal)
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useClinic } from '../context/ClinicContext.jsx';
import useThreeJS from '../hooks/useThreeJS.js';
import { G } from '../theme.js';
import Dashboard from './Dashboard.jsx';
import Holografia from './Holografia.jsx';
import IAAssistente from './IAAssistente.jsx';
import Agendamento from './Agendamento.jsx';
import Pacientes from './Pacientes.jsx';
import Prescricoes from './Prescricoes.jsx';
import Laboratorio from './Laboratorio.jsx';
import Financeiro from './Financeiro.jsx';
import Internamento from './Internamento.jsx';
import RecursosHumanos from './RecursosHumanos.jsx';
import Analytics from './Analytics.jsx';
import Comunicacao from './Comunicacao.jsx';
import BlocoOperatorio from './BlocoOperatorio.jsx';
import Configuracoes from './Configuracoes.jsx';

function AppInner({tab, setTab, threeRef, session, onLogout}) {
  const [sideOpen,setSideOpen]=useState(true);
  const [time,setTime]=useState(new Date());
  const [notifOpen,setNotifOpen]=useState(false);
  const [globalQuery,setGlobalQuery]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [uiScale,setUiScale]=useState(1.08);
  const cleanupRef=useRef(null);

  const {notifications,patients,appointments,messages} = useClinic();

  useEffect(()=>{
    (async()=>{
      try{
        const r = await window.storage.get('clinic_ui_scale');
        const n = Number(r?.value);
        if(!Number.isNaN(n) && n>=0.95 && n<=1.3) setUiScale(n);
      }catch(_){ }
    })();
  },[]);

  const changeUiScale = (next)=>{
    const n = Math.max(0.95,Math.min(1.3,Number(next)||1.08));
    setUiScale(n);
    try{ window.storage.set('clinic_ui_scale', String(n)); }catch(_){ }
  };

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);
  useThreeJS(threeRef,cleanupRef);

  // Force canvas resize whenever we switch TO holografia tab
  useEffect(()=>{
    if(tab==='holografia'){
      const t1=setTimeout(()=>threeRef.current?.resize?.(),80);
      const t2=setTimeout(()=>threeRef.current?.resize?.(),350);
      return()=>{clearTimeout(t1);clearTimeout(t2);};
    }
  },[tab]);

  const unreadCount = notifications.filter(n=>!n.read).length;

  const searchHits = useMemo(()=>{
    const q = globalQuery.trim().toLowerCase();
    if(!q) return [];

    const pHits = patients
      .filter(p=>`${p.nome||''} ${p.diag||''}`.toLowerCase().includes(q))
      .slice(0,4)
      .map(p=>({id:`p-${p.id}`,title:p.nome||'Paciente',sub:p.diag||'Prontuário',tab:'pacientes'}));

    const aHits = appointments
      .filter(a=>`${a.patient||''} ${a.doctor||''} ${a.specialty||''}`.toLowerCase().includes(q))
      .slice(0,4)
      .map((a,i)=>({id:`a-${i}-${a.time||''}`,title:a.patient||'Consulta',sub:`${a.time||'--:--'} · ${a.specialty||'Agenda'}`,tab:'agendamento'}));

    const mHits = messages
      .filter(m=>`${m.from||''} ${m.msg||''}`.toLowerCase().includes(q))
      .slice(0,4)
      .map((m,i)=>({id:`m-${i}-${m.id||''}`,title:m.from||'Mensagem',sub:m.msg||'Canal interno',tab:'comunicacao'}));

    return [...pHits,...aHits,...mHits].slice(0,8);
  },[appointments,globalQuery,messages,patients]);

  const selectSearchHit = (hit) => {
    setTab(hit.tab);
    setGlobalQuery('');
    setSearchOpen(false);
  };

  const NAV = [
    {id:'dashboard',label:'Dashboard',ic:'◇',group:'main'},
    {id:'holografia',label:'Holografia 3D',ic:'⬡',group:'main'},
    {id:'agendamento',label:'Agendamento',ic:'📅',group:'clinico'},
    {id:'pacientes',label:'Pacientes',ic:'◈',group:'clinico'},
    {id:'prescricoes',label:'Prescrições',ic:'💊',group:'clinico'},
    {id:'laboratorio',label:'Laboratório',ic:'🔬',group:'clinico'},
    {id:'financeiro',label:'Financeiro',ic:'💰',group:'gestao'},
    {id:'internamento',label:'Internamento',ic:'🏥',group:'gestao'},
    {id:'rh',label:'Recursos Humanos',ic:'👔',group:'gestao'},
    {id:'analytics',label:'Analytics & BI',ic:'📈',group:'relatorios'},
    {id:'comunicacao',label:'Comunicação',ic:'💬',group:'relatorios'},
    {id:'bloco',label:'Bloco Operatório',ic:'🔪',group:'advanced'},
    {id:'configuracoes',label:'Configurações',ic:'⚙',group:'advanced'},
    {id:'ia',label:'ARIA · IA Clínica',ic:'🤖',group:'advanced'},
  ];

  const groups = {
    main:'PRINCIPAL',
    clinico:'CLÍNICO',
    gestao:'GESTÃO',
    relatorios:'RELATÓRIOS',
    advanced:'AVANÇADO'
  };

  const W = sideOpen ? 185 : 54;

  const renderTab = () => {
    switch(tab) {
      case 'dashboard': return <Dashboard setTab={setTab}/>;
      case 'holografia': return <Holografia threeRef={threeRef}/>;
      case 'agendamento': return <Agendamento/>;
      case 'pacientes': return <Pacientes/>;
      case 'prescricoes': return <Prescricoes/>;
      case 'laboratorio': return <Laboratorio/>;
      case 'financeiro': return <Financeiro/>;
      case 'internamento': return <Internamento/>;
      case 'rh': return <RecursosHumanos/>;
      case 'analytics': return <Analytics/>;
      case 'comunicacao': return <Comunicacao/>;
      case 'bloco': return <BlocoOperatorio/>;
      case 'configuracoes': return <Configuracoes/>;
      case 'ia': return <IAAssistente kpis={null}/>;
      default: return <Dashboard setTab={setTab}/>;
    }
  };

  // Keep 3D canvas alive
  const show3D = tab==='holografia';

  let prevGroup = null;

  return(
    <div style={{width:'100%',height:'100vh',background:G.bg,color:G.text,
      fontFamily:'Rajdhani,sans-serif',display:'flex',flexDirection:'column',overflow:'hidden',zoom:uiScale}}>
      <style>{STYLE}</style>

      {/* HEADER */}
      <header style={{height:50,background:`linear-gradient(90deg,#060400,#0C0800,#060400)`,
        borderBottom:`1px solid ${G.border}`,display:'flex',alignItems:'center',
        padding:'0 14px',gap:12,flexShrink:0,position:'relative',zIndex:100}}>
        <button onClick={()=>setSideOpen(o=>!o)}
          style={{background:'none',color:G.dim,fontSize:14,padding:'4px 6px',
            borderRadius:2,transition:'color 0.2s'}}
          onMouseEnter={e=>e.target.style.color=G.gold}
          onMouseLeave={e=>e.target.style.color=G.dim}>☰</button>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <svg width="30" height="30" viewBox="0 0 36 36">
            <polygon points="18,1 35,9.5 35,26.5 18,35 1,26.5 1,9.5" fill="none" stroke="#D4AF37" strokeWidth="1.5"/>
            <polygon points="18,7 30,13 30,23 18,29 6,23 6,13" fill="#D4AF3708" stroke="#F5D060" strokeWidth="0.8"/>
            <text x="18" y="23" textAnchor="middle" fill="#F5D060" fontSize="9" fontFamily="Cinzel" fontWeight="900">F</text>
          </svg>
          <div>
            <div className="shimmer" style={{fontFamily:'Cinzel',fontSize:14,fontWeight:700,letterSpacing:3}}>FUMUGOLD</div>
            <div style={{fontFamily:'Orbitron',fontSize:5.5,color:G.dim,letterSpacing:2.5,marginTop:-1}}>SISTEMA MÉDICO INTEGRADO</div>
          </div>
        </div>

        <div style={{width:1,height:24,background:G.border,margin:'0 4px'}}/>

        {/* Breadcrumb */}
        <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim,letterSpacing:1}}>
          {NAV.find(n=>n.id===tab)?.label||'Dashboard'}
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:12,alignItems:'center'}}>
                    {/* Global search */}
          <div style={{position:'relative'}}>
            <input value={globalQuery} onChange={e=>{setGlobalQuery(e.target.value);setSearchOpen(true);}}
              onFocus={()=>setSearchOpen(true)}
              onBlur={()=>setTimeout(()=>setSearchOpen(false),140)}
              placeholder="Pesquisar paciente, agenda ou mensagem..."
              style={{background:'rgba(212,175,55,0.05)',border:`1px solid ${G.border}`,
                borderRadius:2,padding:'5px 10px',color:G.text,
                fontFamily:'Rajdhani',fontSize:11,width:210}}/>
            {searchOpen && globalQuery.trim() && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,
                background:'#0A0700',border:`1px solid ${G.border}`,borderRadius:2,
                boxShadow:'0 8px 24px rgba(0,0,0,0.75)',zIndex:220,maxHeight:240,overflowY:'auto'}}>
                {searchHits.length===0 ? (
                  <div style={{padding:'10px 12px',fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>Sem resultados.</div>
                ) : searchHits.map(hit=>(
                  <button key={hit.id} onMouseDown={()=>selectSearchHit(hit)}
                    style={{width:'100%',textAlign:'left',padding:'9px 12px',background:'transparent',
                      border:'none',borderBottom:`1px solid ${G.border}15`,cursor:'pointer'}}>
                    <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{hit.title}</div>
                    <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{hit.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{fontFamily:'Orbitron',fontSize:10,color:G.dim,letterSpacing:1}}>
            {time.toLocaleTimeString('pt-PT')}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:6,border:'1px solid '+G.border,borderRadius:12,padding:'3px 6px'}}>
            <button onClick={()=>changeUiScale(uiScale-0.04)} style={{background:'none',color:G.dim,fontFamily:'Orbitron',fontSize:8,padding:'0 4px'}}>A-</button>
            <span style={{fontFamily:'Orbitron',fontSize:8,color:G.gold,minWidth:36,textAlign:'center'}}>{Math.round(uiScale*100)}%</span>
            <button onClick={()=>changeUiScale(uiScale+0.04)} style={{background:'none',color:G.dim,fontFamily:'Orbitron',fontSize:8,padding:'0 4px'}}>A+</button>
          </div>

          {/* Notifications bell */}
          <div style={{position:'relative'}}>
            <button onClick={()=>setNotifOpen(o=>!o)}
              style={{background:'none',fontSize:14,position:'relative',padding:'2px 4px',color:G.dim,
                transition:'color 0.2s'}}
              onMouseEnter={e=>e.target.style.color=G.gold}
              onMouseLeave={e=>e.target.style.color=notifOpen?G.gold:G.dim}>
              🔔
            </button>
            {unreadCount>0&&(
              <div style={{position:'absolute',top:-2,right:-2,width:14,height:14,borderRadius:'50%',
                background:G.red,display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'Orbitron',fontSize:7,color:'white',animation:'blink 2s ease-in-out infinite'}}>
                {unreadCount}
              </div>
            )}
            {notifOpen&&(
              <div style={{position:'absolute',top:'100%',right:0,width:280,background:'#0A0700',
                border:`1px solid ${G.border}`,borderRadius:2,zIndex:200,marginTop:4,
                boxShadow:'0 8px 32px rgba(0,0,0,0.8)',animation:'fadeUp 0.2s ease'}}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${G.border}`,
                  fontFamily:'Cinzel',fontSize:9,color:G.gold,letterSpacing:2}}>⬡ NOTIFICAÇÕES</div>
                {notifications.map((n,i)=>{
                  const c=n.type==='crit'?G.red:n.type==='warn'?G.amber:n.type==='ok'?G.green:G.teal;
                  return(
                    <div key={i} style={{padding:'10px 14px',borderBottom:`1px solid ${G.border}15`,
                      opacity:n.read?0.5:1}}>
                      <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,lineHeight:1.4}}>{n.msg}</div>
                      <div style={{fontFamily:'Orbitron',fontSize:7,color:c,marginTop:3}}>{n.time}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:G.green,
              boxShadow:`0 0 8px ${G.green}`,animation:'blink 3s ease-in-out infinite'}}/>
            <span style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,letterSpacing:1}}>ONLINE</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,
            background:'rgba(212,175,55,0.06)',border:`1px solid ${G.border}`,
            borderRadius:20,padding:'4px 10px 4px 6px',cursor:'default'}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:`${G.gold}18`,
              border:`1.5px solid ${G.gold}66`,display:'flex',alignItems:'center',
              justifyContent:'center',fontFamily:'Cinzel',fontSize:9,color:G.gold,
              boxShadow:`0 0 10px ${G.gold}22`}}>
              {session?.nome?session.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'DR'}
            </div>
            <div>
              <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,fontWeight:600,lineHeight:1}}>
                {session?.nome?.split(' ')[0]||'Admin'}
              </div>
              <div style={{fontFamily:'Orbitron',fontSize:6,color:G.dim,letterSpacing:1}}>{session?.role?.toUpperCase()||'ADMIN'}</div>
            </div>
          </div>
          <button onClick={onLogout}
            style={{fontFamily:'Orbitron',fontSize:7,padding:'5px 10px',
              background:'transparent',border:`1px solid ${G.red}44`,color:`${G.red}88`,
              borderRadius:2,letterSpacing:1,transition:'all 0.2s'}}
            onMouseEnter={e=>{e.target.style.background=`${G.red}12`;e.target.style.color=G.red;e.target.style.borderColor=G.red;}}
            onMouseLeave={e=>{e.target.style.background='transparent';e.target.style.color=`${G.red}88`;e.target.style.borderColor=`${G.red}44`;}}>
            SAIR ⏻
          </button>
        </div>
      </header>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* SIDEBAR */}
        <nav style={{width:W,flexShrink:0,background:`linear-gradient(180deg,#060400,#040200)`,
          borderRight:`1px solid ${G.border}`,overflowY:'auto',overflowX:'hidden',
          transition:'width 0.2s',position:'relative',zIndex:50}}>
          {NAV.map((item,i)=>{
            const showGroup = sideOpen && item.group !== prevGroup;
            prevGroup = item.group;
            return(
              <div key={item.id}>
                {showGroup&&(
                  <div style={{padding:'12px 12px 4px',fontFamily:'Orbitron',fontSize:6,
                    color:`${G.gold}44`,letterSpacing:2,whiteSpace:'nowrap',
                    overflow:'hidden',borderTop:i>0?`1px solid ${G.border}15`:undefined}}>
                    {groups[item.group]}
                  </div>
                )}
                <button onClick={()=>setTab(item.id)}
                  style={{width:'100%',display:'flex',alignItems:'center',
                    gap:sideOpen?10:0,padding:sideOpen?'9px 14px':'9px 0',
                    justifyContent:sideOpen?'flex-start':'center',
                    background:tab===item.id?`${G.gold}10`:'transparent',
                    borderLeft:tab===item.id?`2px solid ${G.gold}`:'2px solid transparent',
                    color:tab===item.id?G.gold:G.dim,transition:'all 0.15s',
                    textAlign:'left',whiteSpace:'nowrap',overflow:'hidden'}}>
                  <span style={{fontSize:13,flexShrink:0}}>{item.ic}</span>
                  {sideOpen&&<span style={{fontFamily:'Rajdhani',fontSize:12,fontWeight:600,
                    overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>}
                  {sideOpen&&tab===item.id&&<div style={{marginLeft:'auto',width:4,height:4,borderRadius:'50%',background:G.gold,flexShrink:0}}/>}
                </button>
              </div>
            );
          })}
          {/* Bottom info */}
          {sideOpen&&(
            <div style={{padding:'16px 12px',borderTop:`1px solid ${G.border}`,marginTop:8}}>
              <div style={{fontFamily:'Orbitron',fontSize:6,color:`${G.dim}77`,letterSpacing:2,marginBottom:4}}>FUMUGOLD v3.0</div>
              <div style={{fontFamily:'Rajdhani',fontSize:10,color:`${G.dim}55`}}>Luanda · Angola</div>
            </div>
          )}
        </nav>

        {/* CONTENT */}
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          {/* Holografia: always mounted, visibility toggled so canvas keeps its real size */}
          <div style={{position:'absolute',inset:0,
            visibility:show3D?'visible':'hidden',
            pointerEvents:show3D?'auto':'none',
            zIndex:show3D?2:0}}>
            <Holografia threeRef={threeRef}/>
          </div>

          {/* Other tabs */}
          {!show3D&&(
            <div style={{position:'absolute',inset:0,overflow:'hidden',zIndex:1}} className="fade-in">
              {renderTab()}
            </div>
          )}
        </div>
      </div>
    </div>

  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════════ */

export default AppInner;
