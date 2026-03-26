// FumuGold — Screen: Analytics
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';

function Analytics() {
  const {patients,appointments,prescriptions,labResults,invoices,beds} = useClinic();
  
  // Real calculations
  const totalPac = patients.filter(p=>p.tipo==='Paciente').length;
  const activePac = patients.filter(p=>p.tipo==='Paciente'&&p.status!=='Alta Completa').length;
  const totalAppts = appointments.length;
  const alertLabs = labResults.filter(r=>r.alert).length;
  const totalInv = invoices.reduce((s,i)=>s+i.total,0);
  const paidInv = invoices.reduce((s,i)=>s+i.pago,0);
  
  // Diagnoses distribution
  const diagCounts={};
  patients.filter(p=>p.diag&&p.diagKey).forEach(p=>{ diagCounts[p.diag]=(diagCounts[p.diag]||0)+1; });
  const top5Diag=Object.entries(diagCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  
  // Specialty distribution from appointments
  const specCounts={};
  appointments.forEach(a=>{ if(a.specialty) specCounts[a.specialty]=(specCounts[a.specialty]||0)+1; });
  const specEntries=Object.entries(specCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const specTotal=specEntries.reduce((s,[,v])=>s+v,0)||1;
  const specCols=[G.red,G.gold,G.teal,G.purple,G.amber];
  
  // Age groups
  const ageGroups={'0-17':0,'18-35':0,'36-50':0,'51-65':0,'65+':0};
  patients.filter(p=>p.tipo==='Paciente'&&p.idade).forEach(p=>{
    const a=parseInt(p.idade);
    if(a<=17)ageGroups['0-17']++;
    else if(a<=35)ageGroups['18-35']++;
    else if(a<=50)ageGroups['36-50']++;
    else if(a<=65)ageGroups['51-65']++;
    else ageGroups['65+']++;
  });
  const ageTotal=Object.values(ageGroups).reduce((s,v)=>s+v,0)||1;
  const ageCols=[G.teal,G.gold,G.amber,G.red,G.purple];
  
  return(
    <div style={{padding:10,display:'flex',flexDirection:'column',gap:10,height:'100%',overflowY:'auto'}}>
      <div style={{display:'flex',gap:8}}>
        <StatCard label="Total Pacientes" val={totalPac} sub={`${activePac} activos`} ic="🧬" col={G.gold} i={0}/>
        <StatCard label="Consultas" val={totalAppts} sub="total agendadas" ic="📋" col={G.teal} i={1}/>
        <StatCard label="Alertas Lab." val={alertLabs} sub={`${labResults.length} exames`} ic="⚠" col={G.red} i={2}/>
        <StatCard label="Faturação" val={totalInv>0?`${(totalInv/1000).toFixed(0)}K AOA`:'0 AOA'} sub={paidInv>0?`${Math.round(paidInv/totalInv*100)}% pago`:'—'} ic="💰" col={G.amber} i={3}/>
      </div>

      <div style={{display:'flex',gap:10}}>
        <Panel style={{flex:2,padding:14}}>
          <SectionHeader title="CONSULTAS POR STATUS"/>
          {appointments.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,padding:'8px 0',textAlign:'center'}}>Sem consultas registadas</div>
          ):(()=>{
            const stats={Confirmada:0,'Em curso':0,Aguarda:0,Cancelada:0};
            appointments.forEach(a=>{stats[a.status]=(stats[a.status]||0)+1;});
            const statCols={Confirmada:G.gold,'Em curso':G.green,Aguarda:G.dim,Cancelada:G.red};
            return <BarChart data={Object.entries(stats).filter(([,v])=>v>0).map(([l,v])=>({label:l,val:v,col:statCols[l]||G.dim}))} h={80}/>;
          })()}
        </Panel>
        <Panel style={{flex:1,padding:14}}>
          <SectionHeader title="ESPECIALIDADES"/>
          {specEntries.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,textAlign:'center',padding:'8px 0'}}>Sem dados</div>
          ):specEntries.map(([l,v],i)=>(
            <div key={l} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'70%'}}>{l}</span>
                <span style={{fontFamily:'Orbitron',fontSize:9,color:specCols[i%specCols.length]}}>{Math.round(v/specTotal*100)}%</span>
              </div>
              <div style={{height:4,background:`${specCols[i%specCols.length]}15`,borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${v/specTotal*100}%`,background:specCols[i%specCols.length],borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{display:'flex',gap:10}}>
        <Panel style={{flex:1,padding:14}}>
          <SectionHeader title="OCUPAÇÃO CLÍNICA"/>
          <div style={{display:'flex',justifyContent:'space-around',padding:'8px 0'}}>
            <Ring val={activePac} max={Math.max(totalPac,1)} col={G.green} size={64} label="Pac. Activos"/>
            <Ring val={beds.filter(b=>b.status==='Ocupada').length} max={beds.length} col={G.amber} size={64} label="Camas Ocup."/>
            <Ring val={prescriptions.filter(r=>r.status==='Activa').length} max={Math.max(prescriptions.length,1)} col={G.teal} size={64} label="Prescrições"/>
            <Ring val={alertLabs} max={Math.max(labResults.length,1)} col={G.red} size={64} label="Alertas"/>
          </div>
        </Panel>
        <Panel style={{flex:1,padding:14}}>
          <SectionHeader title="MORBILIDADE — DIAGNÓSTICOS"/>
          {top5Diag.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,textAlign:'center',padding:'8px 0'}}>Sem diagnósticos registados</div>
          ):top5Diag.map(([l,v],i)=>(
            <div key={l} style={{marginBottom:7}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'72%'}}>{l}</span>
                <span style={{fontFamily:'Orbitron',fontSize:9,color:specCols[i%specCols.length]}}>{v} pac.</span>
              </div>
              <div style={{height:4,background:`${specCols[i%specCols.length]}15`,borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${v/Math.max(...top5Diag.map(([,x])=>x))*100}%`,background:specCols[i%specCols.length],borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{display:'flex',gap:10}}>
        <Panel style={{flex:1,padding:14}}>
          <SectionHeader title="FATURAÇÃO POR ESTADO"/>
          {invoices.length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,padding:'8px 0',textAlign:'center'}}>Sem faturas registadas</div>
          ):(()=>{
            const byS={Pago:0,Pendente:0,Parcial:0};
            invoices.forEach(inv=>{byS[inv.status]=(byS[inv.status]||0)+inv.total;});
            const sc2={Pago:G.green,Pendente:G.red,Parcial:G.amber};
            return <><BarChart data={Object.entries(byS).filter(([,v])=>v>0).map(([l,v])=>({label:l,val:v,col:sc2[l]||G.dim}))} h={70}/>
              <div style={{marginTop:8,fontFamily:'Orbitron',fontSize:8,color:G.gold}}>Total: {totalInv.toLocaleString('pt-AO')} AOA</div></>;
          })()}
        </Panel>
        <Panel style={{flex:1,padding:14}}>
          <SectionHeader title="DISTRIBUIÇÃO ETÁRIA"/>
          {patients.filter(p=>p.tipo==='Paciente').length===0?(
            <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim,padding:'8px 0',textAlign:'center'}}>Sem pacientes registados</div>
          ):Object.entries(ageGroups).map(([l,v],i)=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:`1px solid ${G.border}15`}}>
              <span style={{fontFamily:'Rajdhani',fontSize:11,color:G.dim}}>{l} anos</span>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{width:60,height:4,background:`${ageCols[i]}15`,borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.round(v/ageTotal*100)}%`,background:ageCols[i],borderRadius:2}}/>
                </div>
                <span style={{fontFamily:'Orbitron',fontSize:8,color:ageCols[i],width:28,textAlign:'right'}}>{v}</span>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <Panel style={{padding:14}}>
        <SectionHeader title="MONITOR EM TEMPO REAL"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[['Cardíaco',G.red,1.2],['Resp.',G.teal,0.8],['Neurológico',G.purple,0.6],['Metabólico',G.amber,1.0]].map(([l,c,a])=>(
            <div key={l}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:c,letterSpacing:1,marginBottom:4}}>{l.toUpperCase()}</div>
              <VitalWave color={c} amp={a} h={40}/>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMUNICAÇÃO — CHAT
═══════════════════════════════════════════════════════════ */

export default Analytics;
