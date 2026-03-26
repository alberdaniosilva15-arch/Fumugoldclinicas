// FumuGold — Screen: Financeiro
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Financeiro() {
  const {invoices:invs,setInvoices:setInvs,patients} = useClinic();
  const [sel,setSel]=useState(null);
  const [modalOpen,setModalOpen]=useState(false);

  const total = invs.reduce((s,i)=>s+i.total,0);
  const pago = invs.reduce((s,i)=>s+i.pago,0);
  const pendente = invs.reduce((s,i)=>s+i.pendente,0);

  const fmt = n => n.toLocaleString('pt-AO')+' AOA';
  const stCol={Pago:G.green,Pendente:G.red,Parcial:G.amber};
  const I=sel?invs.find(i=>i.id===sel):null;

  return(
    <div style={{display:'flex',gap:10,height:'100%',padding:10}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:10,overflow:'hidden'}}>
        <div style={{display:'flex',gap:8}}>
          <StatCard label="Total Faturado" val={`${(total/1000).toFixed(0)}K`} sub="AOA" ic="💰" col={G.gold} i={0}/>
          <StatCard label="Total Recebido" val={`${(pago/1000).toFixed(0)}K`} sub="AOA" ic="✅" col={G.green} i={1}/>
          <StatCard label="Pendente" val={`${(pendente/1000).toFixed(0)}K`} sub="AOA" ic="⏳" col={G.amber} i={2}/>
          <StatCard label="Faturas" val={invs.length} sub={`${invs.filter(i=>i.status==='Pendente').length} pendentes`} ic="📄" col={G.teal} i={3}/>
        </div>

        <Panel style={{padding:14,flex:1,overflow:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <SectionHeader title="FATURAS"/>
            <button onClick={()=>setModalOpen(true)}
              style={{fontFamily:'Orbitron',fontSize:7,padding:'4px 12px',background:`${G.gold}14`,
                border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1,marginBottom:12}}>+ EMITIR</button>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Nº Fatura','Paciente','Data','Total','Seguro','Pago','Pendente','Estado'].map(h=>(
                  <th key={h} style={{padding:'6px 10px',fontFamily:'Orbitron',fontSize:7,color:G.dim,
                    textAlign:'left',borderBottom:`1px solid ${G.border}`,letterSpacing:1}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invs.map((inv,i)=>(
                <tr key={i} onClick={()=>setSel(sel===inv.id?null:inv.id)}
                  style={{cursor:'pointer',animation:`fadeUp ${0.2+i*0.05}s ease`,
                    background:sel===inv.id?`${G.gold}07`:'transparent'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background=sel===inv.id?`${G.gold}07`:'transparent'}>
                  <td style={{padding:'9px 10px',fontFamily:'Orbitron',fontSize:9,color:G.gold,borderBottom:`1px solid ${G.border}10`}}>{inv.id}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.text,borderBottom:`1px solid ${G.border}10`}}>{inv.patient}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Orbitron',fontSize:8,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{inv.date}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.text,fontWeight:600,borderBottom:`1px solid ${G.border}10`}}>{fmt(inv.total)}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:11,color:G.dim,borderBottom:`1px solid ${G.border}10`}}>{inv.seguro}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:G.green,borderBottom:`1px solid ${G.border}10`}}>{fmt(inv.pago)}</td>
                  <td style={{padding:'9px 10px',fontFamily:'Rajdhani',fontSize:12,color:inv.pendente>0?G.amber:G.green,borderBottom:`1px solid ${G.border}10`}}>{fmt(inv.pendente)}</td>
                  <td style={{padding:'9px 10px',borderBottom:`1px solid ${G.border}10`}}><Badge text={inv.status} col={stCol[inv.status]||G.dim}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        {I?(
          <Panel style={{padding:14,animation:'fadeUp 0.25s ease'}}>
            <div style={{fontFamily:'Cinzel',fontSize:11,color:G.gold,marginBottom:3}}>{I.id}</div>
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,marginBottom:8}}>{I.patient}</div>
            <Badge text={I.status} col={stCol[I.status]||G.dim}/>
            <div style={{marginTop:12,fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:6}}>ITENS</div>
            {I.items.map((item,j)=>(
              <div key={j} style={{display:'flex',gap:6,padding:'4px 0',borderBottom:`1px solid ${G.border}15`}}>
                <Dot col={G.gold}/>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{item}</span>
              </div>
            ))}
            <div style={{marginTop:12}}>
              {[['Total',fmt(I.total),G.gold],['Pago',fmt(I.pago),G.green],['Pendente',fmt(I.pendente),I.pendente>0?G.amber:G.green]].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
                  <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l}</span>
                  <span style={{fontFamily:'Orbitron',fontSize:10,color:c,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
        ):(
          <Panel style={{padding:14}}>
            <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:10}}>RESUMO MENSAL</div>
            <BarChart data={[
              {label:'Jan',val:120000,col:G.gold},{label:'Fev',val:145000,col:G.gold},
              {label:'Mar',val:98500,col:G.teal}
            ]} h={60}/>
          </Panel>
        )}
        <Panel style={{padding:14}}>
          <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:10}}>POR SEGURADORA</div>
          {[['ENSA','3 faturas',G.gold],['INSS','1 fatura',G.teal],['AAA Seguros','2 faturas',G.amber],['Particular','1 fatura',G.dim]].map(([s,n,c])=>(
            <div key={s} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{s}</span>
              <span style={{fontFamily:'Orbitron',fontSize:8,color:c}}>{n}</span>
            </div>
          ))}
        </Panel>
      </div>

      {modalOpen&&<FinanceiroModal patients={patients} setInvs={setInvs} onClose={()=>setModalOpen(false)}/>}
    </div>
  );
}

