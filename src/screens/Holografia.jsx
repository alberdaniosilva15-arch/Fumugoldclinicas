// FumuGold V4 — Screen: Holografia
// Inclui todos os modelos Sketchfab novos fornecidos pelo utilizador
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { G } from '../theme.js';
import { useClinic } from '../context/ClinicContext.jsx';
import { Panel, Badge, Dot, Ring, Modal, FormRow, GInput, GSelect, StatCard, SectionHeader, FileUploader } from '../components/ui/index.jsx';
import { DISEASES } from '../data/diseases.js';
import useThreeJS from '../hooks/useThreeJS.js';

// ══════════════════════════════════════════════════════════
//  ATLAS 3D — MODELOS SKETCHFAB
//  Inclui modelos originais + novos modelos do utilizador
// ══════════════════════════════════════════════════════════
const ATLAS_MODELS = {
  // ── Corpo completo ──────────────────────────────────────
  body_xr:        {id:'e89f83cd30ad48c980c7e1a152c6b172',label:'Corpo Completo XR',            icon:'🧬',parts:['head','chest','abdomen','pelvis','spine']},
  body_full:      {id:'9306344c4b554268a520c72c0d988b5b',label:'Anatomia Humana Completa',      icon:'👤',parts:['head','chest','abdomen','pelvis','spine']},
  body_holo:      {id:'f62ec13f32114cc093f282ab0dbce4ae',label:'Holograma Corpo Completo',      icon:'💠',parts:['head','chest','abdomen','pelvis','spine','arm_L','arm_R']},
  anatomy_full:   {id:'b9888d8025d04c4eb9a293b4b9ac8d13',label:'Atlas Anatómico Ultimate',     icon:'🧬',parts:['head','chest','abdomen','pelvis','spine','arm_L','arm_R']},
  muscles_bones:  {id:'db7be21587804a32ab3a99e165c56e19',label:'Músculos e Ossos',             icon:'💪',parts:['chest','abdomen','pelvis','spine','knee_L','knee_R','bone_pelvis']},

  // ── Cabeça / Neurológico ────────────────────────────────
  brain:          {id:'c9c9d4d671b94345952d012cc2ea7a24',label:'Cérebro Humano',               icon:'🧠',parts:['brain','head']},
  ear:            {id:'a3802dd3253742258517e01eaee904f7',label:'Ouvido — Anatomia Completa',    icon:'👂',parts:['head']},
  sinuses:        {id:'53da9506380541db96cbc20bcd6f9808',label:'Seios Paranasais',             icon:'👃',parts:['head']},
  eye:            {id:'b42d09ed18034063a528d9b1a2a9654a',label:'Olho Humano',                  icon:'👁', parts:['eye_L','eye_R','head']},

  // ── Tórax / Cardio ──────────────────────────────────────
  lungs:          {id:'ce09f4099a68467880f46e61eb9a3531',label:'Pulmões Realistas',            icon:'🫁',parts:['lung_L','lung_R','chest']},
  tb_model:       {id:'964c010e4d5d4eb2b6aee958f7ab87bb',label:'Tuberculose — Modelo',         icon:'🔬',parts:['lung_L','lung_R','chest']},

  // ── Abdominal ────────────────────────────────────────────
  body_organs:    {id:'8a43f3a308994699a4000b17004d5220',label:'Órgãos Internos',             icon:'🫀',parts:['abdomen','stomach','liver','spleen','pancreas']},
  liver_spleen:   {id:'f9a34dba04624c28a3131970fcac4b81',label:'Fígado + Baço + Pâncreas',    icon:'🟤',parts:['liver','spleen','pancreas','abdomen']},
  liver:          {id:'6c4e9bd0d49f4828b804259330c0c6c4',label:'Fígado e Vesícula',           icon:'🔴',parts:['liver','abdomen']},
  stomach:        {id:'e0f1952de7204654ba469c3e887a029b',label:'Estômago Realista',            icon:'🟡',parts:['stomach','abdomen']},
  intestines:     {id:'ca8ebcaff77046ca8b3677aa14a1040b',label:'Intestino Delgado e Grosso', icon:'🌀',parts:['abdomen','stomach']},
  kidney:         {id:'e1476ceb1e3b4412af5418eee9c5ed08',label:'Rim Humano',                  icon:'🫘',parts:['kidney_L','kidney_R','abdomen']},

  // ── Coluna / Esqueleto ───────────────────────────────────
  spine:          {id:'bcd9eee09ce044ef98a69c315aa792e2',label:'Coluna Vertebral',            icon:'🦴',parts:['spine','neck','pelvis']},
  pelvis:         {id:'c24dc91c4aae4114abe1aaf5f71fb03a',label:'Pelve e Coxas',               icon:'🦵',parts:['pelvis','bone_pelvis','thigh_L','thigh_R','knee_L','knee_R']},

  // ── Sistema Reprodutor Feminino ─────────────────────────
  female_reproductive: {id:'445e5d3977d848419253a4058137555f',label:'Sistema Reprodutor Feminino',     icon:'♀️',parts:['pelvis','abdomen'],gender:'F'},
  uterus_ovaries:      {id:'05388341fa7345c9a8f0f67a9648c335',label:'Útero e Ovários',                 icon:'🔵',parts:['pelvis','abdomen'],gender:'F'},
  uterus_endo:         {id:'4a58f93ac4104bd087fff9977c735d67',label:'Útero com Endometriose',          icon:'🔬',parts:['pelvis','abdomen'],gender:'F'},
  female_pelvic:       {id:'46ad109760144930a5fc5e4289b2f81e',label:'Assoalho Pélvico Feminino',       icon:'🔵',parts:['pelvis','abdomen'],gender:'F'},

  // ── Sistema Reprodutor Masculino ────────────────────────
  male_urinary:        {id:'2c04bed82f2445b5ad0211bfa9e893c4',label:'Sistema Reprodutor e Urinário M', icon:'♂️',parts:['pelvis','bladder','abdomen'],gender:'M'},

  // ── Referência legacy ────────────────────────────────────
  reproductive:   {id:'17bdcd1c2e9046d1abde72eff5c2cd0d',label:'Sistema Reprodutivo (geral)',   icon:'🔵',parts:['pelvis','abdomen']},
};

