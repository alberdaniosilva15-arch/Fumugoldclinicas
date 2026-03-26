// ═══════════════════════════════════════════════════════════
//  FumuGold V4 — ClinicContext
//  Estado global + fetch real do Supabase com auth token
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { DISEASES } from '../data/diseases.js';
import { G } from '../theme.js';
import { buildClinicDataBundle, persistArchiveBundle, LOCAL_SNAPSHOT_KEY } from '../fumugold_local_tools.js';
import { syncClinicToSupabase } from '../supabase_sync.js';
import { makeAuthHeaders } from '../auth/supabaseAuth.js';

export const ClinicCtx = React.createContext(null);
export const useClinic = () => React.useContext(ClinicCtx);

// Supabase REST fetch helper
async function supaFetch(url, table, accessToken) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?order=updated_at.desc&limit=500`, {
      headers: makeAuthHeaders(accessToken),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(r => ({ id: r.id, ...r.data }));
  } catch { return null; }
}

// ── Dados demo (enquanto Supabase está vazio) ─────────────
const TODAY = new Date().toISOString().split('T')[0];
const DEMO_PATIENTS = [
  {id:'p1',nome:'Maria Antónia Lopes',idade:34,genero:'F',diagKey:'malaria',status:'critical',ward:'A',cama:'A-03',dr:'Dr. Santos',contact:'+244 912 345 678'},
  {id:'p2',nome:'João Eduardo Ferreira',idade:52,genero:'M',diagKey:'hipertensao',status:'active',ward:'B',cama:'B-07',dr:'Dr. Cunha',contact:'+244 923 456 789'},
  {id:'p3',nome:'Ana Beatriz Neto',idade:28,genero:'F',diagKey:'diabetes',status:'active',ward:'A',cama:'A-09',dr:'Dra. Mendes',contact:'+244 934 567 890'},
  {id:'p4',nome:'Carlos Filipe Dias',idade:67,genero:'M',diagKey:'infarto',status:'critical',ward:'UCI',cama:'UCI-2',dr:'Dr. Alves',contact:'+244 945 678 901'},
  {id:'p5',nome:'Sofia Cristina Lima',idade:19,genero:'F',diagKey:'tuberculose',status:'active',ward:'C',cama:'C-01',dr:'Dr. Santos',contact:'+244 956 789 012'},
];
const DEMO_APPTS = [
  {id:'a1',patient:'Maria Antónia Lopes',date:TODAY,time:'09:00',dr:'Dr. Santos',type:'Consulta',status:'confirmed'},
  {id:'a2',patient:'João Eduardo Ferreira',date:TODAY,time:'10:30',dr:'Dr. Cunha',type:'Follow-up',status:'confirmed'},
  {id:'a3',patient:'Pedro Manuel Costa',date:TODAY,time:'14:00',dr:'Dra. Mendes',type:'Consulta',status:'pending'},
];
const DEMO_INVOICES = [
  {id:'i1',patient:'Maria Antónia Lopes',amount:85000,currency:'AOA',status:'pending',date:TODAY,service:'Internamento 3 dias'},
  {id:'i2',patient:'Carlos Filipe Dias',amount:250000,currency:'AOA',status:'pending',date:TODAY,service:'UCI + Exames'},
  {id:'i3',patient:'Ana Beatriz Neto',amount:45000,currency:'AOA',status:'paid',date:TODAY,service:'Consulta + Análises'},
];
const DEMO_BEDS = [
  {id:'b1',ward:'A',number:'A-03',status:'occupied',patient:'Maria Antónia Lopes'},
  {id:'b2',ward:'A',number:'A-07',status:'free'},
  {id:'b3',ward:'B',number:'B-07',status:'occupied',patient:'João Eduardo Ferreira'},
  {id:'b4',ward:'UCI',number:'UCI-2',status:'occupied',patient:'Carlos Filipe Dias'},
  {id:'b5',ward:'C',number:'C-01',status:'occupied',patient:'Sofia Cristina Lima'},
  {id:'b6',ward:'B',number:'B-12',status:'free'},
];
const DEMO_STAFF = [
  {id:'s1',nome:'Dr. António Santos',role:'Médico',dept:'Medicina Interna',status:'active',turno:'Manhã'},
  {id:'s2',nome:'Dr. Luís Cunha',role:'Médico',dept:'Cardiologia',status:'active',turno:'Tarde'},
  {id:'s3',nome:'Dra. Carla Mendes',role:'Médica',dept:'Endocrinologia',status:'active',turno:'Manhã'},
  {id:'s4',nome:'Enf. Rosa Baptista',role:'Enfermeira',dept:'UCI',status:'active',turno:'Noite'},
];
const DEMO_NOTIFICATIONS = [
  {id:'n1',type:'critical',msg:'Paciente Carlos Dias — SpO₂ 88% — UCI-2',time:'14:32',read:false},
  {id:'n2',type:'warning',msg:'Stock de Artesunato em fim — reordenar',time:'13:15',read:false},
  {id:'n3',type:'info',msg:'3 consultas agendadas para amanhã',time:'09:00',read:true},
];
const INT_DEFAULT = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  n8nWebhook: import.meta.env.VITE_N8N_WEBHOOK || '',
  autoSync: false, syncStatus: 'idle', lastSyncAt: null,
  localArchiveEnabled: false, archiveFrequencyMin: 15,
  archiveFormat: 'json', archiveToFolder: false,
  archiveCount: 0, lastArchiveAt: null, lastArchiveError: '',
  tableMap: {},
};
const SETTINGS_DEFAULT = {
  clinicName:'FUMUGOLD Clínica', clinicPhone:'+244 222 000 111',
  clinicEmail:'info@fumugold.ao', clinicAddress:'Rua da Missão 45, Luanda',
  lang:'Português', timezone:'Africa/Luanda', darkMode:true,
};

// ══════════════════════════════════════════════════════════
export function ClinicProvider({ children, setTab, threeRef, session }) {
  const [patients,      setPatients]      = useState([]);
  const [appointments,  setAppointments]  = useState([]);
  const [labResults,    setLabResults]    = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [beds,          setBeds]          = useState([]);
  const [staff,         setStaff]         = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [surgeries,     setSurgeries]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [integrations,  setIntegrations]  = useState(INT_DEFAULT);
  const [settings,      setSettings]      = useState(SETTINGS_DEFAULT);
  const [loaded,        setLoaded]        = useState(false);
  const [supaLoaded,    setSupaLoaded]    = useState(false);
  const lastSyncRef = useRef(0);

  // 1. localStorage → estado (imediato, offline)
  useEffect(() => {
    (async () => {
      const map = {
        patients:setPatients, appointments:setAppointments, labResults:setLabResults,
        prescriptions:setPrescriptions, invoices:setInvoices, beds:setBeds,
        staff:setStaff, messages:setMessages, surgeries:setSurgeries,
        notifications:setNotifications, integrations:setIntegrations, settings:setSettings,
      };
      for (const [k, setter] of Object.entries(map)) {
        try {
          const r = await window.storage.get('clinic_' + k);
          if (r?.value) {
            const parsed = JSON.parse(r.value);
            if (k === 'integrations') setter(p => ({ ...INT_DEFAULT, ...parsed }));
            else setter(parsed);
          }
        } catch { /* ok */ }
      }
      // Fallback demo se arrays ainda vazios
      setPatients(p      => p.length ? p : DEMO_PATIENTS);
      setAppointments(p  => p.length ? p : DEMO_APPTS);
      setInvoices(p      => p.length ? p : DEMO_INVOICES);
      setBeds(p          => p.length ? p : DEMO_BEDS);
      setStaff(p         => p.length ? p : DEMO_STAFF);
      setNotifications(p => p.length ? p : DEMO_NOTIFICATIONS);
      setLoaded(true);
    })();
  }, []);

  // 2. Supabase → estado (quando autenticado)
  useEffect(() => {
    if (!loaded || !session?.access_token) return;
    const url = integrations.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';
    if (!url) return;

    (async () => {
      const tk = session.access_token;
      const [p, a, l, rx, inv, b, s, m, sur, n] = await Promise.all([
        supaFetch(url, 'fg_patients',      tk),
        supaFetch(url, 'fg_appointments',  tk),
        supaFetch(url, 'fg_lab_results',   tk),
        supaFetch(url, 'fg_prescriptions', tk),
        supaFetch(url, 'fg_invoices',      tk),
        supaFetch(url, 'fg_beds',          tk),
        supaFetch(url, 'fg_staff',         tk),
        supaFetch(url, 'fg_messages',      tk),
        supaFetch(url, 'fg_surgeries',     tk),
        supaFetch(url, 'fg_notifications', tk),
      ]);
      if (p?.length)   setPatients(p);
      if (a?.length)   setAppointments(a);
      if (l?.length)   setLabResults(l);
      if (rx?.length)  setPrescriptions(rx);
      if (inv?.length) setInvoices(inv);
      if (b?.length)   setBeds(b);
      if (s?.length)   setStaff(s);
      if (m?.length)   setMessages(m);
      if (sur?.length) setSurgeries(sur);
      if (n?.length)   setNotifications(n);
      setSupaLoaded(true);
    })();
  }, [loaded, session?.access_token, integrations.supabaseUrl]);

  // 3. Persiste no localStorage
  useEffect(() => { if (loaded) window.storage.set('clinic_patients',      JSON.stringify(patients));      }, [patients, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_appointments',  JSON.stringify(appointments));  }, [appointments, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_labResults',    JSON.stringify(labResults));    }, [labResults, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_prescriptions', JSON.stringify(prescriptions)); }, [prescriptions, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_invoices',      JSON.stringify(invoices));      }, [invoices, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_beds',          JSON.stringify(beds));          }, [beds, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_staff',         JSON.stringify(staff));         }, [staff, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_messages',      JSON.stringify(messages));      }, [messages, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_surgeries',     JSON.stringify(surgeries));     }, [surgeries, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_notifications', JSON.stringify(notifications)); }, [notifications, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_integrations',  JSON.stringify(integrations));  }, [integrations, loaded]);
  useEffect(() => { if (loaded) window.storage.set('clinic_settings',      JSON.stringify(settings));      }, [settings, loaded]);

  // 4. Auto-sync → Supabase
  useEffect(() => {
    if (!loaded || !integrations.autoSync) return;
    const url = integrations.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const key = integrations.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    if (Date.now() - lastSyncRef.current < 3 * 60 * 1000) return;
    lastSyncRef.current = Date.now();
    const payload = { patients, appointments, labResults, prescriptions, invoices, beds, staff, messages, surgeries, notifications };
    syncClinicToSupabase({ supabaseUrl: url, supabaseAnonKey: key, tableMap: integrations.tableMap || {} }, payload)
      .then(result => setIntegrations(p => ({ ...p, syncStatus: result.ok ? 'ready' : 'error', lastSyncAt: new Date().toISOString() })));
  }, [loaded, patients, appointments, integrations.autoSync, integrations.supabaseUrl]);

  // Helpers
  const viewPatient3D = (patient) => {
    if (!patient?.diagKey) return;
    const d = DISEASES[patient.diagKey];
    if (!d) return;
    setTab('holografia');
    setTimeout(() => threeRef.current?.highlight(d.parts, d.sevC), 500);
  };

  const addNotification = (type, msg) =>
    setNotifications(p => [
      { id: Date.now(), type, msg, time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), read: false },
      ...p.slice(0, 19),
    ]);

  if (!loaded) return (
    <div style={{ width: '100%', height: '100vh', background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;600&display=swap');
        @keyframes sl{0%{left:-45%;}100%{left:100%;}}`}</style>
      <div style={{ fontFamily: 'Orbitron', fontSize: 13, color: G.gold, letterSpacing: 4 }}>◈ FUMUGOLD</div>
      <div style={{ fontFamily: 'Rajdhani', fontSize: 11, color: G.dim, letterSpacing: 2, marginTop: -8 }}>CARREGANDO...</div>
      <div style={{ width: 220, height: 2, background: `${G.gold}15`, borderRadius: 2, overflow: 'hidden', marginTop: 8, position: 'relative' }}>
        <div style={{ height: '100%', background: G.gold, borderRadius: 2, width: '45%', position: 'absolute', animation: 'sl 1.2s linear infinite' }} />
      </div>
    </div>
  );

  return (
    <ClinicCtx.Provider value={{
      patients, setPatients, appointments, setAppointments,
      labResults, setLabResults, prescriptions, setPrescriptions,
      invoices, setInvoices, beds, setBeds, staff, setStaff,
      messages, setMessages, surgeries, setSurgeries,
      notifications, setNotifications, integrations, setIntegrations,
      settings, setSettings, session, supaLoaded,
      addNotification, viewPatient3D,
    }}>
      {children}
    </ClinicCtx.Provider>
  );
}