function FinanceiroModal({patients, setInvs, onClose}) {
  const [fPat,setFPat]=useState('');
  const [fDate,setFDate]=useState(new Date().toISOString().split('T')[0]);
  const [fSeg,setFSeg]=useState('Particular');
  const [fItems,setFItems]=useState([]);
  const [fTotal,setFTotal]=useState('');
  const [fPago,setFPago]=useState('');
  const PRICES={'Consulta':8000,'Análises':5000,'Medicação':3000,'Procedimento':12000,'Imagiologia':15000,'Internamento/dia':25000,'Cirurgia':80000};
  const autoTotal=fItems.reduce((s,i)=>s+(PRICES[i]||0),0);
  return(
    <Modal open={true} onClose={onClose} title="EMITIR FATURA" width={480}>
      <FormRow label="Paciente *"><GSelect value={fPat} onChange={e=>setFPat(e.target.value)} options={['', ...patients.filter(p=>p.tipo==='Paciente').map(p=>p.nome)]}/></FormRow>
      <FormRow label="Data"><GInput type="date" value={fDate} onChange={e=>setFDate(e.target.value)}/></FormRow>
      <FormRow label="Seguradora"><GSelect value={fSeg} onChange={e=>setFSeg(e.target.value)} options={['ENSA','INSS','AAA Seguros','Particular','BESA','Global Seguros']}/></FormRow>
      <div style={{marginBottom:10}}>
        <div style={{fontFamily:'Cinzel',fontSize:8,color:G.dim,letterSpacing:2,marginBottom:6}}>ITENS / SERVIÇOS</div>
        {Object.entries(PRICES).map(([item,price])=>(
          <label key={item} style={{display:'flex',gap:8,alignItems:'center',padding:'4px 0',cursor:'pointer'}}>
            <input type="checkbox" checked={fItems.includes(item)} onChange={e=>setFItems(p=>e.target.checked?[...p,item]:p.filter(x=>x!==item))} style={{accentColor:G.gold}}/>
            <span style={{fontFamily:'Rajdhani',fontSize:12,color:G.text,flex:1}}>{item}</span>
            <span style={{fontFamily:'Orbitron',fontSize:9,color:G.gold}}>{price.toLocaleString('pt-AO')} AOA</span>
          </label>
        ))}
      </div>
      <div style={{display:'flex',gap:10,marginBottom:10}}>
        <FormRow label="Total (AOA)"><GInput type="number" value={fTotal||autoTotal} onChange={e=>setFTotal(e.target.value)} placeholder={String(autoTotal)}/></FormRow>
        <FormRow label="Pago (AOA)"><GInput type="number" value={fPago} onChange={e=>setFPago(e.target.value)} placeholder="0"/></FormRow>
      </div>
      {autoTotal>0&&<div style={{fontFamily:'Orbitron',fontSize:9,color:G.gold,marginBottom:10}}>Total: {autoTotal.toLocaleString('pt-AO')} AOA</div>}
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <button onClick={onClose} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:'transparent',border:`1px solid ${G.border}`,color:G.dim,borderRadius:1}}>CANCELAR</button>
        <button onClick={()=>{
          if(!fPat)return;
          const total=parseInt(fTotal)||autoTotal;
          const pago=parseInt(fPago)||0;
          const d=fDate.split('-');
          setInvs(p=>[...p,{id:`FT-${String(Date.now()).slice(-6)}`,patient:fPat,date:d.length===3?`${d[2]}/${d[1]}/${d[0]}`:fDate,total,pago,pendente:total-pago,seguro:fSeg,items:fItems.length?fItems:['Consulta'],status:pago>=total?'Pago':pago>0?'Parcial':'Pendente'}]);
          onClose();
        }} style={{fontFamily:'Orbitron',fontSize:7,padding:'7px 16px',background:`${G.gold}18`,border:`1px solid ${G.gold}`,color:G.gold,borderRadius:1}}>◈ EMITIR FATURA</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   INTERNAMENTO — BED MAP
═══════════════════════════════════════════════════════════ */

export default Financeiro;
