// FumuGold — Screen: BlocoOperatorio
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function BlocoOperatorio() {
  const [sels,setSels]=useState(null);
  const [surgModal,setSurgModal]=useState(false);
  const [surgForm,setSurgForm]=useState({patient:'',proc:'',surgeon:'',date:new Date().toISOString().split('T')[0],time:'08:00',sala:'BO-1',anest:'Geral',duracao:'60 min'});
  const [checklist,setChecklist]=useState({consOk:false,jejumOk:false,anestOk:false,convOk:false,matOk:false,identOk:false,equipeOk:false,safetyOk:false});

  const stCol={Agendada:G.gold,Confirmada:G.green,'Em curso':G.red};
  const {surgeries:SURGERIES_DATA,setSurgeries,patients,staff} = useClinic();
  const S=sels?SURGERIES_DATA.find(s=>s.id===sels):null;
  const allChecked = Object.values(checklist).every(Boolean);

  const rooms = [
    {id:'BO-1',name:'Bloco Op. 1',status:SURGERIES_DATA.some(s=>s.sala==='BO-1'&&s.status==='Em curso')?'Em Uso':'Disponível',
      col:SURGERIES_DATA.some(s=>s.sala==='BO-1'&&s.status==='Em curso')?G.red:G.green},
    {id:'BO-2',name:'Bloco Op. 2',status:'Disponível',col:G.green},
    {id:'BO-3',name:'Bloco Op. 3',status:'Manutenção',col:G.amber},
  ];

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflow:'auto'}}>
        {/* Room status */}
        <div style={{display:'flex',gap:8}}>
          {rooms.map((r,i)=>(
            <Panel key={r.id} style={{flex:1,padding:14,border:`1px solid ${r.col}44`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontFamily:'Cinzel',fontSize:11,color:r.col}}>{r.name}</div>
                <Dot col={r.col} pulse={r.status==='Em Uso'}/>
              </div>
              <Badge text={r.status} col={r.col}/>
              {r.status==='Em Uso'&&<div style={{marginTop:6,fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>Intervenção em curso</div>}
            </Panel>
          ))}
        </div>

        {/* Surgeries list */}
        <Panel style={{padding:14}}>
          <SectionHeader title="AGENDA CIRÚRGICA" action={()=>setSurgModal(true)} actionLabel="+ MARCAR"/>
          {SURGERIES_DATA.map((s,i)=>(
            <div key={i} onClick={()=>setSels(sels===s.id?null:s.id)}
              style={{display:'flex',gap:12,alignItems:'center',padding:'11px 0',
                borderBottom:`1px solid ${G.border}15`,cursor:'pointer',
                background:sels===s.id?`${G.gold}06`:'transparent',
                animation:`fadeUp ${0.2+i*0.07}s ease`}}>
              <div style={{fontFamily:'Orbitron',fontSize:11,color:G.gold,width:45,flexShrink:0}}>{s.time}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600}}>{s.proc}</div>
                <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginTop:2}}>{s.patient} · {s.surgeon} · {s.anest}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim}}>{s.date.split('-').reverse().join('/')}</div>
                <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim,marginTop:2}}>{s.sala} · {s.duracao}</div>
              </div>
              <Badge text={s.status} col={stCol[s.status]||G.dim}/>
            </div>
          ))}
        </Panel>
      </div>

      {/* Checklist */}
      <div style={{width:250,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        <Panel style={{padding:14}}>
          <SectionHeader title="CHECKLIST CIRÚRGICO"/>
          {[
            ['consOk','Consentimento informado'],
            ['jejumOk','Jejum ≥ 6h confirmado'],
            ['anestOk','Avaliação anestesista'],
            ['convOk','Convocatória entregue'],
            ['identOk','Identificação verificada'],
            ['matOk','Material esterilizado'],
            ['equipeOk','Equipa completa presente'],
            ['safetyOk','Safety check WHO'],
          ].map(([key,label])=>(
            <label key={key} style={{display:'flex',gap:10,alignItems:'center',padding:'6px 0',
              borderBottom:`1px solid ${G.border}15`,cursor:'pointer'}}>
              <input type="checkbox" checked={checklist[key]}
                onChange={e=>setChecklist({...checklist,[key]:e.target.checked})}
                style={{accentColor:G.gold,width:14,height:14}}/>
              <span style={{fontFamily:'Rajdhani',fontSize:12,
                color:checklist[key]?G.green:G.dim,
                textDecoration:checklist[key]?'line-through':undefined}}>{label}</span>
            </label>
          ))}
          <div style={{marginTop:12,padding:'8px 10px',
            background:allChecked?`${G.green}08`:`${G.amber}06`,
            border:`1px solid ${allChecked?G.green:G.amber}44`,borderRadius:2}}>
            <div style={{fontFamily:'Orbitron',fontSize:8,color:allChecked?G.green:G.amber,letterSpacing:1}}>
              {allChecked?'✓ BLOCO PRONTO':'⚠ VERIFICAÇÃO PENDENTE'}
            </div>
          </div>
        </Panel>

        {S&&(
          <Panel style={{padding:14,animation:'fadeUp 0.25s ease'}}>
            <div style={{fontFamily:'Cinzel',fontSize:11,color:G.goldL,marginBottom:8,lineHeight:1.35}}>{S.proc}</div>
            {[['Paciente',S.patient],['Cirurgião',S.surgeon],['Data',S.date.split('-').reverse().join('/')],
              ['Hora',S.time],['Sala',S.sala],['Duração',S.duracao],['Anestesia',S.anest]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${G.border}15`}}>
                <span style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{l}</span>
                <span style={{fontFamily:'Rajdhani',fontSize:10,color:G.text,textAlign:'right',maxWidth:'55%',lineHeight:1.3}}>{v}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÕES
═══════════════════════════════════════════════════════════ */

export default BlocoOperatorio;
