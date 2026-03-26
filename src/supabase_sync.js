// ═══════════════════════════════════════════════════════════
// FUMUGOLD SUPABASE SYNC v2.0
// Sincronização com Supabase (opcional)
// ═══════════════════════════════════════════════════════════

// ── probeSupabase ─────────────────────────────────────────
// Verifica se as credenciais Supabase estão correctas
export async function probeSupabase({ supabaseUrl, supabaseAnonKey } = {}) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok:      false,
      message: 'URL ou chave Supabase não configurados. Preencha os campos em Integrações.',
      latency: null,
    };
  }

  const url = supabaseUrl.replace(/\/$/, '');

  try {
    const t0  = Date.now();
    const res = await fetch(`${url}/rest/v1/`, {
      method:  'GET',
      headers: {
        apikey:        supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    const latency = Date.now() - t0;

    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        ok:      true,
        message: `Supabase acessível · ${latency}ms de latência`,
        latency,
      };
    }

    return {
      ok:      false,
      message: `Supabase respondeu com erro ${res.status}. Verifique as credenciais.`,
      latency,
    };
  } catch (e) {
    const isTimeout = e.name === 'TimeoutError' || e.name === 'AbortError';
    return {
      ok:      false,
      message: isTimeout
        ? 'Timeout ao conectar ao Supabase (>8s). Verifique a URL e a ligação à internet.'
        : `Erro de ligação: ${e.message || 'sem detalhe'}`,
      latency: null,
    };
  }
}

// ── syncClinicToSupabase ──────────────────────────────────
// Sincroniza os dados da clínica com o Supabase
export async function syncClinicToSupabase(
  { supabaseUrl, supabaseAnonKey, tableMap = {} } = {},
  data = {}
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok:      false,
      message: 'Credenciais Supabase não configuradas.',
      synced:  {},
      errors:  [],
      total:   0,
    };
  }

  const url     = supabaseUrl.replace(/\/$/, '');
  const headers = {
    apikey:         supabaseAnonKey,
    Authorization:  `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    Prefer:         'resolution=merge-duplicates,return=minimal',
  };

  // Tabelas suportadas → dados
  const DEFAULT_MAP = {
    patients:      'fg_patients',
    appointments:  'fg_appointments',
    labResults:    'fg_lab_results',
    prescriptions: 'fg_prescriptions',
    invoices:      'fg_invoices',
    beds:          'fg_beds',
    staff:         'fg_staff',
  };

  const resolvedMap = { ...DEFAULT_MAP, ...tableMap };
  const synced  = {};
  const errors  = [];
  let   total   = 0;

  for (const [key, table] of Object.entries(resolvedMap)) {
    const rows = data[key];
    if (!Array.isArray(rows) || rows.length === 0) {
      synced[key] = 0;
      continue;
    }

    try {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method:  'POST',
        headers,
        body:    JSON.stringify(rows),
        signal:  AbortSignal.timeout(15000),
      });

      if (res.ok || res.status === 201 || res.status === 200 || res.status === 204) {
        synced[key] = rows.length;
        total      += rows.length;
      } else {
        const body = await res.text().catch(() => res.status);
        errors.push(`${key} (${table}): erro ${res.status} — ${String(body).slice(0, 120)}`);
        synced[key] = 0;
      }
    } catch (e) {
      errors.push(`${key}: ${e.message || 'erro de rede'}`);
      synced[key] = 0;
    }
  }

  const ok = errors.length === 0 && total > 0;

  return {
    ok,
    message: ok
      ? `Sincronização completa · ${total} registos enviados para ${Object.keys(synced).length} tabelas.`
      : errors.length > 0
        ? `Sincronização parcial com ${errors.length} erro(s). Verifique as tabelas no Supabase.`
        : 'Sem dados para sincronizar.',
    synced,
    errors,
    total,
    timestamp: new Date().toISOString(),
  };
}
