// ═══════════════════════════════════════════════════════════
//  FumuGold V4 — ARIA (Assistente IA)
//  Nvidia NIM nemotron-70b + Supabase real + Streaming
//  Sabe tudo: clientes, conversas, consultas, alertas, financeiro
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { G } from '../theme.js';
import { useARIAData } from '../hooks/useARIAData.js';
import { nvidiaChatStream, nvidiaChat, NVIDIA_MODELS } from '../lib/nvidia.js';

// ── System prompt com dados reais injectados ─────────────
function buildSystemPrompt(kpis, raw) {
  if (!kpis) return 'És a ARIA, assistente clínica da FumuGold. Responde em Português.';

  const now    = new Date().toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' });
  const today  = new Date().toISOString().split('T')[0];

  // Top clientes VIP para contexto
  const vips = (raw?.clientes || [])
    .filter(c => c.is_vip)
    .slice(0, 5)
    .map(c => `${c.contact_name} (${c.phone}, ${c.total_messages} msgs)`)
    .join('; ') || 'Nenhum';

  // Alertas abertos
  const alertasAbertos = (raw?.alerts || [])
    .slice(0, 5)
    .map(a => `${a.contact_name||a.phone}: ${(a.message||'').substring(0,60)}`)
    .join('\n  ') || 'Nenhum';

  // Fila de espera
  const filaEspera = (raw?.chatQueue || [])
    .slice(0, 5)
    .map(q => `${q.contact_name||q.phone} — ${q.categoria||'?'} (${q.priority})`)
    .join('\n  ') || 'Nenhuma';

  // Consultas de hoje
  const consultasHoje = (raw?.agendaHoje || [])
    .map(a => `${a.hora} ${a.paciente_nome} c/ ${a.medico} — ${a.status}`)
    .join('\n  ') || 'Nenhuma';

  // Categorias top hoje
  const catsStr = kpis.topCats
    .map(([cat, n]) => `${cat}: ${n}`)
    .join(', ') || 'N/D';

  return `És a ARIA — Assistente de Inteligência da FumuGold em Luanda, Angola.
Respondes SEMPRE em Português de Angola. És directa, precisa e profissional.
Tens acesso a dados em TEMPO REAL do Supabase — nunca inventas números.
Data/hora actual: ${now}

══════════════════ DADOS REAIS DA FumuGold ══════════════════

📱 CLIENTES WHATSAPP:
  Total: ${kpis.totalClientes} clientes | VIPs: ${kpis.vipCount}
  Activos últimos 7 dias: ${kpis.ativos7d}
  Inativos há +14 dias (risco churn): ${kpis.inativos14d}
  Total histórico de mensagens: ${kpis.totalMsgsHistorico}
  VIPs: ${vips}

💬 ACTIVIDADE DE HOJE (${today}):
  Mensagens recebidas: ${kpis.msgsHoje}
  Última hora: ${kpis.msgsUltimaHora} msgs
  Categorias: ${catsStr}
  Sentimento: ${kpis.pctPos}% positivo · ${kpis.pctNeg}% negativo

🏥 CLÍNICA:
  Pacientes registados: ${kpis.totalPacientes}
  Consultas hoje: ${kpis.consultasHoje} (${kpis.consultasConf} confirmadas · ${kpis.consultasPend} pendentes)
${consultasHoje ? '  Agenda:\n  ' + consultasHoje : ''}

⚠️ URGÊNCIAS:
  A aguardar humano na fila: ${kpis.aguardandoHumano}
  Alertas críticos não resolvidos: ${kpis.alertasCriticos} / ${kpis.totalAlertas} total
${alertasAbertos !== 'Nenhum' ? '  Alertas:\n  ' + alertasAbertos : ''}
${filaEspera !== 'Nenhuma' ? '  Fila:\n  ' + filaEspera : ''}

💰 FINANCEIRO:
  Faturado total: ${(kpis.totalFaturado/1000).toFixed(0)}K AOA
  Recebido: ${(kpis.totalRecebido/1000).toFixed(0)}K AOA
  Pendente: ${(kpis.totalPendente/1000).toFixed(0)}K AOA

════════════════════════════════════════════════════════════

Para perguntas sobre clientes específicos: tens acesso a todos os dados acima.
Para análises detalhadas: pede e calculo a partir dos dados reais.
Para acções (enviar mensagem, criar consulta): confirma sempre antes de agir.
Formato: Markdown. Números exactos. Sem inventar dados que não estão acima.`;
}

