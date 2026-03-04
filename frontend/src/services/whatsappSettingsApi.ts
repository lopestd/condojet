import { backendApi } from './httpClient';

export type WebhookTipo = 'whatsapp_create' | 'whatsapp_query' | 'whatsapp_notify';

export type WebhookN8nItem = {
  tipo: WebhookTipo;
  url: string;
  ativo: boolean;
  updated_by_usuario_id: number | null;
  updated_at: string;
};

export type ListWebhooksResponse = {
  contexto: string;
  items: WebhookN8nItem[];
};

export type TestWebhookResponse = {
  tipo: WebhookTipo;
  ok: boolean;
  status_code: number | null;
  detail: string;
};

export type WhatsAppConnectionItem = {
  id: number | null;
  name: string;
  status: string;
  phone: string;
  qr: string;
};

export type WhatsAppConnectionsResponse = {
  items: WhatsAppConnectionItem[];
  escopo: 'global';
};

export async function listWhatsAppWebhooks(): Promise<ListWebhooksResponse> {
  const { data } = await backendApi.get<ListWebhooksResponse>('/webhooks-n8n', {
    params: { contexto: 'whatsapp' }
  });
  return data;
}

export async function upsertWebhook(tipo: WebhookTipo, payload: { url: string; ativo: boolean }): Promise<WebhookN8nItem> {
  const { data } = await backendApi.put<WebhookN8nItem>(`/webhooks-n8n/${tipo}`, payload);
  return data;
}

export async function testWebhook(tipo: WebhookTipo, url?: string): Promise<TestWebhookResponse> {
  const body = url ? { url } : {};
  const { data } = await backendApi.post<TestWebhookResponse>(`/webhooks-n8n/${tipo}/testar`, body);
  return data;
}

export async function listWhatsAppConnections(instancia?: string): Promise<WhatsAppConnectionsResponse> {
  const { data } = await backendApi.get<WhatsAppConnectionsResponse>('/whatsapp/conexoes', {
    params: instancia ? { instancia } : undefined
  });
  return data;
}

export async function createWhatsAppConnection(payload: { instanceName: string; phone: string }): Promise<{ ok: boolean }> {
  const { data } = await backendApi.post<{ ok: boolean }>('/whatsapp/conexoes', payload, { timeout: 60000 });
  return data;
}

export async function renewWhatsAppQr(payload: { instanceName: string; phone: string }): Promise<{ ok: boolean }> {
  const { data } = await backendApi.post<{ ok: boolean }>(
    `/whatsapp/conexoes/${encodeURIComponent(payload.instanceName)}/renovar-qr`,
    { phone: payload.phone },
    { timeout: 60000 }
  );
  return data;
}
