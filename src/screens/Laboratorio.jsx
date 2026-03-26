// FumuGold — Screen: Laboratorio
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Laboratorio() {
  const {labResults:results,setLabResults:setResults,patients,addNotification} = useClinic();
  const [sel,setSel]=useState(null);
  const [modalOpen,setModalOpen]=useState(false);
  const [form,setForm]=useState({patient:'',exam:'',date:new Date().toLocaleDateString('pt-PT')});

  const R=sel?results.find(r=>r.id===sel):null;

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,overflow:'auto'}}>
        <Panel style={{padding:14,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <SectionHeader title={`LABORATÓRIO & EXAMES (${results.length})`}/>
            <button onClick={()=>setModalOpen(true)}
              style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 12px',background:`${G.gold}14`,
                border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>+ PEDIDO</button>
          </div>
        </Panel>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:10}}>
          {results.map((r,i)=>(
            <Panel key={i} style={{padding:14,cursor:'pointer',
              border:`1px solid ${sel===r.id?G.gold:r.alert?`${G.red}44`:G.border}`,
              background:sel===r.id?`${G.gold}06`:r.alert?`${G.red}04`:undefined,
              animation:`fadeUp ${0.2+i*0.05}s ease`}}
              onClick={()=>setSel(sel===r.id?null:r.id)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600,marginBottom:2}}>{r.exam}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{r.patient}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                  <Badge text={r.alert?'⚠ ALERTA':'Normal'} col={r.alert?G.red:G.green} small/>
                  <Badge text={r.status} col={G.teal} small/>
                </div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {Object.entries(r.resultado).slice(0,3).map(([k,v])=>(
                  <div key={k} style={{background:'rgba(212,175,55,0.06)',border:`1px solid ${G.border}`,
                    borderRadius:2,padding:'3px 7px'}}>
                    <span style={{fontFamily:'Orbitron',fontSize:7,color:G.dim}}>{k}: </span>
                    <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,marginTop:8}}>{r.date}</div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Detail */}
      {R&&(
        <div style={{width:270,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
          <Panel style={{padding:14,animation:'fadeUp 0.25s ease'}}>
            <div style={{fontFamily:'Cinzel',fontSize:11,color:G.goldL,marginBottom:4}}>{R.exam}</div>
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,marginBottom:10}}>{R.patient} · {R.date}</div>
            {R.alert&&<div style={{background:'rgba(255,37,37,0.08)',border:'1px solid rgba(255,37,37,0.3)',
              borderRadius:2,padding:'6px 10px',marginBottom:10,fontFamily:'Orbitron',fontSize:8,color:G.red}}>
              ⚠ VALORES FORA DO INTERVALO DE REFERÊNCIA
            </div>}
            <div style={{fontFamily:'Cinzel',fontSize:8,color:G.gold,letterSpacing:2,marginBottom:8}}>⬡ RESULTADOS</div>
            {Object.entries(R.resultado).map(([k,v])=>{
              const ref=R.ref[k];
              return(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'6px 0',borderBottom:`1px solid ${G.border}15`}}>
                  <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{k}</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Orbitron',fontSize:11,color:G.text,fontWeight:700}}>{v}</div>
                    {ref&&<div style={{fontFamily:'Rajdhani',fontSize:9,color:G.dim}}>Ref: {ref}</div>}
                  </div>
                </div>
              );
            })}
          </Panel>
          <Panel style={{padding:12}}>
            <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:6}}>TENDÊNCIA</div>
            <VitalWave color={R.alert?G.red:G.green} amp={R.alert?1.3:0.8} h={40}/>
          </Panel>
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="PEDIDO DE EXAME" width={440}>
        <FormRow label="Paciente"><GSelect value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} options={['', ...patients.filter(p=>p.tipo==='Paciente').map(p=>p.nome)]}/></FormRow>
        <FormRow label="Exame"><GSelect value={form.exam} onChange={e=>setForm({...form,exam:e.target.value})} options={['Hemograma Completo','Perfil Lipídico','HbA1c','Função Renal','Função Hepática','Marcadores Inflamatórios','Espirometria','ECG','Rx Tórax','Ecografia Abdominal','TAC','RMN']}/></FormRow>
        <FormRow label="Data"><GInput type="date" value={form.date||new Date().toISOString().split('T')[0]} onChange={e=>setForm({...form,date:e.target.value})}/></FormRow>
        <FormRow label="Urgência"><GSelect value={form.urg||'Normal'} onChange={e=>setForm({...form,urg:e.target.value})} options={['Normal','Urgente','Emergência']}/></FormRow>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button onClick={()=>setModalOpen(false)} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
          <button onClick={()=>{if(!form.patient||!form.exam)return;const d=form.date||new Date().toISOString().split('T')[0];const parts=d.split('-');const fmtDate=parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:d;setResults(p=>[...p,{id:Date.now(),patient:form.patient,exam:form.exam,date:fmtDate,status:'Pendente',urg:form.urg||'Normal',resultado:{},ref:{},alert:false}]);addNotification('info',`Pedido de ${form.exam} para ${form.patient}`);setModalOpen(false);setForm({patient:'',exam:'',date:new Date().toISOString().split('T')[0]});}} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>SOLICITAR</button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FINANCEIRO & FATURAÇÃO
═══════════════════════════════════════════════════════════ */

export default Laboratorio;
