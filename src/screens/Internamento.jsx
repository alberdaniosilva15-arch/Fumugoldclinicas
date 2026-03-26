// FumuGold — Screen: Internamento
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Internamento() {
  const {beds,setBeds,patients} = useClinic();
  const [sel,setSel] = useState(null);

  const wards = [...new Set(beds.map(b=>b.ward))];
  const B=sel?beds.find(b=>b.id===sel):null;

  const bedStats = {
    total:beds.length,
    ocupadas:beds.filter(b=>b.status==='Ocupada').length,
    livres:beds.filter(b=>b.status==='Livre').length,
    limpeza:beds.filter(b=>b.status==='Limpeza').length,
    reservadas:beds.filter(b=>b.status==='Reservada').length,
  };

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflow:'auto'}}>
        {/* Stats */}
        <div style={{display:'flex',gap:8}}>
          {[
            ['Total',bedStats.total,'🏥',G.gold],
            ['Ocupadas',bedStats.ocupadas,'🔴',G.red],
            ['Livres',bedStats.livres,'🟢',G.green],
            ['Limpeza',bedStats.limpeza,'🟡',G.amber],
            ['Reservadas',bedStats.reservadas,'🔵',G.teal],
          ].map(([l,v,ic,c],i)=>(
            <StatCard key={l} label={l} val={v} ic={ic} col={c} i={i}/>
          ))}
        </div>

        {/* Bed grid by ward */}
        {wards.map(ward=>(
          <Panel key={ward} style={{padding:14}}>
            <SectionHeader title={`ENFERMARIA — ${ward.toUpperCase()}`}/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {beds.filter(b=>b.ward===ward).map((bed,i)=>(
                <div key={bed.id} onClick={()=>setSel(sel===bed.id?null:bed.id)}
                  style={{background:sel===bed.id?`${bed.cor}14`:`${bed.cor}06`,
                    border:`1.5px solid ${sel===bed.id?bed.cor:`${bed.cor}55`}`,
                    borderRadius:3,padding:'12px 14px',cursor:'pointer',
                    transition:'all 0.2s',animation:`fadeUp ${0.2+i*0.06}s ease`}}>
                  <Corners sz={8} col={bed.cor} op={0.6}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontFamily:'Orbitron',fontSize:12,color:bed.cor,fontWeight:700}}>#{bed.id}</span>
                    <Dot col={bed.cor} pulse={bed.status==='Ocupada'}/>
                  </div>
                  <Badge text={bed.status} col={bed.cor}/>
                  {bed.patient&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,fontWeight:600,
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{bed.patient}</div>
                      <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim,marginTop:2}}>{bed.diag}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      {/* Detail */}
      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        {B?(
          <Panel style={{padding:14,animation:'fadeUp 0.25s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontFamily:'Cinzel',fontSize:12,color:G.gold}}>CAMA #{B.id}</div>
              <Badge text={B.status} col={B.cor}/>
            </div>
            {B.patient?(
              <>
                <div style={{marginBottom:12}}>
                  {[['Paciente',B.patient],['Diagnóstico',B.diag||'—'],['Entrada',B.entrada||'—'],['Médico',B.medico||'—'],['Ward',B.ward]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                      <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,textAlign:'right',maxWidth:'55%',lineHeight:1.3}}>{v}</span>
                    </div>
                  ))}
                </div>
                <VitalWave color={G.red} amp={1.1} h={40}/>
                <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                  {['Livre','Limpeza','Reservada','Ocupada'].map(st=>(
                    <button key={st} onClick={()=>setBeds(p=>p.map(b=>b.id===sel?{...b,status:st,cor:st==='Livre'?G.green:st==='Ocupada'?G.red:st==='Limpeza'?G.amber:G.blue,patient:st==='Livre'?null:b.patient}:b))}
                      style={{fontFamily:'Orbitron',fontSize:6,padding:'4px 8px',background:B.status===st?`${G.gold}14`:'transparent',border:`1px solid ${B.status===st?G.gold:G.border}`,color:B.status===st?G.gold:G.dim,borderRadius:1,cursor:'pointer'}}>
                      {st}
                    </button>
                  ))}
                  <button onClick={()=>setBeds(p=>p.map(b=>b.id===sel?{...b,status:'Livre',cor:G.green,patient:null,diag:null,entrada:null,medico:null}:b))}
                    style={{fontFamily:'Orbitron',fontSize:6,padding:'4px 8px',background:'rgba(255,37,37,0.08)',border:'1px solid rgba(255,37,37,0.3)',color:G.red,borderRadius:1,cursor:'pointer'}}>
                    🗑 ALTA
                  </button>
                </div>
              </>
            ):(
              <div>
                <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginBottom:10}}>
                  Cama livre — Assign paciente:
                </div>
                <GSelect value="" onChange={e=>{if(!e.target.value)return;const p=patients.find(pt=>pt.nome===e.target.value);setBeds(prev=>prev.map(b=>b.id===sel?{...b,patient:e.target.value,status:'Ocupada',cor:G.red,diag:p?.diag||'—',entrada:new Date().toLocaleDateString('pt-PT'),medico:'—'}:b));}} options={['Assign paciente...', ...patients.filter(p=>p.tipo==='Paciente').map(p=>p.nome)]}/>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  {['Livre','Limpeza','Reservada'].map(st=>(
                    <button key={st} onClick={()=>setBeds(p=>p.map(b=>b.id===sel?{...b,status:st,cor:st==='Livre'?G.green:st==='Limpeza'?G.amber:G.blue}:b))}
                      style={{fontFamily:'Orbitron',fontSize:6,padding:'4px 8px',background:B.status===st?`${G.gold}14`:'transparent',border:`1px solid ${B.status===st?G.gold:G.border}`,color:B.status===st?G.gold:G.dim,borderRadius:1,cursor:'pointer'}}>
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        ):(
          <Panel style={{padding:14}}>
            <SectionHeader title="SELECCIONAR CAMA"/>
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.dim,lineHeight:1.6}}>
              Clique numa cama para ver detalhes e gerir o internamento.
            </div>
          </Panel>
        )}

        <Panel style={{padding:14}}>
          <SectionHeader title="OCUPAÇÃO"/>
          <div style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>Taxa Ocupação</span>
              <span style={{fontFamily:'Orbitron',fontSize:10,color:G.amber}}>{Math.round(bedStats.ocupadas/bedStats.total*100)}%</span>
            </div>
            <div style={{height:6,background:`${G.gold}15`,borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${bedStats.ocupadas/bedStats.total*100}%`,
                background:`linear-gradient(90deg,${G.amber},${G.red})`,borderRadius:3}}/>
            </div>
          </div>
          <Ring val={bedStats.ocupadas} max={bedStats.total} col={G.amber} size={80} label="Camas Ocupadas"/>
        </Panel>

        <Panel style={{padding:14}}>
          <SectionHeader title="INTERNAMENTOS ACTIVOS"/>
          {beds.filter(b=>b.status==='Ocupada').map((b,i)=>(
            <div key={i} style={{padding:'6px 0',borderBottom:`1px solid ${G.border}15`}}>
              <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600}}>{b.patient}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{b.id} · Entrada: {b.entrada}</div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RECURSOS HUMANOS
═══════════════════════════════════════════════════════════ */

export default Internamento;
