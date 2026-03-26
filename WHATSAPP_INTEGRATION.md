# FumuGold V4 — Integração WhatsApp Bot ↔ Monitor

## Como ligar o teu bot n8n ao painel FumuGold

### 1. No Supabase
Corre o `schema_v4.sql` (substitui o anterior).
Vai ser criada a tabela `fg_whatsapp_conversations` com a função `fg_upsert_whatsapp_conversation`.

---

### 2. No n8n — Escrever na tabela ao receber mensagem

Adiciona este nó **após** o nó de recepção de mensagem (Evolution API / Meta Webhook):

**Nó: HTTP Request (Supabase RPC)**
```
Method: POST
URL: https://SEU_PROJECT.supabase.co/rest/v1/rpc/fg_upsert_whatsapp_conversation
Headers:
  apikey: SUA_ANON_KEY
  Authorization: Bearer SUA_ANON_KEY  (ou service_role key para mais segurança)
  Content-Type: application/json
Body (JSON):
{
  "p_phone":    "{{ $json.remoteJid || $json.from }}",
  "p_name":     "{{ $json.pushName || $json.name || null }}",
  "p_msg_role": "client",
  "p_msg_text": "{{ $json.message || $json.text || $json.body }}",
  "p_status":   "active"
}
```

Quando o **bot responde**, adiciona outro nó igual mas com:
```json
{
  "p_msg_role": "bot",
  "p_msg_text": "{{ $json.botResponse }}"
}
```

---

### 3. No FumuGold — Configurar Webhook de resposta

Em **Configurações → Integrações**, preenche:
- **n8n Webhook URL**: URL do teu webhook n8n que aceita mensagens do staff

**Nó n8n que recebe resposta do staff:**
```
Method: POST
Trigger: Webhook (POST)
Body esperado:
{
  "phone":   "+244912345678",
  "message": "texto escrito pelo staff",
  "source":  "fumugold_staff"
}
→ Passa para o nó de envio do Evolution API / Meta
```

---

### 4. Configurar no .env

```env
VITE_N8N_WEBHOOK=https://SEU_N8N.cloud/webhook/fumugold-reply
```

---

### Fluxo completo

```
Cliente WhatsApp
      ↓ mensagem
Evolution API / Meta
      ↓
    n8n (processa com bot IA)
      ↓ guarda conversa
  Supabase fg_whatsapp_conversations
      ↓ poll 8s
  FumuGold WhatsApp Monitor
      ↓ staff responde
  FumuGold → n8n webhook
      ↓
Evolution API / Meta → Cliente WhatsApp
```

---

### Estrutura da conversa no Supabase

```json
{
  "id": "+244912345678",
  "data": {
    "phone":     "+244912345678",
    "name":      "João Silva",
    "status":    "active",
    "last_msg":  "Boa tarde, queria marcar consulta",
    "msgs": [
      { "role": "client", "text": "Boa tarde...",    "ts": "2025-01-15T14:30:00Z" },
      { "role": "bot",    "text": "Olá João! ...",   "ts": "2025-01-15T14:30:05Z" },
      { "role": "staff",  "text": "Já agendei para amanhã", "ts": "2025-01-15T14:35:00Z" }
    ],
    "patient_id": "fg_pat_abc123"
  },
  "updated_at": "2025-01-15T14:35:00Z"
}
```
