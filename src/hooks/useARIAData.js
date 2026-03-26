// FumuGold — useARIAData: agrega dados para a ARIA
import { useState, useEffect } from 'react';
import { supa } from '../lib/supabase.js';
import { useClinic } from '../context/ClinicContext.jsx';

export function useARIAData() {
  const { patients, appointments, invoices, notifications } = useClinic();
  const [raw, setRaw]   = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
        const since14 = new Date(Date.now() - 14 * 86400000).toISOString();

        // Tentar carregar do Supabase
        const [clientes, routing, queue, alerts, agendaHoje] = await Promise.all([
          supa.from('clientes').select('phone,contact_name,is_vip,total_messages,last_seen,satisfaction_avg').order('last_seen').limit(200).get(),
          supa.from('message_routing').select('phone,contact_name,message,categoria,sentimento,urgencia,necessita_humano,timestamp').order('timestamp').limit(200).get(),
          supa.from('live_chat_queue').select('ticket_id,phone,contact_name,last_message,categoria,status,priority,wait_since').order('wait_since').limit(50).get(),
          supa.from('urgent_alerts').select('id,phone,contact_name,message,urgencia,resolved,timestamp').eq('resolved', false).limit(30).get(),
          supa.from('fg_appointments').select('id,data').order('updated_at').limit(50).get(),
        ]);

        if (!mounted) return;

        // KPIs WhatsApp
        const totalClientes   = clientes.length;
        const vipCount        = clientes.filter(c => c.is_vip).length;
        const ativos7d        = clientes.filter(c => c.last_seen >= since7).length;
        const inativos14d     = clientes.filter(c => !c.last_seen || c.last_seen < since14).length;
        const totalMsgsHistorico = clientes.reduce((s, c) => s + (c.total_messages || 0), 0);
        const msgsHoje        = routing.filter(r => r.timestamp?.startsWith(today)).length;
        const msgsUltimaHora  = routing.filter(r => r.timestamp >= new Date(Date.now() - 3600000).toISOString()).length;

        // Sentimento
        const sentPos = routing.filter(r => r.sentimento === 'positivo').length;
        const sentNeg = routing.filter(r => r.sentimento === 'negativo').length;
        const sentTotal = routing.length || 1;
        const pctPos = Math.round(sentPos / sentTotal * 100);
        const pctNeg = Math.round(sentNeg / sentTotal * 100);

        // Categorias top
        const catCount = {};
        routing.forEach(r => { if (r.categoria) catCount[r.categoria] = (catCount[r.categoria] || 0) + 1; });
        const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Alertas
        const alertasCriticos = alerts.filter(a => a.urgencia === 'critica').length;
        const totalAlertas    = alerts.length;
        const aguardandoHumano = queue.filter(q => q.status === 'waiting').length;

        // KPIs Clínica (dados locais)
        const totalPacientes  = patients.length;
        const consultasHoje   = appointments.filter(a => a.date === today).length;
        const consultasConf   = appointments.filter(a => a.date === today && a.status === 'confirmed').length;
        const consultasPend   = appointments.filter(a => a.date === today && a.status === 'pending').length;
        const totalFaturado   = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const totalRecebido   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);

        const agendaHojeFormatted = appointments
          .filter(a => a.date === today)
          .slice(0, 8)
          .map(a => ({ hora: a.time || '--:--', paciente_nome: a.patient || '?', medico: a.dr || '?', status: a.status || 'pending' }));

        if (!mounted) return;

        setRaw({ clientes, routing, queue, alerts: alerts.map(a => ({ ...a, contact_name: a.contact_name || a.phone, message: a.message || '' })), agendaHoje: agendaHojeFormatted, chatQueue: queue });
        setKpis({ totalClientes, vipCount, ativos7d, inativos14d, totalMsgsHistorico, msgsHoje, msgsUltimaHora, pctPos, pctNeg, topCats, alertasCriticos, totalAlertas, aguardandoHumano, totalPacientes, consultasHoje, consultasConf, consultasPend, totalFaturado, totalRecebido });
      } catch (e) {
        console.warn('[ARIA_DATA]', e.message);
        // Fallback com dados locais
        if (!mounted) return;
        setRaw({ clientes: [], routing: [], queue: [], alerts: [], agendaHoje: [], chatQueue: [] });
        setKpis({ totalClientes: patients.length, vipCount: 0, ativos7d: 0, inativos14d: 0, totalMsgsHistorico: 0, msgsHoje: 0, msgsUltimaHora: 0, pctPos: 0, pctNeg: 0, topCats: [], alertasCriticos: 0, totalAlertas: 0, aguardandoHumano: 0, totalPacientes: patients.length, consultasHoje: 0, consultasConf: 0, consultasPend: 0, totalFaturado: 0, totalRecebido: 0 });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000); // refresh 30s
    return () => { mounted = false; clearInterval(interval); };
  }, [patients.length, appointments.length, invoices.length]);

  return { raw, kpis, loading };
}
