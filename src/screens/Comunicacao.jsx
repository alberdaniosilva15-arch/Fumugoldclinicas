// FumuGold — Screen: Comunicacao
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Comunicacao() {
  const {messages:msgs,setMessages:setMsgs,notifications,staff:STAFF,addNotification} = useClinic();
  const [input,setInput]=useState('');
  const [selChat,setSelChat]=useState(1);
  const [channelFilter,setChannelFilter]=useState('all');
  const [composeChannel,setComposeChannel]=useState('Interno');
  const [composeType,setComposeType]=useState('normal');
  const chatRef=useRef();

  const inferChannel = useCallback((m)=>{
    if(m.channel) return m.channel;
    const text = `${m.from||''} ${m.msg||''}`.toLowerCase();
    if(text.includes('whatsapp') || text.includes('+244') || text.includes('+55')) return 'WhatsApp';
    if((m.type||'')==='lab') return 'Laboratorio';
    if((m.type||'')==='agenda') return 'Agenda';
    return 'Interno';
  },[]);

  const normalized = useMemo(()=>(
    msgs.map((m,i)=>(
      {
        ...m,
        id: m.id || `${Date.now()}-${i}`,
        from: m.from || 'Sistema',
        msg: m.msg || 'Sem conteudo',
        initials: m.initials || 'SI',
        cor: m.cor || G.gold,
        time: m.time || '--:--',
        type: m.type || 'normal',
        channel: inferChannel(m),
        unread: !!m.unread,
      }
    ))
  ),[inferChannel,msgs]);

  const visibleMessages = useMemo(()=>(
    normalized.filter(m=>channelFilter==='all' ? true : m.channel===channelFilter)
  ),[channelFilter,normalized]);

  const unreadCount = normalized.filter(m=>m.unread).length;
  const whatsappQueue = normalized.filter(m=>m.channel==='WhatsApp').length;
  const criticalCount = normalized.filter(m=>m.type==='alerta').length;

  const send = () => {
    if(!input.trim()) return;
    setMsgs(prev=>[...prev,{id:Date.now(),from:'Dr. Admin',initials:'DA',cor:G.gold,
      msg:input.trim(),time:new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),
      unread:false,type:composeType,channel:composeChannel}]);
    setInput('');
    setTimeout(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},40);
  };

  const injectWhatsApp = () => {
    const pool = [
      'Ola, gostaria de remarcar a consulta de cardiologia.',
      'Tenho resultado de exame, posso enviar foto?',
      'Preciso de segunda via da receita, por favor.',
    ];
    const msg = pool[Math.floor(Math.random()*pool.length)];
    setMsgs(prev=>[...prev,{id:Date.now(),from:'+244 923 000 112',initials:'WA',cor:G.green,
      msg,time:new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),
      unread:true,type:'agenda',channel:'WhatsApp'}]);
    addNotification('info','Nova mensagem recebida via WhatsApp.');
  };

  const markAllRead = () => setMsgs(prev=>prev.map(m=>({...m,unread:false})));

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        <Panel style={{padding:12}}>
          <SectionHeader title="INBOX CRM" action={injectWhatsApp} actionLabel="SIMULAR WA"/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
            <div style={{padding:6,border:`1px solid ${G.border}`,borderRadius:2}}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>NAO LIDAS</div>
              <div style={{fontFamily:'Orbitron',fontSize:14,color:unreadCount>0?G.red:G.green}}>{unreadCount}</div>
            </div>
            <div style={{padding:6,border:`1px solid ${G.border}`,borderRadius:2}}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>WHATSAPP</div>
              <div style={{fontFamily:'Orbitron',fontSize:14,color:G.green}}>{whatsappQueue}</div>
            </div>
          </div>
        </Panel>

        <Panel style={{padding:10}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {[['all','TODOS'],['WhatsApp','WA'],['Interno','INTERNO'],['Agenda','AGENDA'],['Laboratorio','LAB']].map(([id,label])=>(
              <button key={id} onClick={()=>setChannelFilter(id)} style={{fontFamily:'Orbitron',fontSize:7,padding:'3px 8px',
                background:channelFilter===id?`${G.gold}18`:'transparent',border:`1px solid ${channelFilter===id?G.gold:G.border}`,
                color:channelFilter===id?G.gold:G.dim,borderRadius:1}}>{label}</button>
            ))}
          </div>
          <button onClick={markAllRead} style={{marginTop:8,width:'100%',fontFamily:'Orbitron',fontSize:7,padding:'5px 8px',
            background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:2}}>MARCAR TODAS COMO LIDAS</button>
        </Panel>

        <Panel style={{flex:1,overflow:'auto'}}>
          {STAFF.map((s,i)=>(
            <div key={i} onClick={()=>setSelChat(s.id)}
              style={{display:'flex',gap:8,alignItems:'center',padding:'10px 12px',cursor:'pointer',
                background:selChat===s.id?`${s.cor}09`:'transparent',
                borderLeft:selChat===s.id?`2px solid ${s.cor}`:'2px solid transparent',
                borderBottom:`1px solid ${G.border}15`}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:`${s.cor}18`,border:`1.5px solid ${s.cor}55`,
                display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel',fontSize:10,color:s.cor}}>{s.initials}</div>
              <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.nome}</div>
                <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>{s.cargo?.split('·')[0]||'Equipe'}</div>
              </div>
              <Dot col={s.status==='Serviço'||s.status==='Servico'||s.status==='ServiÃ§o'?G.green:G.amber}/>
            </div>
          ))}
        </Panel>
      </div>

      <Panel style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${G.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Cinzel',fontSize:10,color:G.gold,letterSpacing:2}}>CENTRAL OMNICHANNEL</div>
          <div style={{display:'flex',gap:6}}>
            <GSelect value={composeChannel} onChange={e=>setComposeChannel(e.target.value)} options={['Interno','WhatsApp','Agenda','Laboratorio']}/>
            <GSelect value={composeType} onChange={e=>setComposeType(e.target.value)} options={[{v:'normal',l:'Normal'},{v:'agenda',l:'Agenda'},{v:'lab',l:'Lab'},{v:'alerta',l:'Alerta'}]}/>
          </div>
        </div>

        <div ref={chatRef} style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column',gap:8}}>
          {visibleMessages.length===0 ? (
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,textAlign:'center',paddingTop:20}}>Sem mensagens para este filtro.</div>
          ) : visibleMessages.map((m,i)=>{
            const mine = m.from==='Dr. Admin';
            const typeCol={alerta:G.red,info:G.teal,agenda:G.gold,lab:G.amber,normal:G.dim};
            const chCol={WhatsApp:G.green,Interno:G.teal,Agenda:G.gold,Laboratorio:G.amber};
            return(
              <div key={`${m.id}-${i}`} style={{display:'flex',gap:8,flexDirection:mine?'row-reverse':'row'}}>
                <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:`${m.cor}18`,border:`1.5px solid ${m.cor}55`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel',fontSize:9,color:m.cor}}>{m.initials}</div>
                <div style={{maxWidth:'74%'}}>
                  <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,marginBottom:3,textAlign:mine?'right':'left'}}>{m.from} · {m.time}</div>
                  <div style={{background:mine?`${G.gold}12`:`${typeCol[m.type]||G.dim}08`,border:`1px solid ${mine?`${G.gold}33`:`${typeCol[m.type]||G.dim}22`}`,borderRadius:mine?'8px 2px 8px 8px':'2px 8px 8px 8px',padding:'8px 12px'}}>
                    <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,lineHeight:1.45}}>{m.msg}</div>
                    <div style={{display:'flex',gap:4,marginTop:5,flexWrap:'wrap'}}>
                      <Badge text={m.channel} col={chCol[m.channel]||G.dim} small/>
                      {m.type!=='normal'&&<Badge text={m.type.toUpperCase()} col={typeCol[m.type]||G.dim} small/>}
                      {m.unread&&<Badge text="NOVA" col={G.red} small pulse/>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{padding:'10px 14px',borderTop:`1px solid ${G.border}`,display:'flex',gap:8,alignItems:'center'}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Escrever mensagem operacional..."
            style={{flex:1,background:'rgba(212,175,55,0.05)',border:`1px solid ${G.border}`,borderRadius:2,padding:'8px 12px',color:G.text,fontFamily:'Rajdhani',fontSize:12}}/>
          <button onClick={send} style={{padding:'8px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}55`,color:G.gold,fontFamily:'Orbitron',fontSize:8,borderRadius:2,letterSpacing:1}}>ENVIAR</button>
        </div>
      </Panel>

      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        <Panel style={{padding:14}}>
          <SectionHeader title="SLA OPERACIONAL"/>
          {[['Fila WhatsApp',whatsappQueue,whatsappQueue>4?G.red:G.green],['Mensagens Criticas',criticalCount,criticalCount>0?G.red:G.amber],['Nao lidas',unreadCount,unreadCount>0?G.amber:G.green]].map(([l,v,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
              <span style={{fontFamily:'Orbitron',fontSize:10,color:c}}>{v}</span>
            </div>
          ))}
        </Panel>

        <Panel style={{padding:14,flex:1,overflow:'auto'}}>
          <SectionHeader title="NOTIFICACOES"/>
          {notifications.map((n,i)=>{
            const c=n.type==='crit'?G.red:n.type==='warn'?G.amber:n.type==='ok'?G.green:G.teal;
            return(
              <div key={i} style={{display:'flex',gap:8,padding:'8px 0',borderBottom:`1px solid ${G.border}15`,opacity:n.read?0.6:1}}>
                <div style={{width:3,background:c,flexShrink:0,borderRadius:2}}/>
                <div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,lineHeight:1.4}}>{n.msg}</div>
                  <div style={{fontFamily:'Orbitron',fontSize:7,color:c,marginTop:2}}>{n.time}</div>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   BLOCO OPERATÓRIO
═══════════════════════════════════════════════════════════ */

export default Comunicacao;
