// FumuGold — Screen: RecursosHumanos
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function RecursosHumanos() {
  const {staff:STAFF,setStaff} = useClinic();
  const [sel,setSel]=useState(null);
  const [staffModalOpen,setStaffModalOpen]=useState(false);
  const [staffForm,setStaffForm]=useState({nome:'',cargo:'',turno:'Manhã',folga:'',ferias:'',tel:'',status:'Serviço'});
  const days=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const S=sel?STAFF.find(s=>s.id===sel):null;
  const statusCol={Serviço:G.green,Folga:G.amber};

  const schedule = {
    1:['M','M','M','M','M','F','F'],
    2:['M','T','M','T','M','T','F'],
    3:['M','M','M','M','M','F','F'],
    4:['F','F','T','T','T','N','N'],
    5:['M','M','M','M','M','F','F'],
    6:['M','M','T','M','T','M','F'],
  };
  const shiftCol={M:'#D4AF37',T:'#00CCFF',N:'#AA55FF',F:`${G.dim}55`};
  const shiftLabel={M:'Manhã',T:'Tarde',N:'Noite',F:'Folga'};

  return(<>
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflow:'auto'}}>
        {/* Staff cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:9}}>
          {STAFF.map((s,i)=>(
            <Panel key={s.id} style={{padding:14,cursor:'pointer',
              border:`1px solid ${sel===s.id?s.cor:G.border}`,
              background:sel===s.id?`${s.cor}08`:undefined,
              animation:`fadeUp ${0.2+i*0.06}s ease`}}
              onClick={()=>setSel(s.id===sel?null:s.id)}>
              <Corners col={sel===s.id?s.cor:G.gold} op={sel===s.id?0.8:0.25}/>
              <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                <div style={{width:42,height:42,borderRadius:'50%',
                  background:`${s.cor}18`,border:`2px solid ${s.cor}77`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'Cinzel',fontSize:14,fontWeight:700,color:s.cor,flexShrink:0}}>{s.initials}</div>
                <div style={{overflow:'hidden'}}>
                  <div style={{fontFamily:'Rajdhani',fontSize:12,fontWeight:600,color:G.text,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.nome}</div>
                  <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim,marginTop:2}}>{s.cargo.split('—')[0]}</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{s.turno}</span>
                <Badge text={s.status} col={statusCol[s.status]||G.gold} small/>
              </div>
            </Panel>
          ))}
        </div>

        {/* Weekly schedule */}
        <Panel style={{padding:14}}>
          <SectionHeader title="ESCALA SEMANAL — MARÇO 2025"/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
              <thead>
                <tr>
                  <th style={{width:140,padding:'6px 10px',fontFamily:'Orbitron',fontSize:7,color:G.dim,textAlign:'left',borderBottom:`1px solid ${G.border}`}}>FUNCIONÁRIO</th>
                  {days.map((d,i)=>(
                    <th key={i} style={{padding:'6px 8px',fontFamily:'Orbitron',fontSize:7,color:G.dim,textAlign:'center',borderBottom:`1px solid ${G.border}`}}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAFF.map((s,i)=>(
                  <tr key={i}>
                    <td style={{padding:'8px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.text,borderBottom:`1px solid ${G.border}15`}}>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:s.cor,flexShrink:0}}/>
                        {s.nome.split(' ')[0]} {s.nome.split(' ').slice(-1)}
                      </div>
                    </td>
                    {(schedule[s.id]||Array(7).fill('M')).map((sh,j)=>(
                      <td key={j} style={{padding:'6px 4px',textAlign:'center',borderBottom:`1px solid ${G.border}15`}}>
                        <div style={{display:'inline-block',padding:'3px 6px',borderRadius:2,
                          background:`${shiftCol[sh]}18`,border:`1px solid ${shiftCol[sh]}44`,
                          fontFamily:'Orbitron',fontSize:7,color:shiftCol[sh]}}>
                          {sh}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:'flex',gap:12,marginTop:10}}>
              {Object.entries(shiftLabel).map(([k,l])=>(
                <div key={k} style={{display:'flex',gap:4,alignItems:'center'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:shiftCol[k]}}/>
                  <span style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div style={{width:230,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        {S?(
          <Panel style={{padding:14,animation:'fadeUp 0.25s ease'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
              <div style={{width:46,height:46,borderRadius:'50%',
                background:`${S.cor}18`,border:`2px solid ${S.cor}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'Cinzel',fontSize:16,fontWeight:700,color:S.cor}}>{S.initials}</div>
              <div>
                <div style={{fontFamily:'Cinzel',fontSize:11,color:G.text}}>{S.nome}</div>
                <Badge text={S.status} col={statusCol[S.status]||G.gold}/>
              </div>
            </div>
            {[['Cargo',S.cargo],['Turno',S.turno],['Folga',S.folga],['Férias',S.ferias],['Contacto',S.tel]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,textAlign:'right',maxWidth:'55%',lineHeight:1.3}}>{v}</span>
              </div>
            ))}
          </Panel>
        ):null}

        <Panel style={{padding:14}}>
          <SectionHeader title="EQUIPA" action={()=>setStaffModalOpen(true)} actionLabel="+ NOVO"/>
          {[['Médicos',2,G.blue],['Enfermeiros',2,G.teal],['Técnicos',1,G.amber],['Admin',1,G.gold]].map(([l,n,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
              <span style={{fontFamily:'Orbitron',fontSize:11,color:c,fontWeight:700}}>{n}</span>
            </div>
          ))}
        </Panel>
        <Panel style={{padding:14}}>
          <SectionHeader title="PRESENÇAS HOJE"/>
          <div style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>Em Serviço</span>
              <span style={{fontFamily:'Orbitron',fontSize:10,color:G.green}}>5/6</span>
            </div>
            <div style={{height:5,background:`${G.gold}15`,borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:'83%',background:`linear-gradient(90deg,${G.green},${G.teal})`,borderRadius:3}}/>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    {/* Staff creation modal */}
    <Modal open={staffModalOpen} onClose={()=>setStaffModalOpen(false)} title="NOVO FUNCIONÁRIO" width={420}>
      <FormRow label="Nome Completo *"><GInput value={staffForm.nome} onChange={e=>setStaffForm({...staffForm,nome:e.target.value})} placeholder="Nome completo"/></FormRow>
      <FormRow label="Cargo"><GSelect value={staffForm.cargo} onChange={e=>setStaffForm({...staffForm,cargo:e.target.value})} options={['Médico','Médica','Enfermeiro','Enfermeira','Técnico Laboratório','Recepcionista','Administrador','Auxiliar']}/></FormRow>
      <FormRow label="Turno"><GSelect value={staffForm.turno} onChange={e=>setStaffForm({...staffForm,turno:e.target.value})} options={['Manhã','Tarde','Noite','Manhã/Tarde']}/></FormRow>
      <FormRow label="Folga"><GInput value={staffForm.folga} onChange={e=>setStaffForm({...staffForm,folga:e.target.value})} placeholder="Sáb/Dom"/></FormRow>
      <FormRow label="Férias"><GInput value={staffForm.ferias} onChange={e=>setStaffForm({...staffForm,ferias:e.target.value})} placeholder="Julho"/></FormRow>
      <FormRow label="Telefone"><GInput value={staffForm.tel} onChange={e=>setStaffForm({...staffForm,tel:e.target.value})} placeholder="+244 ..."/></FormRow>
      <FormRow label="Estado"><GSelect value={staffForm.status} onChange={e=>setStaffForm({...staffForm,status:e.target.value})} options={['Serviço','Folga','Férias','Baixa']}/></FormRow>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <button onClick={()=>setStaffModalOpen(false)} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
        <button onClick={()=>{if(!staffForm.nome.trim())return;setStaff(p=>[...p,{...staffForm,id:Date.now(),nivel:'Clínico',initials:staffForm.nome.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(),cor:['#D4AF37','#00AAFF','#00CC88','#FF9944','#AA55FF'][Math.floor(Math.random()*5)]}]);setStaffModalOpen(false);setStaffForm({nome:'',cargo:'',turno:'Manhã',folga:'',ferias:'',tel:'',status:'Serviço'});}} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>◈ ADICIONAR</button>
      </div>
    </Modal>
  </>);
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS & BI
═══════════════════════════════════════════════════════════ */

export default RecursosHumanos;
