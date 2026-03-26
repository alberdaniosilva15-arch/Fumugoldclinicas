// ═══════════════════════════════════════════════════════════
//  FumuGold V4 — WhatsApp Monitor
//  Lê dados REAIS das tabelas:
//    clientes          → perfil + VIP + total msgs
//    conversation_memory → histórico completo por telefone
//    message_routing   → classificação, sentimento, urgência
//    live_chat_queue   → conversas aguardando humano
//    urgent_alerts     → alertas críticos não resolvidos
//  Envia respostas via Ngrok (n8n webhook)
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { G } from '../theme.js';
import { supa } from '../lib/supabase.js';

const NGROK_URL = import.meta.env.VITE_NGROK_URL
  || '';

// Webhook do n8n que recebe respostas do staff
// Ajusta o path conforme o teu workflow
const REPLY_WEBHOOK = `${NGROK_URL}/webhook/fumugold-reply`;

// ── Cores por sentimento ─────────────────────────────────
const SENT_COLOR = {
  positivo: '#00FF88',
  negativo: '#FF3355',
  neutro:   '#9A8A5A',
};

// ── Tempo relativo ────────────────────────────────────────
function ago(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

// ── Carrega todos os clientes + conversas + estado ────────
async function loadAll() {
  const [clientes, routing, queue, alerts] = await Promise.all([
    supa.from('clientes')
      .select('phone,contact_name,is_vip,total_messages,last_seen,satisfaction_avg,tags')
      .order('last_seen')
      .limit(200)
      .get(),

    supa.from('message_routing')
      .select('phone,contact_name,message,categoria,sentimento,urgencia,necessita_humano,timestamp')
      .order('timestamp')
      .limit(500)
      .get(),

    supa.from('live_chat_queue')
      .select('ticket_id,phone,contact_name,last_message,categoria,status,priority,wait_since')
      .order('wait_since')
      .limit(100)
      .get(),

    supa.from('urgent_alerts')
      .select('id,phone,contact_name,message,categoria,urgencia,resolved,timestamp')
      .eq('resolved', false)
      .order('timestamp')
      .limit(50)
      .get(),
  ]);

  // Enriquece clientes com dados de routing e queue
  const routingByPhone = {};
  routing.forEach(r => {
    if (!routingByPhone[r.phone]) routingByPhone[r.phone] = [];
    routingByPhone[r.phone].push(r);
  });

  const queueByPhone = {};
  queue.forEach(q => { queueByPhone[q.phone] = q; });

  const alertsByPhone = {};
  alerts.forEach(a => {
    if (!alertsByPhone[a.phone]) alertsByPhone[a.phone] = [];
    alertsByPhone[a.phone].push(a);
  });

  // Lista unificada de contactos (clientes + routing que não têm perfil)
  const phonesSeen = new Set();
  const contacts = [];

  clientes.forEach(c => {
    phonesSeen.add(c.phone);
    const msgs = routingByPhone[c.phone] || [];
    const lastMsg = msgs[msgs.length - 1];
    contacts.push({
      phone:        c.phone,
      name:         c.contact_name || c.phone,
      isVip:        c.is_vip,
      totalMsgs:    c.total_messages || 0,
      lastSeen:     c.last_seen,
      satisfaction: c.satisfaction_avg,
      tags:         c.tags || [],
      lastMessage:  lastMsg?.message || '',
      lastSentiment:lastMsg?.sentimento || 'neutro',
      categoria:    lastMsg?.categoria || '',
      urgencia:     lastMsg?.urgencia || 'baixa',
      necessitaHumano: queueByPhone[c.phone] !== undefined,
      queueStatus:  queueByPhone[c.phone]?.status || null,
      queuePriority:queueByPhone[c.phone]?.priority || null,
      alertas:      alertsByPhone[c.phone] || [],
      msgsHoje:     msgs.filter(m => new Date(m.timestamp) > new Date(Date.now()-86400000)).length,
    });
  });

  // Adiciona contactos do routing sem perfil no clientes
  Object.keys(routingByPhone).forEach(phone => {
    if (phonesSeen.has(phone)) return;
    const msgs = routingByPhone[phone];
    const last = msgs[msgs.length - 1];
    contacts.push({
      phone,
      name:            last?.contact_name || phone,
      isVip:           false,
      totalMsgs:       msgs.length,
      lastSeen:        last?.timestamp,
      lastMessage:     last?.message || '',
      lastSentiment:   last?.sentimento || 'neutro',
      categoria:       last?.categoria || '',
      urgencia:        last?.urgencia || 'baixa',
      necessitaHumano: queueByPhone[phone] !== undefined,
      queueStatus:     queueByPhone[phone]?.status || null,
      alertas:         alertsByPhone[phone] || [],
      msgsHoje:        msgs.filter(m => new Date(m.timestamp) > new Date(Date.now()-86400000)).length,
    });
  });

  // Ordena: urgentes primeiro, depois por lastSeen
  contacts.sort((a, b) => {
    if (a.alertas.length && !b.alertas.length) return -1;
    if (!a.alertas.length && b.alertas.length) return 1;
    if (a.necessitaHumano && !b.necessitaHumano) return -1;
    if (!a.necessitaHumano && b.necessitaHumano) return 1;
    return new Date(b.lastSeen||0) - new Date(a.lastSeen||0);
  });

  return {
    contacts,
    queue,
    alerts,
    totalWaiting: queue.filter(q => q.status === 'waiting').length,
    totalAlerts:  alerts.length,
  };
}

// ── Carrega histórico completo de conversa por telefone ───
async function loadConversation(phone) {
  const msgs = await supa.from('conversation_memory')
    .select('phone,user_message,assistant_message,role,content,categoria,sentimento,model_used,timestamp,created_at')
    .eq('phone', phone)
    .order('timestamp', { ascending: true })
    .limit(200)
    .get();

  // Normaliza o formato (suporta os dois schemas)
  return msgs.map(m => {
    if (m.role && m.content) {
      return { role: m.role, text: m.content, ts: m.timestamp || m.created_at, model: m.model_used };
    }
    // Schema antigo com user_message / assistant_message
    const arr = [];
    if (m.user_message) arr.push({ role: 'user', text: m.user_message, ts: m.timestamp, categoria: m.categoria });
    if (m.assistant_message) arr.push({ role: 'assistant', text: m.assistant_message, ts: m.timestamp });
    return arr;
  }).flat();
}

// ── Envia resposta via n8n ────────────────────────────────
async function sendReply(phone, name, message) {
  const res = await fetch(REPLY_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // bypass ngrok browser warning
    },
    body: JSON.stringify({
      phone,
      name,
      message,
      source:    'fumugold_staff',
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text()}`);
  return true;
}

// ════════════════════════════════════════════════════════════
export default function WhatsAppMonitor() {
  const [allData,   setAllData]   = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [convMsgs,  setConvMsgs]  = useState([]);
  const [loadingConv,setLoadingConv]=useState(false);
  const [loading,   setLoading]   = useState(true);
  const [reply,     setReply]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [filter,    setFilter]    = useState('all');  // all|waiting|vip|urgent
  const [search,    setSearch]    = useState('');
  const chatEndRef = useRef(null);
  const pollRef    = useRef(null);

  // Carrega e faz poll a cada 8s
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const d = await loadAll();
      setAllData(d);
    } catch (e) {
      console.error('WhatsApp Monitor load error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 8000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Carrega conversa quando selecciona contacto
  useEffect(() => {
    if (!selected) return;
    setLoadingConv(true);
    loadConversation(selected.phone).then(msgs => {
      setConvMsgs(msgs);
      setLoadingConv(false);
    });
  }, [selected?.phone]);

  // Auto-scroll no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMsgs]);

  const handleSend = async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendReply(selected.phone, selected.name, reply.trim());
      // Adiciona localmente para feedback imediato
      setConvMsgs(prev => [...prev, {
        role: 'staff',
        text: reply.trim(),
        ts:   new Date().toISOString(),
      }]);
      setReply('');
    } catch (e) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  // Filtragem
  const contacts = (allData?.contacts || []).filter(c => {
    const matchSearch = !search
      || c.name.toLowerCase().includes(search.toLowerCase())
      || c.phone.includes(search);
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'waiting' ? c.necessitaHumano :
      filter === 'vip'     ? c.isVip :
      filter === 'urgent'  ? c.alertas.length > 0 || c.urgencia === 'critica' || c.urgencia === 'alta' :
      true;
    return matchSearch && matchFilter;
  });

  const counts = {
    all:     allData?.contacts?.length || 0,
    waiting: allData?.totalWaiting || 0,
    vip:     allData?.contacts?.filter(c=>c.isVip).length || 0,
    urgent:  allData?.totalAlerts || 0,
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Rajdhani' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: G.gold, letterSpacing: 2 }}>
              WHATSAPP MONITOR
            </div>
            <div style={{ fontSize: 10, color: G.dimL }}>
              {loading ? '⏳ A carregar...' : `🟢 ${allData?.contacts?.length || 0} contactos · auto-refresh 8s`}
              {allData?.totalWaiting > 0 && (
                <span style={{ color: G.amber, marginLeft: 8 }}>
                  ⏳ {allData.totalWaiting} aguardam atendimento
                </span>
              )}
              {allData?.totalAlerts > 0 && (
                <span style={{ color: G.red, marginLeft: 8 }}>
                  🔴 {allData.totalAlerts} alertas
                </span>
              )}
            </div>
          </div>
          <button onClick={() => load()} style={{
            marginLeft: 'auto', fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1,
            padding: '5px 12px', background: 'transparent',
            border: `1px solid ${G.border}`, color: G.dimL, borderRadius: 2, cursor: 'pointer',
          }}>↻ REFRESH</button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['all',     `Todos (${counts.all})`,               G.dimL],
            ['waiting', `Aguardam humano (${counts.waiting})`, G.amber],
            ['vip',     `VIP (${counts.vip})`,                 G.gold],
            ['urgent',  `Urgentes (${counts.urgent})`,         G.red],
          ].map(([key, label, col]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              fontFamily: 'Rajdhani', fontSize: 11, fontWeight: 600,
              padding: '4px 12px', borderRadius: 2, cursor: 'pointer',
              background: filter === key ? `${col}18` : 'transparent',
              border: `1px solid ${filter === key ? col : G.border}`,
              color: filter === key ? col : G.dimL,
            }}>{label}</button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Nome ou nº..."
            style={{
              marginLeft: 'auto', fontFamily: 'Rajdhani', fontSize: 11,
              padding: '4px 10px', background: 'rgba(212,175,55,0.04)',
              border: `1px solid ${G.border}`, color: G.text,
              borderRadius: 2, width: 160, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Corpo */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Lista de contactos */}
        <div style={{ width: 320, borderRight: `1px solid ${G.border}`, overflowY: 'auto', flexShrink: 0 }}>
          {loading && !allData && (
            <div style={{ padding: 20, textAlign: 'center', color: G.dimL, fontSize: 11 }}>
              A carregar dados do Supabase...
            </div>
          )}
          {!loading && contacts.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: G.dimL, fontSize: 11 }}>
              {search ? 'Nenhum resultado' : 'Sem contactos'}
            </div>
          )}

          {contacts.map(c => {
            const isSelected = selected?.phone === c.phone;
            const urgColor = c.alertas.length > 0 ? G.red
              : c.necessitaHumano ? G.amber
              : c.isVip ? G.gold
              : G.dimL;

            return (
              <div key={c.phone}
                onClick={() => { setSelected(c); setReply(''); setSendError(''); }}
                style={{
                  padding: '11px 14px', cursor: 'pointer',
                  borderBottom: `1px solid rgba(212,175,55,0.06)`,
                  borderLeft: `2px solid ${isSelected ? urgColor : 'transparent'}`,
                  background: isSelected ? `${urgColor}08` : 'transparent',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: `${urgColor}20`, border: `1px solid ${urgColor}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Orbitron', fontSize: 9, color: urgColor, fontWeight: 700,
                  }}>
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: 'Rajdhani', fontSize: 13, fontWeight: 700, color: G.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140,
                      }}>{c.name}</span>
                      <span style={{ fontSize: 9, color: G.dimL, flexShrink: 0 }}>
                        {ago(c.lastSeen)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                      {c.isVip && <span style={{ fontSize: 9, color: G.gold }}>⭐VIP</span>}
                      {c.necessitaHumano && <span style={{ fontSize: 9, color: G.amber }}>⏳FILA</span>}
                      {c.alertas.length > 0 && <span style={{ fontSize: 9, color: G.red }}>🔴{c.alertas.length}</span>}
                      {c.lastSentiment && (
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          background: SENT_COLOR[c.lastSentiment] || G.dimL,
                        }}/>
                      )}
                      <span style={{ fontSize: 9, color: G.dimL }}>
                        {c.totalMsgs} msgs
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: G.dimL, paddingLeft: 43,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.lastMessage || c.phone}
                </div>
              </div>
            );
          })}
        </div>

        {/* Painel de conversa */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header da conversa */}
            <div style={{
              padding: '12px 18px', borderBottom: `1px solid ${G.border}`,
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
              background: 'rgba(8,5,1,0.7)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, color: G.text }}>
                    {selected.name}
                  </span>
                  {selected.isVip && <span style={{ fontSize: 10, color: G.gold }}>⭐ VIP</span>}
                  {selected.alertas.length > 0 && (
                    <span style={{ fontSize: 10, color: G.red }}>🔴 {selected.alertas.length} alerta(s)</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: G.dimL }}>
                  {selected.phone}
                  {selected.categoria && ` · ${selected.categoria}`}
                  {selected.totalMsgs && ` · ${selected.totalMsgs} msgs total`}
                </div>
              </div>

              {/* Alertas do contacto */}
              {selected.alertas.map((a, i) => (
                <div key={i} style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 2, maxWidth: 200,
                  background: `${G.red}10`, border: `1px solid ${G.red}33`, color: G.red,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  🔴 {a.message?.substring(0, 40)}
                </div>
              ))}
            </div>

            {/* Mensagens */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '14px 18px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {loadingConv && (
                <div style={{ textAlign: 'center', color: G.dimL, fontSize: 11, paddingTop: 30 }}>
                  A carregar conversa...
                </div>
              )}
              {!loadingConv && convMsgs.length === 0 && (
                <div style={{ textAlign: 'center', color: G.dimL, fontSize: 11, paddingTop: 30 }}>
                  Sem mensagens registadas no conversation_memory
                </div>
              )}

              {convMsgs.map((msg, i) => {
                const isClient = msg.role === 'user';
                const isBot    = msg.role === 'assistant';
                const isStaff  = msg.role === 'staff';
                const bgColor  = isClient ? 'rgba(212,175,55,0.08)'
                               : isBot    ? 'rgba(0,204,255,0.06)'
                               :            'rgba(0,255,136,0.07)';
                const txtColor = isClient ? G.text : isBot ? G.teal : G.green;
                const label    = isClient ? '👤 Cliente' : isBot ? '🤖 Bot' : '💼 Staff';

                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignSelf: isClient ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                  }}>
                    <div style={{ fontSize: 9, color: G.dimL, marginBottom: 3,
                      textAlign: isClient ? 'left' : 'right', paddingLeft: 2, paddingRight: 2 }}>
                      {label}
                      {msg.ts && ` · ${new Date(msg.ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                      {msg.model && ` · ${msg.model}`}
                    </div>
                    <div style={{
                      padding: '9px 13px', borderRadius: 4,
                      background: bgColor, border: `1px solid ${txtColor}22`,
                      color: txtColor, fontFamily: 'Rajdhani', fontSize: 12, lineHeight: 1.55,
                    }}>
                      {msg.text || msg.content || '—'}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>

            {/* Input de resposta */}
            <div style={{
              padding: '12px 18px', borderTop: `1px solid ${G.border}`,
              flexShrink: 0, background: 'rgba(8,5,1,0.8)',
            }}>
              {sendError && (
                <div style={{ color: G.red, fontSize: 10, marginBottom: 6,
                  padding: '4px 8px', background: `${G.red}08`, border: `1px solid ${G.red}22`, borderRadius: 2 }}>
                  ⚠ {sendError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Escrever mensagem... (Enter = enviar via n8n → WhatsApp)"
                  rows={2}
                  style={{
                    flex: 1, fontFamily: 'Rajdhani', fontSize: 12, resize: 'none',
                    padding: '9px 13px', background: 'rgba(212,175,55,0.04)',
                    border: `1px solid ${G.border}`, color: G.text, borderRadius: 2, outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  style={{
                    fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1, padding: '0 16px',
                    background: sending || !reply.trim() ? 'transparent' : 'rgba(212,175,55,0.12)',
                    border: `1px solid ${sending || !reply.trim() ? G.border : G.gold}`,
                    color: sending || !reply.trim() ? G.dimL : G.gold,
                    borderRadius: 2, cursor: 'pointer', alignSelf: 'stretch',
                  }}
                >{sending ? '...' : '▶ ENVIAR'}</button>
              </div>
              <div style={{ fontSize: 9, color: G.dim, marginTop: 5 }}>
                Envia via webhook n8n → {NGROK_URL.split('//')[1]} → WhatsApp (Meta)
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 48, opacity: 0.2 }}>💬</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: G.dimL, letterSpacing: 2 }}>
              SELECCIONAR CONTACTO
            </div>
            {allData && (
              <div style={{ fontFamily: 'Rajdhani', fontSize: 11, color: G.dim, textAlign: 'center' }}>
                {allData.contacts.length} contactos · {allData.totalWaiting} aguardam · {allData.totalAlerts} alertas
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