// ── Renderiza Markdown simples ───────────────────────────
function Md({ text }) {
  const html = (text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g,
      `<code style="background:rgba(212,175,55,0.14);padding:2px 6px;border-radius:3px;font-size:11px;color:${G.gold};font-family:monospace">$1</code>`)
    .replace(/^#{1,2} (.+)$/gm,
      `<div style="font-family:Orbitron;font-size:10px;letter-spacing:1.5px;color:${G.gold};margin:12px 0 5px;border-bottom:1px solid rgba(212,175,55,0.15);padding-bottom:4px">$1</div>`)
    .replace(/^### (.+)$/gm,
      `<div style="font-family:Orbitron;font-size:9px;letter-spacing:1px;color:${G.dimL};margin:8px 0 4px">$1</div>`)
    .replace(/^[-•] (.+)$/gm,
      `<div style="padding-left:14px;margin:3px 0;display:flex;gap:6px"><span style="color:${G.gold};flex-shrink:0">◈</span><span>$1</span></div>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Componente ───────────────────────────────────────────
export default function IAAssistente() {
  const { data, loading: dataLoading, error: dataError, lastAt, refresh } = useARIAData(30000);

  const [history,   setHistory]   = useState([]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState('');
  const [error,     setError]     = useState('');
  const [model,     setModel]     = useState(NVIDIA_MODELS.primary);
  const chatRef = useRef(null);
  const abortRef = useRef(null);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(data?.kpis, data?.raw),
    [data]
  );

  // Mensagem de boas-vindas quando dados carregam
  useEffect(() => {
    if (!data?.kpis) return;
    const k = data.kpis;
    const welcome = `Olá! Sou a **ARIA** — tenho acesso em tempo real a todos os dados da FumuGold.

Agora mesmo:
- **${k.totalClientes}** clientes · **${k.vipCount}** VIPs · **${k.ativos7d}** activos esta semana
- **${k.msgsHoje}** mensagens hoje · **${k.msgsUltimaHora}** na última hora
- **${k.consultasHoje}** consultas hoje · **${k.totalPacientes}** pacientes
- **${k.aguardandoHumano}** a aguardar atendimento humano
- **${k.totalAlertas}** alertas abertos (${k.alertasCriticos} críticos)
- Sentimento hoje: ${k.pctPos}% positivo · ${k.pctNeg}% negativo

Modelo activo: \`${model}\`

O que queres saber ou analisar?`;

    setHistory([{ role: 'assistant', content: welcome, ts: new Date() }]);
  }, [data?.kpis !== null]); // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, streamBuf]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setError('');

    const newHistory = [
      ...history,
      { role: 'user', content: userMsg, ts: new Date() },
    ];
    setHistory(newHistory);
    setStreaming(true);
    setStreamBuf('');

    const msgs = newHistory.slice(-14).map(m => ({
      role: m.role,
      content: m.content,
    }));

    let fullReply = '';

    try {
      await nvidiaChatStream({
        messages: msgs,
        systemPrompt,
        model,
        maxTokens: 1200,
        temperature: 0.2,
        onChunk: (chunk) => {
          fullReply += chunk;
          setStreamBuf(fullReply);
        },
        onDone: () => {
          setHistory(prev => [...prev, {
            role: 'assistant',
            content: fullReply,
            ts: new Date(),
          }]);
          setStreamBuf('');
          setStreaming(false);
        },
      });
    } catch (e) {
      setError(e.message);
      // Fallback: tenta sem streaming
      try {
        const reply = await nvidiaChat({
          messages: msgs,
          systemPrompt,
          model: NVIDIA_MODELS.fast, // tenta modelo mais rápido
          maxTokens: 800,
          temperature: 0.2,
        });
        setHistory(prev => [...prev, { role: 'assistant', content: reply, ts: new Date() }]);
      } catch (e2) {
        setHistory(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Erro: ${e.message}\n\nTenta novamente ou verifica a VITE_NVIDIA_KEY no .env`,
          ts: new Date(),
        }]);
      }
      setStreamBuf('');
      setStreaming(false);
    }
  };

  const stopStream = () => {
    abortRef.current?.abort();
    if (streamBuf) {
      setHistory(prev => [...prev, { role: 'assistant', content: streamBuf + ' _(interrompido)_', ts: new Date() }]);
    }
    setStreamBuf('');
    setStreaming(false);
  };

  // Sugestões baseadas em dados reais
  const suggestions = useMemo(() => {
    if (!data?.kpis) return [];
    const k = data.kpis;
    const s = ['Resumo completo agora'];
    if (k.aguardandoHumano > 0)  s.push(`${k.aguardandoHumano} clientes aguardam humano`);
    if (k.alertasCriticos > 0)   s.push(`${k.alertasCriticos} alertas críticos`);
    if (k.inativos14d > 0)       s.push(`${k.inativos14d} clientes inativos há +14 dias`);
    if (k.consultasPend > 0)     s.push(`${k.consultasPend} consultas por confirmar`);
    if (k.pctNeg > 30)           s.push(`Sentimento negativo em ${k.pctNeg}% das msgs`);
    if (k.totalPendente > 0)     s.push(`${(k.totalPendente/1000).toFixed(0)}K AOA pendentes`);
    s.push('Análise de churn', 'Top clientes VIP');
    return s.slice(0, 6);
  }, [data?.kpis]);

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Rajdhani', background: G.bg }}>

      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: `1px solid ${G.border}`,
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        background: 'rgba(8,5,1,0.95)',
      }}>
        {/* Avatar ARIA */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(circle at 35% 35%, ${G.teal}44, ${G.gold}22, transparent)`,
          border: `1px solid ${G.gold}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: `0 0 16px ${G.teal}22`,
          animation: streaming ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}>🧠</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, color: G.gold, letterSpacing: 2 }}>
            ARIA — Assistente Inteligente
          </div>
          <div style={{ fontSize: 10, color: G.dimL, marginTop: 1 }}>
            {dataLoading
              ? '⏳ A carregar dados...'
              : dataError
                ? `⚠️ Erro Supabase: ${dataError}`
                : `🟢 Supabase em tempo real · actualizado ${lastAt?.toLocaleTimeString('pt-PT') || '—'}`}
          </div>
        </div>

        {/* KPI pills em tempo real */}
        {data?.kpis && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.kpis.aguardandoHumano > 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 2,
                background: `${G.amber}18`, border: `1px solid ${G.amber}55`, color: G.amber }}>
                ⏳ {data.kpis.aguardandoHumano} em fila
              </div>
            )}
            {data.kpis.alertasCriticos > 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 2,
                background: `${G.red}18`, border: `1px solid ${G.red}55`, color: G.red }}>
                🔴 {data.kpis.alertasCriticos} críticos
              </div>
            )}
            <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2,
              background: `${G.gold}10`, border: `1px solid ${G.border}`, color: G.dimL }}>
              💬 {data.kpis.msgsHoje} hoje
            </div>
            <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2,
              background: `${G.gold}10`, border: `1px solid ${G.border}`, color: G.dimL }}>
              👥 {data.kpis.totalClientes}
            </div>
            <button onClick={refresh} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${G.border}`, color: G.dimL,
            }}>↻</button>
          </div>
        )}

        {/* Selector de modelo */}
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{
            fontFamily: 'Orbitron', fontSize: 7, color: G.dimL, letterSpacing: 1,
            background: 'rgba(212,175,55,0.04)', border: `1px solid ${G.border}`,
            borderRadius: 2, padding: '4px 6px', outline: 'none',
          }}
        >
          <option value={NVIDIA_MODELS.primary}>Nemotron 70B (recomendado)</option>
          <option value={NVIDIA_MODELS.fast}>LLaMA 8B (rápido)</option>
          <option value={NVIDIA_MODELS.reasoning}>Nemotron Super 49B</option>
        </select>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {history.length === 0 && dataLoading && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: G.dim, fontSize: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
            A carregar dados do Supabase...
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontSize: 9, color: G.dimL, marginBottom: 4, paddingLeft: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: G.teal }}>🧠</span> ARIA
                {msg.ts && (
                  <span style={{ color: G.dim }}>
                    · {msg.ts.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
            <div style={{
              padding: '11px 15px', borderRadius: 4, lineHeight: 1.65,
              background: msg.role === 'user'
                ? 'rgba(212,175,55,0.10)' : 'rgba(0,204,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(212,175,55,0.25)' : 'rgba(0,204,255,0.15)'}`,
              color: G.text, fontFamily: 'Rajdhani', fontSize: 12,
            }}>
              {msg.role === 'user' ? msg.content : <Md text={msg.content} />}
            </div>
          </div>
        ))}

        {/* Streaming em tempo real */}
        {streaming && (
          <div style={{
            alignSelf: 'flex-start', maxWidth: '88%',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 9, color: G.teal, marginBottom: 2, paddingLeft: 2 }}>
              🧠 ARIA <span style={{ color: G.dim }}>· a escrever...</span>
            </div>
            <div style={{
              padding: '11px 15px', borderRadius: 4, lineHeight: 1.65,
              background: 'rgba(0,204,255,0.04)',
              border: '1px solid rgba(0,204,255,0.15)',
              color: G.text, fontFamily: 'Rajdhani', fontSize: 12,
              minWidth: 40,
            }}>
              {streamBuf ? <Md text={streamBuf} /> : (
                <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: G.teal, display: 'inline-block',
                      animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite`,
                    }}/>
                  ))}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sugestões rápidas */}
      {suggestions.length > 0 && (
        <div style={{
          padding: '8px 20px 4px',
          display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0,
        }}>
          {suggestions.map((s, i) => (
            <button key={i}
              onClick={() => { setInput(s); }}
              disabled={streaming}
              style={{
                fontFamily: 'Rajdhani', fontSize: 10, fontWeight: 600,
                padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                background: 'rgba(212,175,55,0.05)',
                border: `1px solid ${G.border}`, color: G.dimL,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = G.gold; e.target.style.color = G.gold; }}
              onMouseLeave={e => { e.target.style.borderColor = G.border; e.target.style.color = G.dimL; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 20px 16px', flexShrink: 0 }}>
        {error && (
          <div style={{ color: G.amber, fontSize: 10, marginBottom: 6, padding: '5px 8px',
            background: `${G.amber}08`, border: `1px solid ${G.amber}33`, borderRadius: 2 }}>
            ⚠ {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={2}
            placeholder="Pergunta à ARIA... (Enter = enviar · Shift+Enter = nova linha)"
            disabled={streaming}
            style={{
              flex: 1, fontFamily: 'Rajdhani', fontSize: 12, resize: 'none',
              padding: '10px 14px', background: 'rgba(212,175,55,0.04)',
              border: `1px solid ${streaming ? G.border : 'rgba(212,175,55,0.3)'}`,
              color: G.text, borderRadius: 2, outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {streaming ? (
            <button onClick={stopStream} style={{
              fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1, padding: '0 14px',
              background: `${G.red}18`, border: `1px solid ${G.red}55`,
              color: G.red, borderRadius: 2, cursor: 'pointer',
            }}>■ PARAR</button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              style={{
                fontFamily: 'Orbitron', fontSize: 8, letterSpacing: 1, padding: '0 16px',
                background: input.trim() ? 'rgba(212,175,55,0.12)' : 'transparent',
                border: `1px solid ${input.trim() ? G.gold : G.border}`,
                color: input.trim() ? G.gold : G.dimL,
                borderRadius: 2, cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >▶ ENVIAR</button>
          )}
        </div>
        <div style={{ fontSize: 9, color: G.dim, marginTop: 5, display: 'flex', gap: 12 }}>
          <span>Modelo: {model.split('/').pop()}</span>
          <span>Dados: Supabase {lastAt ? `(${lastAt.toLocaleTimeString('pt-PT')})` : ''}</span>
          <span>Actualiza a cada 30s</span>
        </div>
      </div>
    </div>
  );
}