// Override específico por doença (sobrepõe lógica de partes)
const DISEASE_MODEL_OVERRIDE = {
  tuberculose:       'tb_model',
  dpoc:              'lungs',
  asma:              'lungs',
  embolia_pulm:      'lungs',
  pneumonia:         'lungs',
  covid19:           'lungs',
  febre_amarela:     'liver_spleen',
  cirrose:           'liver_spleen',
  cancro_hepatico:   'liver',
  colelitíase:       'liver',
  esquistossomose:   'liver_spleen',
  leishmaniose:      'liver_spleen',
  pancreatite:       'liver_spleen',
  cancro_colon:      'intestines',
  diarreia_aguda:    'intestines',
  amebíase:          'intestines',
  giardíase:         'intestines',
  colera:            'intestines',
  sinusite:          'sinuses',
  otite:             'ear',
  endometriose:      'uterus_endo',
  ovario_pq:         'uterus_ovaries',
  fibroma:           'uterus_ovaries',
  cancro_colo:       'female_pelvic',
  eclampsia:         'uterus_ovaries',
  prostata:          'male_urinary',
  cancro_prostata:   'male_urinary',
  infcao_urinaria:   'kidney',
  calc_renal:        'kidney',
  nefrolitiase:      'kidney',
  alzheimer:         'brain',
  parkinson:         'brain',
  esclerose_mult:    'brain',
  epilepsia:         'brain',
  avc:               'brain',
  meningite:         'brain',
  tripanossomiase:   'brain',
};

