// FumuGold — Screen: Agendamento
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Agendamento() {
  const [view,setView]=useState('week');
  const [modalOpen,setModalOpen]=useState(false);
  const {appointments:appts,setAppointments:setAppts,patients,staff} = useClinic();
  const [form,setForm]=useState({patient:'',doctor:'',specialty:'',date:new Date().toISOString().split('T')[0],time:'09:00',room:'Consultório 1',type:'Consulta',notes:''});
  const days=['08/03','09/03','10/03','11/03','12/03','13/03','14/03'];
  const dayLabels=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hours=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  const stCol={Confirmada:G.gold,'Em curso':G.green,Aguarda:G.dim,Cancelada:G.red};

  const today2025 = new Date().getFullYear();
  const getApptForSlot=(day,hour)=>appts.find(a=>{
    const d=a.date||'';
    return (d.endsWith(day.split('/')[0]+'/'+day.split('/')[1])||d.includes(day.split('/').reverse().join('-')))&&a.time===hour;
  });

  const saveAppt = () => {
    setAppts(p=>[...p,{...form,id:Date.now(),status:'Confirmada',
      initials:form.patient.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      cor:G.gold}]);
    setModalOpen(false);
    setForm({...form,patient:'',specialty:'',notes:''});
  };

  return(<>
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        <Panel style={{padding:14}}>
          <SectionHeader title="AGENDAMENTO" action={()=>setModalOpen(true)} actionLabel="NOVA"/>
          <div style={{display:'flex',gap:4,marginBottom:12}}>
            {['week','list'].map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{flex:1,padding:'5px 0',fontFamily:'Orbitron',fontSize:7,letterSpacing:1,
                  background:view===v?`${G.gold}14`:'transparent',
                  border:`1px solid ${view===v?G.gold:G.border}`,
                  color:view===v?G.gold:G.dim,borderRadius:1}}>
                {v==='week'?'SEMANA':'LISTA'}
              </button>
            ))}
          </div>
          {/* Mini stats */}
          {[['Total Semana',appts.length],['Confirmadas',appts.filter(a=>a.status==='Confirmada').length],
            ['Aguarda',appts.filter(a=>a.status==='Aguarda').length],['Em Curso',appts.filter(a=>a.status==='Em curso').length]
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',
              borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
              <span style={{fontFamily:'Orbitron',fontSize:11,color:G.gold,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </Panel>
        <Panel style={{padding:12,flex:1,overflow:'auto'}}>
          <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:8}}>PRÓXIMAS</div>
          {appts.slice(0,6).map((a,i)=>(
            <div key={i} style={{padding:'7px 0',borderBottom:`1px solid ${G.border}15`}}>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:`${a.cor}18`,
                  border:`1px solid ${a.cor}55`,display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'Cinzel',fontSize:8,color:a.cor,flexShrink:0}}>{a.initials}</div>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.patient}</span>
              </div>
              <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim,paddingLeft:28}}>
                {a.date.split('-').reverse().join('/')} {a.time} · {a.specialty}
              </div>
            </div>
          ))}
        </Panel>
        <Panel style={{padding:12}}>
          <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:8}}>SALAS</div>
          {['Consultório 1','Consultório 2','Consultório 3','Consultório 4','Sala Tratamento'].map((r,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'4px 0',borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{r}</span>
              <Dot col={i<3?G.green:G.dim} pulse={i===0}/>
            </div>
          ))}
        </Panel>
      </div>

      {/* Calendar */}
      <Panel style={{flex:1,overflow:'auto',padding:14}} noPad>
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${G.border}`,
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Cinzel',fontSize:10,color:G.gold,letterSpacing:2}}>⬡ CALENDÁRIO SEMANAL — MARÇO 2025</div>
          <div style={{fontFamily:'Orbitron',fontSize:8,color:G.dim}}>Semana 10</div>
        </div>
        <div style={{overflowX:'auto'}}>
          {view==='week'?(
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr>
                  <th style={{width:50,padding:'8px',fontFamily:'Orbitron',fontSize:7,color:G.dim,
                    borderBottom:`1px solid ${G.border}`}}></th>
                  {days.map((d,i)=>(
                    <th key={i} style={{padding:'8px 4px',fontFamily:'Orbitron',fontSize:8,
                      color:i===2?G.gold:G.dim,borderBottom:`1px solid ${G.border}`,
                      background:i===2?`${G.gold}06`:undefined,textAlign:'center'}}>
                      <div>{dayLabels[i]}</div>
                      <div style={{fontSize:11,color:i===2?G.gold:G.text,fontWeight:i===2?700:400}}>{d}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(h=>(
                  <tr key={h}>
                    <td style={{padding:'6px 8px',fontFamily:'Orbitron',fontSize:8,color:G.dim,
                      borderRight:`1px solid ${G.border}`,textAlign:'right',verticalAlign:'top'}}>{h}</td>
                    {days.map((d,i)=>{
                      const a=getApptForSlot(d,h);
                      return(
                        <td key={i} style={{padding:3,borderBottom:`1px solid ${G.border}15`,
                          borderRight:`1px solid ${G.border}15`,background:i===2?`${G.gold}04`:undefined,
                          verticalAlign:'top',minHeight:36}}>
                          {a&&(
                            <div style={{background:`${a.cor}12`,border:`1px solid ${a.cor}44`,
                              borderRadius:2,padding:'4px 6px',cursor:'pointer'}}>
                              <div style={{fontFamily:'Rajdhani',fontSize:10,color:a.cor,fontWeight:600,
                                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.patient}</div>
                              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dim,marginTop:1}}>{a.specialty}</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ):(
            <div style={{padding:14}}>
              {appts.map((a,i)=>(
                <div key={i} style={{display:'flex',gap:12,alignItems:'center',
                  padding:'10px 0',borderBottom:`1px solid ${G.border}15`,
                  animation:`fadeUp ${0.2+i*0.05}s ease`}}>
                  <div style={{fontFamily:'Orbitron',fontSize:11,color:G.gold,width:45,flexShrink:0}}>
                    {a.time}
                  </div>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`${a.cor}18`,
                    border:`1.5px solid ${a.cor}77`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontFamily:'Cinzel',fontSize:12,color:a.cor,flexShrink:0}}>
                    {a.initials}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Rajdhani',fontSize:13,color:G.text,fontWeight:600}}>{a.patient}</div>
                    <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{a.doctor} · {a.specialty} · {a.room}</div>
                  </div>
                  <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,width:70,textAlign:'right'}}>
                    {a.date.split('-').reverse().join('/')}
                  </div>
                  <Badge text={a.status} col={stCol[a.status]||G.dim}/>
                  <Badge text={a.type} col={G.teal} small/>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="NOVA CONSULTA" width={480}>
        <FormRow label="Paciente"><GSelect value={form.patient} onChange={e=>{const p=patients.find(pt=>pt.nome===e.target.value);setForm({...form,patient:e.target.value,initials:(p?.initials||e.target.value.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()),cor:p?.cor||G.gold});}} options={['', ...patients.filter(p=>p.tipo==='Paciente').map(p=>p.nome)]}/></FormRow>
        <FormRow label="Médico"><GSelect value={form.doctor} onChange={e=>setForm({...form,doctor:e.target.value})} options={['', ...staff.filter(s=>s.cargo?.toLowerCase().includes('méd')).map(s=>s.nome.length>20?s.nome.split(' ').slice(0,3).join(' '):s.nome)]}/></FormRow>
        <FormRow label="Especialidade"><GInput value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})} placeholder="Ex: Cardiologia"/></FormRow>
        <FormRow label="Data"><GInput type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></FormRow>
        <FormRow label="Hora"><GInput type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></FormRow>
        <FormRow label="Sala"><GSelect value={form.room} onChange={e=>setForm({...form,room:e.target.value})} options={['Consultório 1','Consultório 2','Consultório 3','Consultório 4','Sala Tratamento']}/></FormRow>
        <FormRow label="Tipo"><GSelect value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={['Consulta','Seguimento','Urgência','Rastreio','ECG','Alta']}/></FormRow>
        <FormRow label="Notas"><GInput value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Observações"/></FormRow>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button onClick={()=>setModalOpen(false)}
            style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',
              border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
          <button onClick={saveAppt}
            style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,
              border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>AGENDAR</button>
        </div>
      </Modal>
    </div>
  </>);
}

/* ═══════════════════════════════════════════════════════════
   PACIENTES — PEP + FILE UPLOAD
═══════════════════════════════════════════════════════════ */

export default Agendamento;
