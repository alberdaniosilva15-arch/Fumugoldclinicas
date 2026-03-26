// FumuGold — Screen: Prescricoes
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Prescricoes() {
  const {prescriptions:rxs,setPrescriptions:setRxs,patients,addNotification,staff} = useClinic();
  const [modalOpen,setModalOpen]=useState(false);
  const [form,setForm]=useState({patient:'',med:'',dose:'',via:'Oral',duracao:'30 dias',medico:''});
  const [filter,setFilter]=useState('all');

  const INTERACTIONS = [
    {meds:['Metformina','Losartan'],level:'baixo',desc:'Possível potenciação do efeito hipoglicémico'},
    {meds:['Atorvastatina','AAS'],level:'baixo',desc:'Risco aumentado de miopatia — monitorizar CPK'},
    {meds:['Metotrexato','AINEs'],level:'alto',desc:'⚠ CONTRAINDICADO — toxicidade MTX aumentada'},
  ];

  const filtered = filter==='all'?rxs:rxs.filter(r=>r.status===filter);

  const saveRx = () => {
    if(!form.patient||!form.med)return;
    setRxs(p=>[...p,{...form,id:Date.now(),data:new Date().toLocaleDateString('pt-PT'),status:'Activa',renovavel:true}]);
    addNotification('info',`Nova prescrição: ${form.med} para ${form.patient}`);
    setModalOpen(false);
    setForm({patient:'',med:'',dose:'',via:'Oral',duracao:'30 dias',medico:''});
  };

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflow:'hidden'}}>
        <Panel style={{padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <SectionHeader title={`RECEITUÁRIO (${rxs.length})`}/>
            <div style={{display:'flex',gap:6}}>
              {['all','Activa','Expirada'].map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 10px',
                    background:filter===f?`${G.gold}14`:'transparent',
                    border:`1px solid ${filter===f?G.gold:G.border}`,
                    color:filter===f?G.gold:G.dim,borderRadius:1}}>
                  {f==='all'?'TODAS':f.toUpperCase()}
                </button>
              ))}
              <button onClick={()=>setModalOpen(true)}
                style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 12px',background:`${G.gold}14`,
                  border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>+ NOVA</button>
            </div>
          </div>
          <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'calc(100vh - 280px)'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{position:'sticky',top:0,zIndex:10,background:'#080500'}}>
                <tr>
                  {['Paciente','Medicamento','Dose','Via','Duração','Médico','Data','Estado'].map(h=>(
                    <th key={h} style={{padding:'6px 8px',fontFamily:'Orbitron',fontSize:7,color:G.dim,
                      letterSpacing:1,textAlign:'left',borderBottom:`1px solid ${G.border}`,
                      whiteSpace:'nowrap',background:'#080500'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rx,i)=>(
                  <tr key={i} style={{animation:`fadeUp ${0.2+i*0.04}s ease`}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'8px',fontFamily:'Rajdhani',fontSize:12,color:G.text,borderBottom:`1px solid ${G.border}10`}}>{rx.patient}</td>
                    <td style={{padding:'8px',fontFamily:'Rajdhani',fontSize:12,color:G.goldL,fontWeight:600,borderBottom:`1px solid ${G.border}10`}}>{rx.med}</td>
                    <td style={{padding:'8px',fontFamily:'Rajdhani',fontSize:11,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{rx.dose}</td>
                    <td style={{padding:'8px',borderBottom:`1px solid ${G.border}10`}}><Badge text={rx.via} col={G.teal} small/></td>
                    <td style={{padding:'8px',fontFamily:'Rajdhani',fontSize:11,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{rx.duracao}</td>
                    <td style={{padding:'8px',fontFamily:'Rajdhani',fontSize:11,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{rx.medico}</td>
                    <td style={{padding:'8px',fontFamily:'Orbitron',fontSize:8,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{rx.data}</td>
                    <td style={{padding:'8px',borderBottom:`1px solid ${G.border}10`}}>
                      <div style={{display:'flex',gap:4,alignItems:'center'}}>
                        <Badge text={rx.status} col={rx.status==='Activa'?G.green:G.dim} small/>
                        {rx.renovavel&&<Badge text="↺" col={G.gold} small/>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        <Panel style={{padding:14}}>
          <SectionHeader title="INTERACÇÕES"/>
          {INTERACTIONS.map((it,i)=>(
            <div key={i} style={{padding:'8px 0',borderBottom:`1px solid ${G.border}15`}}>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                <Badge text={it.level==='alto'?'⚠ ALTO':'BAIXO'} col={it.level==='alto'?G.red:G.amber} small/>
              </div>
              <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.teal,marginBottom:2}}>
                {it.meds.join(' + ')}
              </div>
              <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim,lineHeight:1.4}}>{it.desc}</div>
            </div>
          ))}
        </Panel>
        <Panel style={{padding:14}}>
          <SectionHeader title="ESTATÍSTICAS"/>
          <BarChart data={[
            {label:'Oral',val:12,col:G.gold},{label:'SC/IM',val:4,col:G.teal},
            {label:'Inal.',val:2,col:G.green},{label:'Tóp.',val:1,col:G.purple},
          ]} h={50}/>
        </Panel>
        <Panel style={{padding:14}}>
          <SectionHeader title="RENOVAÇÕES"/>
          {rxs.filter(r=>r.renovavel&&r.status==='Activa').slice(0,4).map((r,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
              <div style={{overflow:'hidden',flex:1,marginRight:8}}>
                <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.med}</div>
                <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.dim}}>{r.patient}</div>
              </div>
              <button style={{fontFamily:'Orbitron',fontSize:7,padding:'3px 8px',
                background:`${G.gold}14`,border:`1px solid ${G.gold}44`,color:G.gold,borderRadius:1}}>
                ↺
              </button>
            </div>
          ))}
        </Panel>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="NOVA PRESCRIÇÃO" width={460}>
        <FormRow label="Paciente"><GSelect value={form.patient} onChange={e=>setForm({...form,patient:e.target.value})} options={['',  ...patients.filter(p=>p.tipo==='Paciente').map(p=>p.nome)]}/></FormRow>
        <FormRow label="Medicamento"><GInput value={form.med} onChange={e=>setForm({...form,med:e.target.value})} placeholder="Nome + dose (ex: Amlodipina 10mg)"/></FormRow>
        <FormRow label="Posologia"><GInput value={form.dose} onChange={e=>setForm({...form,dose:e.target.value})} placeholder="Ex: 1cp 2x/dia"/></FormRow>
        <FormRow label="Via"><GSelect value={form.via} onChange={e=>setForm({...form,via:e.target.value})} options={['Oral','IV','SC','IM','Inalatório','Tópico','Sublingual','Rectal']}/></FormRow>
        <FormRow label="Duração"><GSelect value={form.duracao} onChange={e=>setForm({...form,duracao:e.target.value})} options={['7 dias','10 dias','14 dias','21 dias','30 dias','60 dias','90 dias','Indefinido']}/></FormRow>
        <FormRow label="Médico"><GSelect value={form.medico} onChange={e=>setForm({...form,medico:e.target.value})} options={['Dra. M. Oliveira','Dr. A. Ngola']}/></FormRow>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
          <button onClick={()=>setModalOpen(false)} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
          <button onClick={saveRx} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>PRESCREVER</button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LABORATÓRIO
═══════════════════════════════════════════════════════════ */

export default Prescricoes;