const PART_TO_MODEL = {
  brain:'brain',     head:'brain',
  lung_L:'lungs',    lung_R:'lungs',    chest:'lungs',
  heart:'body_xr',
  liver:'liver_spleen', spleen:'liver_spleen',
  stomach:'stomach', pancreas:'liver_spleen', abdomen:'body_organs',
  kidney_L:'kidney', kidney_R:'kidney', bladder:'kidney',
  eye_L:'eye',       eye_R:'eye',
  spine:'spine',     neck:'spine',
  pelvis:'pelvis',   bone_pelvis:'pelvis', thigh_L:'pelvis', thigh_R:'pelvis',
  knee_L:'muscles_bones', knee_R:'muscles_bones',
  hand_L:'muscles_bones', hand_R:'muscles_bones',
  foot_L:'muscles_bones', foot_R:'muscles_bones',
  shin_L:'muscles_bones', shin_R:'muscles_bones',
  skin:'body_holo',  thyroid:'spine',
  arm_L:'muscles_bones', arm_R:'muscles_bones',
  shoulder_L:'muscles_bones', shoulder_R:'muscles_bones',
};

function getBestModel(parts, diseaseKey) {
  if (diseaseKey && DISEASE_MODEL_OVERRIDE[diseaseKey]) return DISEASE_MODEL_OVERRIDE[diseaseKey];
  if (!parts?.length) return 'body_xr';
  const priority = ['brain','lungs','tb_model','liver_spleen','liver','kidney','stomach','intestines','eye','ear','sinuses','spine','pelvis','muscles_bones','body_organs','body_xr'];
  for (const p of priority) {
    const m = ATLAS_MODELS[p];
    if (m && parts.some(pt => m.parts.includes(pt))) return p;
  }
  for (const part of parts) { const mk = PART_TO_MODEL[part]; if (mk) return mk; }
  return 'body_xr';
}

// Grupos de modelos por categoria para o selector
const ATLAS_GROUPS = [
  {label:'Corpo Completo', keys:['body_xr','body_full','body_holo','anatomy_full','muscles_bones']},
  {label:'Cabeça/Neuro',   keys:['brain','ear','sinuses','eye']},
  {label:'Tórax',          keys:['lungs','tb_model']},
  {label:'Abdominal',      keys:['body_organs','liver_spleen','liver','stomach','intestines','kidney']},
  {label:'Esqueleto',      keys:['spine','pelvis']},
  {label:'Feminino ♀',     keys:['female_reproductive','uterus_ovaries','uterus_endo','female_pelvic']},
  {label:'Masculino ♂',    keys:['male_urinary','reproductive']},
];

const DISEASE_CATS = [
  {label:'Angola Top',     keys:['malaria','tuberculose','hiv_sida','febre_amarela','drepanocitose','colera']},
  {label:'Cardiovascular', keys:['infarto','avc','hipertensao','insuf_cardiaca','fibrilacao','angina']},
  {label:'Respiratório',   keys:['pneumonia','covid19','asma','dpoc','embolia_pulm','tuberculose']},
  {label:'Parasitário',    keys:['malaria','esquistossomose','tripanossomiase','filariose','amebíase','leishmaniose']},
  {label:'Oncológico',     keys:['cancro_colo','cancro_mama','cancro_colon','cancro_prostata','cancro_hepatico']},
  {label:'Ginecológico',   keys:['endometriose','ovario_pq','fibroma','eclampsia','cancro_colo']},
];

const SYSTEMS = {
  all:        {label:'TODOS',         parts:[],                                          col:G.teal},
  cardio:     {label:'CARDIOVASCULAR',parts:['heart','lung_L','lung_R','thyroid','chest','arm_L'],col:'#FF4455'},
  neuro:      {label:'NEUROLÓGICO',   parts:['brain','head','spine'],                   col:'#AA44FF'},
  digestivo:  {label:'DIGESTIVO',     parts:['stomach','liver','pancreas','spleen','bladder'],col:'#FF8800'},
  renal:      {label:'RENAL',         parts:['kidney_L','kidney_R','bladder'],          col:'#00AAFF'},
  musculo:    {label:'MÚSCULO-ESQ.',  parts:['chest','abdomen','pelvis','spine','knee_L','knee_R'],col:'#44FF88'},
  oftalmo:    {label:'OFTALMOLÓGICO', parts:['eye_L','eye_R'],                          col:'#FFDD00'},
  reprodutivo:{label:'REPRODUTIVO',   parts:['pelvis','abdomen'],                       col:'#FF88CC'},
};

