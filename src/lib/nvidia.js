// FumuGold — NVIDIA NIM client
const NVIDIA_KEY = import.meta.env.VITE_NVIDIA_KEY || '';
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export const NVIDIA_MODELS = {
  nemotron70b: 'nvidia/llama-3.1-nemotron-70b-instruct',
  nemotron253b: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  llama8b: 'meta/llama-3.1-8b-instruct',
};

export async function nvidiaChat(messages, model = NVIDIA_MODELS.nemotron70b) {
  if (!NVIDIA_KEY) return 'NVIDIA_KEY não configurado em .env';
  try {
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 2048,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Sem resposta.';
  } catch (e) {
    return `Erro: ${e.message}`;
  }
}

export async function* nvidiaChatStream(messages, model = NVIDIA_MODELS.nemotron70b) {
  if (!NVIDIA_KEY) { yield 'NVIDIA_KEY não configurado em .env'; return; }
  try {
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model, messages,
        temperature: 0.6,
        max_tokens: 2048,
        stream: true,
      }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.replace('data: ', '').trim();
        if (json === '[DONE]') return;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  } catch (e) {
    yield `Erro: ${e.message}`;
  }
}