// ── Constrói URL do iframe Sketchfab ─────────────────────
const sfUrl = (id) =>
  `https://sketchfab.com/models/${id}/embed?autospin=0&autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_stop=0&preload=1`;

// ══════════════════════════════════════════════════════════
export default function Holografia({ threeRef }) {
  const [query,      setQuery]      = useState('');
  const [sel,        setSel]        = useState(null);
  const [sugs,       setSugs]       = useState([]);
  const [scanning,   setScanning]   = useState(false);
  const [vitals,     setVitals]     = useState({hr:72,spo2:98.0,temp:36.6,bp:'120/80',rr:16});
  const [infoOpen,   setInfoOpen]   = useState(true);
  const [atlasModel, setAtlasModel] = useState('body_xr');
  const [atlasOpen,  setAtlasOpen]  = useState(false);
  const [atlasGroup, setAtlasGroup] = useState(0);
  const [iframeKey,  setIframeKey]  = useState(0);
  const [genderMode, setGenderMode] = useState('all'); // 'all' | 'F' | 'M'
  const vitRef = useRef();
  const cleanupRef = useRef(null);

  useThreeJS(threeRef, cleanupRef);

  // Simulação de vitals
  useEffect(() => {
    vitRef.current = setInterval(() => {
      setVitals(v => ({
        hr:   Math.round(v.hr   + (Math.random()-0.5)*2),
        spo2: Math.round((v.spo2 + (Math.random()-0.5)*0.4)*10)/10,
        temp: Math.round((v.temp + (Math.random()-0.5)*0.08)*10)/10,
        bp:   v.bp,
        rr:   Math.round(v.rr   + (Math.random()-0.5)),
      }));
    }, 2000);
    return () => clearInterval(vitRef.current);
  }, []);

  const selectDisease = (key) => {
    setSel(key); setQuery(DISEASES[key].label); setSugs([]); setInfoOpen(true);
    const bestModel = getBestModel(DISEASES[key].parts, key);
    setAtlasModel(bestModel);
    setIframeKey(k => k+1);
    threeRef.current?.highlight(DISEASES[key].parts, DISEASES[key].sevC);
  };

  const handleQuery = (v) => {
    setQuery(v);
    if (v.length < 2) { setSugs(Object.entries(DISEASES).slice(0,10)); return; }
    setSugs(Object.entries(DISEASES).filter(([k,d]) =>
      d.label.toLowerCase().includes(v.toLowerCase()) ||
      d.cat.toLowerCase().includes(v.toLowerCase()) ||
      (d.sintomas||[]).some(s => s.toLowerCase().includes(v.toLowerCase()))
    ).slice(0,8));
  };

  const D = sel ? DISEASES[sel] : null;
  const currentModel = ATLAS_MODELS[atlasModel];

  // Filtra modelos por género
  const filteredAtlasGroups = useMemo(() => {
    return ATLAS_GROUPS.map(grp => ({
      ...grp,
      keys: grp.keys.filter(k => {
        const m = ATLAS_MODELS[k];
        if (!m) return false;
        if (genderMode === 'F' && m.gender === 'M') return false;
        if (genderMode === 'M' && m.gender === 'F') return false;
        return true;
      }),
    })).filter(g => g.keys.length > 0);
  }, [genderMode]);

  return (
    <div style={{display:'flex',height:'100%',gap:0,overflow:'hidden'}}>

      {/* ── Painel esquerdo — Three.js + pesquisa ─────── */}
      <div style={{width:300,display:'flex',flexDirection:'column',flexShrink:0,
        borderRight:`1px solid ${G.border}`,overflow:'hidden'}}>

        {/* Three.js canvas */}
        <div style={{flex:1,position:'relative',background:'#020100',minHeight:0}}>
          <div ref={threeRef} style={{width:'100%',height:'100%'}}/>

          {/* Sistemas highlight */}
          <div style={{position:'absolute',bottom:8,left:8,right:8,display:'flex',gap:4,flexWrap:'wrap'}}>
            {Object.entries(SYSTEMS).map(([k,s])=>(
              <button key={k} onClick={()=>{
                if(k==='all') threeRef.current?.highlight([],G.gold);
                else threeRef.current?.highlight(s.parts,s.col);
              }} style={{fontFamily:'Orbitron',fontSize:6,letterSpacing:0.8,padding:'3px 7px',
                background:`${s.col}18`,border:`1px solid ${s.col}44`,color:s.col,borderRadius:2,cursor:'pointer'}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pesquisa de doenças */}
        <div style={{padding:14,borderTop:`1px solid ${G.border}`,background:'rgba(6,4,1,0.95)',flexShrink:0}}>
          <div style={{position:'relative',marginBottom:8}}>
            <input value={query} onChange={e=>handleQuery(e.target.value)}
              onFocus={()=>{if(query.length<2)setSugs(Object.entries(DISEASES).slice(0,10));}}
              onBlur={()=>setTimeout(()=>setSugs([]),200)}
              placeholder="🔍 Pesquisar doença..."
              style={{width:'100%',padding:'8px 10px',fontFamily:'Rajdhani',fontSize:11,color:G.text,
                background:'rgba(212,175,55,0.04)',border:`1px solid ${G.border}`,
                borderRadius:2,outline:'none',boxSizing:'border-box'}}/>
            {sugs.length>0&&(
              <div style={{position:'absolute',bottom:'100%',left:0,right:0,background:'rgba(8,5,1,0.98)',
                border:`1px solid ${G.border}`,borderRadius:2,maxHeight:200,overflowY:'auto',zIndex:50}}>
                {sugs.map(([k,d])=>(
                  <div key={k} onMouseDown={()=>selectDisease(k)}
                    style={{padding:'7px 10px',cursor:'pointer',borderBottom:`1px solid rgba(212,175,55,0.06)`,
                      display:'flex',justifyContent:'space-between',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(212,175,55,0.07)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text,fontWeight:600}}>{d.label}</div>
                    <div style={{fontFamily:'Orbitron',fontSize:7,color:d.sevC,letterSpacing:1}}>{d.sev}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categorias rápidas */}
          {DISEASE_CATS.map(cat=>(
            <div key={cat.label} style={{marginBottom:6}}>
              <div style={{fontFamily:'Orbitron',fontSize:7,color:G.dimL,letterSpacing:1,marginBottom:4}}>{cat.label}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {cat.keys.map(k=>{const d=DISEASES[k];if(!d)return null;return(
                  <button key={k} onClick={()=>selectDisease(k)}
                    style={{fontFamily:'Rajdhani',fontSize:9,fontWeight:600,padding:'2px 7px',cursor:'pointer',
                      background:sel===k?`${d.sevC}22`:'rgba(212,175,55,0.04)',
                      border:`1px solid ${sel===k?d.sevC:G.border}`,color:sel===k?d.sevC:G.dimL,borderRadius:2}}>
                    {d.label.split(' ')[0]}
                  </button>
                );})}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel central — Sketchfab iframe ────────── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>

        {/* Atlas selector header */}
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${G.border}`,flexShrink:0,
          display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>setAtlasOpen(v=>!v)}
            style={{fontFamily:'Orbitron',fontSize:8,letterSpacing:1.5,padding:'5px 12px',
              background:`${G.gold}10`,border:`1px solid ${G.border}`,color:G.gold,
              borderRadius:2,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            {currentModel?.icon} ATLAS 3D {atlasOpen?'▲':'▼'}
          </button>

          {/* Toggle género */}
          <div style={{display:'flex',gap:4}}>
            {[['all','⚧ Todos'],['F','♀ Feminino'],['M','♂ Masculino']].map(([v,l])=>(
              <button key={v} onClick={()=>setGenderMode(v)}
                style={{fontFamily:'Rajdhani',fontSize:10,fontWeight:600,padding:'4px 9px',borderRadius:2,cursor:'pointer',
                  background:genderMode===v?'rgba(212,175,55,0.15)':'transparent',
                  border:`1px solid ${genderMode===v?G.gold:G.border}`,
                  color:genderMode===v?G.gold:G.dimL}}>
                {l}
              </button>
            ))}
          </div>

          {currentModel && (
            <div style={{marginLeft:'auto',fontFamily:'Rajdhani',fontSize:11,color:G.dimL}}>
              {currentModel.icon} {currentModel.label}
              {currentModel.gender&&<span style={{marginLeft:6,color:currentModel.gender==='F'?'#FF88CC':'#88AAFF'}}>
                {currentModel.gender==='F'?'♀ Feminino':'♂ Masculino'}
              </span>}
            </div>
          )}
        </div>

        {/* Atlas panel */}
        {atlasOpen&&(
          <div style={{background:'rgba(6,4,1,0.97)',borderBottom:`1px solid ${G.border}`,
            padding:'12px 16px',flexShrink:0,maxHeight:220,overflowY:'auto'}}>
            {/* Tab de grupo */}
            <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
              {filteredAtlasGroups.map((g,i)=>(
                <button key={i} onClick={()=>setAtlasGroup(i)}
                  style={{fontFamily:'Orbitron',fontSize:7,letterSpacing:1,padding:'3px 9px',borderRadius:2,cursor:'pointer',
                    background:atlasGroup===i?`${G.gold}18`:'transparent',
                    border:`1px solid ${atlasGroup===i?G.gold:G.border}`,
                    color:atlasGroup===i?G.gold:G.dimL}}>
                  {g.label}
                </button>
              ))}
            </div>
            {/* Modelos do grupo */}
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {(filteredAtlasGroups[atlasGroup]?.keys||[]).map(k=>{
                const m=ATLAS_MODELS[k]; if(!m)return null;
                const active=atlasModel===k;
                return(
                  <button key={k} onClick={()=>{setAtlasModel(k);setIframeKey(n=>n+1);setAtlasOpen(false);}}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',cursor:'pointer',borderRadius:2,
                      background:active?`${G.gold}16`:`rgba(212,175,55,0.03)`,
                      border:`1px solid ${active?G.gold:G.border}`,color:active?G.gold:G.dimL,
                      fontFamily:'Rajdhani',fontSize:11,fontWeight:active?700:400,
                      transition:'all 0.15s'}}>
                    <span>{m.icon}</span>
                    <span style={{maxWidth:160,textAlign:'left',lineHeight:1.2}}>{m.label}</span>
                    {m.gender&&<span style={{fontSize:8,color:m.gender==='F'?'#FF88CC':'#88AAFF'}}>{m.gender}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sketchfab iframe */}
        <div style={{flex:1,position:'relative',background:'#010100'}}>
          {currentModel?.id ? (
            <iframe key={iframeKey} title={currentModel.label}
              src={sfUrl(currentModel.id)}
              style={{width:'100%',height:'100%',border:'none'}}
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen/>
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'Rajdhani',fontSize:13,color:G.dim}}>
              Selecciona um modelo no Atlas 3D
            </div>
          )}

          {/* Label do modelo */}
          <div style={{position:'absolute',bottom:12,left:12,
            fontFamily:'Orbitron',fontSize:7,color:`${G.gold}88`,letterSpacing:2,
            background:'rgba(0,0,0,0.6)',padding:'4px 8px',borderRadius:2}}>
            FUMUGOLD · HOLOGRAMA MÉDICO 3D {currentModel?.gender?`· ${currentModel.gender==='F'?'♀':'♂'}`:''}
          </div>
        </div>
      </div>

      {/* ── Painel direito — Info da doença + vitais ─── */}
      <div style={{width:280,display:'flex',flexDirection:'column',flexShrink:0,
        borderLeft:`1px solid ${G.border}`,overflow:'hidden'}}>

        {/* Vitais */}
        <div style={{padding:'10px 12px',borderBottom:`1px solid ${G.border}`,flexShrink:0}}>
          <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:2,marginBottom:8}}>SINAIS VITAIS — SIMULAÇÃO</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {label:'FC',val:`${vitals.hr}`,unit:'bpm',col:G.red,ok:vitals.hr>=60&&vitals.hr<=100},
              {label:'SpO₂',val:`${vitals.spo2}`,unit:'%',col:G.teal,ok:vitals.spo2>=95},
              {label:'Temp',val:`${vitals.temp}`,unit:'°C',col:G.amber,ok:vitals.temp>=36.0&&vitals.temp<=37.5},
              {label:'FR',val:`${vitals.rr}`,unit:'/min',col:G.purple,ok:vitals.rr>=12&&vitals.rr<=20},
            ].map(v=>(
              <div key={v.label} style={{padding:'6px 8px',background:`${v.col}10`,border:`1px solid ${v.col}30`,borderRadius:2}}>
                <div style={{fontFamily:'Orbitron',fontSize:6.5,color:v.col,letterSpacing:1,marginBottom:2}}>{v.label}</div>
                <div style={{fontFamily:'Orbitron',fontSize:15,color:v.ok?v.col:G.red,fontWeight:700}}>{v.val}</div>
                <div style={{fontFamily:'Rajdhani',fontSize:8,color:G.dimL}}>{v.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info da doença seleccionada */}
        <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>
          {D ? (
            <>
              <div style={{fontFamily:'Orbitron',fontSize:8,color:D.sevC,letterSpacing:1,marginBottom:2}}>{D.sev}</div>
              <div style={{fontFamily:'Cinzel',fontSize:13,fontWeight:700,color:G.gold,marginBottom:4,lineHeight:1.3}}>{D.label}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:9,color:G.dimL,marginBottom:10}}>{D.cat}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.text,lineHeight:1.6,marginBottom:12}}>{D.descricao}</div>

              <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:1,marginBottom:6}}>SINTOMAS</div>
              {(D.sintomas||[]).map((s,i)=>(
                <div key={i} style={{display:'flex',gap:6,marginBottom:5,alignItems:'flex-start'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:D.sevC,flexShrink:0,marginTop:4}}/>
                  <div style={{fontFamily:'Rajdhani',fontSize:10,color:G.text,lineHeight:1.5}}>{s}</div>
                </div>
              ))}

              <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:1,margin:'12px 0 6px'}}>PARTES AFECTADAS</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {(D.parts||[]).map(p=>(
                  <div key={p} style={{fontFamily:'Orbitron',fontSize:7,padding:'3px 7px',borderRadius:2,
                    background:`${D.sevC}15`,border:`1px solid ${D.sevC}44`,color:D.sevC,letterSpacing:0.5}}>
                    {p.toUpperCase()}
                  </div>
                ))}
              </div>

              <div style={{marginTop:12,fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:1,marginBottom:6}}>MODELO 3D</div>
              <div style={{fontFamily:'Rajdhani',fontSize:11,color:G.text}}>
                {ATLAS_MODELS[getBestModel(D.parts,sel)]?.icon} {ATLAS_MODELS[getBestModel(D.parts,sel)]?.label}
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',marginTop:40,color:G.dim,fontFamily:'Rajdhani',fontSize:12}}>
              <div style={{fontSize:32,marginBottom:8}}>🔬</div>
              Pesquisa ou selecciona uma doença para ver o mapeamento 3D
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
