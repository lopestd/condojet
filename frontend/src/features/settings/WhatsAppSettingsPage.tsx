import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { readApiError } from '../../services/httpClient';
import {
  createWhatsAppConnection,
  listWhatsAppConnections,
  listWhatsAppWebhooks,
  renewWhatsAppQr,
  testWebhook,
  upsertWebhook,
  type WebhookN8nItem,
  type WebhookTipo,
  type WhatsAppConnectionItem
} from '../../services/whatsappSettingsApi';

type WhatsAppTab = 'conexao' | 'webhooks';

type WebhookFormState = {
  url: string;
  ativo: boolean;
  updatedAt: string | null;
};

const WEBHOOK_TYPES: Array<{ tipo: WebhookTipo; titulo: string; descricao: string }> = [
  {
    tipo: 'whatsapp_create',
    titulo: 'Webhook de Criação / Renovação',
    descricao: 'Usado para criar conexão e gerar novo QR Code.'
  },
  {
    tipo: 'whatsapp_query',
    titulo: 'Webhook de Consulta',
    descricao: 'Usado para consultar status, telefone e QR Code das instâncias.'
  }
];

function toFormState(item: WebhookN8nItem | undefined): WebhookFormState {
  return {
    url: item?.url ?? '',
    ativo: item?.ativo ?? true,
    updatedAt: item?.updated_at ?? null
  };
}

function normalizeStatusLabel(input: string): string {
  const status = input.trim().toLowerCase();
  if (!status) return 'Desconhecido';
  if (status === 'true' || status.includes('open') || status.includes('conectado') || status.includes('online') || status.includes('connected')) {
    return 'Conectado';
  }
  if (status === 'false' || status.includes('desconectado') || status.includes('disconnected') || status.includes('offline')) {
    return 'Desconectado';
  }
  if (status.includes('qr') || status.includes('aguard') || status.includes('scan') || status.includes('pending') || status.includes('connecting')) {
    return 'Aguardando leitura do QR';
  }
  return input;
}

function buildDefaultInstanceName(condominioId: number | null): string {
  if (!condominioId) return 'condominio-zap';
  return `condominio-${condominioId}-zap`;
}

export function WhatsAppSettingsPage(): JSX.Element {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' && Boolean(user?.condominioId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [saving, setSaving] = useState<WebhookTipo | null>(null);
  const [testing, setTesting] = useState<WebhookTipo | null>(null);
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [renewingQr, setRenewingQr] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [forms, setForms] = useState<Record<WebhookTipo, WebhookFormState>>({
    whatsapp_create: { url: '', ativo: true, updatedAt: null },
    whatsapp_query: { url: '', ativo: true, updatedAt: null }
  });

  const [connections, setConnections] = useState<WhatsAppConnectionItem[]>([]);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string | null>(null);
  const [createPhone, setCreatePhone] = useState('');
  const [createInstanceName, setCreateInstanceName] = useState(buildDefaultInstanceName(user?.condominioId ?? null));

  const activeTabParam = searchParams.get('tab');
  const activeTab: WhatsAppTab = activeTabParam === 'webhooks' ? 'webhooks' : 'conexao';

  useEffect(() => {
    if (!searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'conexao');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setCreateInstanceName(buildDefaultInstanceName(user?.condominioId ?? null));
  }, [user?.condominioId]);

  async function loadWebhooks(): Promise<void> {
    setLoadingWebhooks(true);
    setError(null);
    try {
      const data = await listWhatsAppWebhooks();
      const byType = new Map(data.items.map((item) => [item.tipo, item]));
      setForms({
        whatsapp_create: toFormState(byType.get('whatsapp_create')),
        whatsapp_query: toFormState(byType.get('whatsapp_query'))
      });
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoadingWebhooks(false);
    }
  }

  async function loadConnections(instanceName?: string): Promise<void> {
    setLoadingConnections(true);
    setConnectionError(null);
    try {
      const data = await listWhatsAppConnections(instanceName);
      setConnections(data.items);
      if (data.items.length === 0) {
        setSelectedConnectionName(null);
      } else if (instanceName) {
        const found = data.items.find((item) => item.name === instanceName);
        setSelectedConnectionName(found ? found.name : data.items[0].name);
      } else if (!selectedConnectionName || !data.items.some((item) => item.name === selectedConnectionName)) {
        setSelectedConnectionName(data.items[0].name);
      }
    } catch (err) {
      setConnectionError(readApiError(err));
      setConnections([]);
      setSelectedConnectionName(null);
    } finally {
      setLoadingConnections(false);
    }
  }

  useEffect(() => {
    void loadWebhooks();
  }, []);

  useEffect(() => {
    if (activeTab === 'conexao') {
      void loadConnections();
    }
  }, [activeTab]);

  const webhooksProntos = useMemo(() => {
    return WEBHOOK_TYPES.every(({ tipo }) => {
      const item = forms[tipo];
      return item.url.trim().length > 0 && item.ativo;
    });
  }, [forms]);

  const selectedConnection = useMemo(() => {
    if (!selectedConnectionName) return null;
    return connections.find((item) => item.name === selectedConnectionName) ?? null;
  }, [connections, selectedConnectionName]);

  function setTab(tab: WhatsAppTab): void {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

  function updateForm(tipo: WebhookTipo, patch: Partial<WebhookFormState>): void {
    setForms((current) => ({
      ...current,
      [tipo]: {
        ...current[tipo],
        ...patch
      }
    }));
  }

  async function onSaveWebhook(event: FormEvent, tipo: WebhookTipo): Promise<void> {
    event.preventDefault();
    setSaving(tipo);
    setError(null);
    setFeedback(null);
    try {
      const form = forms[tipo];
      const data = await upsertWebhook(tipo, { url: form.url.trim(), ativo: form.ativo });
      updateForm(tipo, { url: data.url, ativo: data.ativo, updatedAt: data.updated_at });
      setFeedback(`Webhook ${tipo} salvo com sucesso.`);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSaving(null);
    }
  }

  async function onTestWebhook(tipo: WebhookTipo): Promise<void> {
    setTesting(tipo);
    setError(null);
    setFeedback(null);
    try {
      const form = forms[tipo];
      const data = await testWebhook(tipo, form.url.trim() || undefined);
      if (!data.ok) {
        setError(`Teste do ${tipo} falhou (status: ${String(data.status_code ?? 0)} - ${data.detail}).`);
        return;
      }
      setFeedback(`Teste do ${tipo} executado com sucesso.`);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setTesting(null);
    }
  }

  async function onCreateConnection(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (connections.length > 0) {
      setError('Já existe conexão cadastrada. Use a ação de gerar novo QR Code para renovar a sessão.');
      return;
    }

    setCreatingConnection(true);
    try {
      const trimmedName = createInstanceName.trim();
      await createWhatsAppConnection({ instanceName: trimmedName, phone: createPhone });
      setFeedback('Conexão criada com sucesso. Atualizando listagem...');
      await loadConnections(trimmedName);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setCreatingConnection(false);
    }
  }

  async function onRenewQr(): Promise<void> {
    if (!selectedConnection) {
      setError('Selecione uma conexão para renovar o QR Code.');
      return;
    }

    const statusLabel = normalizeStatusLabel(selectedConnection.status).toLowerCase();
    if (statusLabel.includes('conectado')) {
      const confirmed = window.confirm('A conexão está ativa. Gerar novo QR pode desconectar a sessão atual. Deseja continuar?');
      if (!confirmed) return;
    }

    setRenewingQr(true);
    setError(null);
    setFeedback(null);
    try {
      await renewWhatsAppQr({ instanceName: selectedConnection.name, phone: selectedConnection.phone });
      setFeedback('Solicitação de novo QR Code enviada. Atualizando dados da conexão...');
      await loadConnections(selectedConnection.name);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setRenewingQr(false);
    }
  }

  return (
    <section className="page-grid settings-page">
      <header className="page-header">
        <h1>Configurações de WhatsApp</h1>
        <p>Gerencie conexão operacional e webhooks n8n por condomínio.</p>
      </header>

      <section className="panel" aria-label="Abas de configuração do WhatsApp">
        <div className="segmented" role="tablist" aria-label="Configurações WhatsApp">
          <button type="button" className={activeTab === 'conexao' ? 'active' : ''} onClick={() => setTab('conexao')} role="tab" aria-selected={activeTab === 'conexao'}>
            Conexão WhatsApp
          </button>
          <button type="button" className={activeTab === 'webhooks' ? 'active' : ''} onClick={() => setTab('webhooks')} role="tab" aria-selected={activeTab === 'webhooks'}>
            Webhooks n8n
          </button>
        </div>
      </section>

      {error ? <p className="error-box">{error}</p> : null}
      {feedback ? <p className="info-box">{feedback}</p> : null}

      {activeTab === 'conexao' ? (
        <section className="settings-cards-grid" aria-label="Conexão WhatsApp">
          <article className="panel report-card">
            <h2>Conexões Salvas</h2>
            <p>Selecione uma instância para visualizar status e QR Code.</p>
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => void loadConnections()} disabled={loadingConnections || !webhooksProntos}>
                {loadingConnections ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            {connectionError ? <p className="error-box">{connectionError}</p> : null}
            {!webhooksProntos ? (
              <p className="info-box">Configure e ative os webhooks na aba "Webhooks n8n" para operar esta aba.</p>
            ) : null}
            <div className="report-list">
              {connections.map((item) => (
                <button
                  key={`${item.name}-${String(item.id ?? 'x')}`}
                  type="button"
                  className={selectedConnectionName === item.name ? 'button-soft active' : 'button-soft'}
                  onClick={() => setSelectedConnectionName(item.name)}
                >
                  {item.name}
                </button>
              ))}
              {connections.length === 0 && !loadingConnections ? <p>Nenhuma conexão encontrada.</p> : null}
            </div>
          </article>

          <article className="panel report-card">
            <h2>Criar conexão</h2>
            <p>Criar conexão inicial do condomínio com WhatsApp.</p>
            <form className="form-grid" onSubmit={(event) => void onCreateConnection(event)}>
              <label>
                Nome da conexão
                <input value={createInstanceName} onChange={(event) => setCreateInstanceName(event.target.value)} disabled={!canEdit || creatingConnection} required />
              </label>
              <label>
                Telefone WhatsApp
                <input value={createPhone} onChange={(event) => setCreatePhone(event.target.value)} disabled={!canEdit || creatingConnection} required />
              </label>
              <div className="modal-actions">
                <button type="submit" className="cta" disabled={!canEdit || creatingConnection || !webhooksProntos}>
                  {creatingConnection ? 'Criando...' : 'Criar conexão'}
                </button>
              </div>
            </form>
            {!canEdit ? <p className="info-box">Somente administradores podem criar conexão.</p> : null}
          </article>

          <article className="panel report-card">
            <h2>Detalhes da Conexão</h2>
            {selectedConnection ? (
              <dl>
                <div>
                  <dt>Nome</dt>
                  <dd>{selectedConnection.name}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{normalizeStatusLabel(selectedConnection.status)}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{selectedConnection.phone || '-'}</dd>
                </div>
              </dl>
            ) : (
              <p>Selecione uma conexão para visualizar os detalhes.</p>
            )}

            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => void onRenewQr()} disabled={!canEdit || !selectedConnection || renewingQr || !webhooksProntos}>
                {renewingQr ? 'Gerando QR...' : 'Gerar novo QR Code'}
              </button>
            </div>

            <div>
              <h3>QR Code</h3>
              {selectedConnection?.qr ? (
                <img src={selectedConnection.qr} alt={`QR Code da conexão ${selectedConnection.name}`} style={{ maxWidth: '220px', width: '100%' }} />
              ) : (
                <p>QR Code indisponível para a conexão selecionada.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'webhooks' ? (
        <section className="settings-cards-grid" aria-label="Webhooks n8n">
          {WEBHOOK_TYPES.map((item) => {
            const form = forms[item.tipo];
            const isSaving = saving === item.tipo;
            const isTesting = testing === item.tipo;

            return (
              <article key={item.tipo} className="panel report-card">
                <h2>{item.titulo}</h2>
                <p>{item.descricao}</p>

                <form className="form-grid" onSubmit={(event) => void onSaveWebhook(event, item.tipo)}>
                  <label>
                    URL do webhook
                    <input
                      type="url"
                      value={form.url}
                      onChange={(event) => updateForm(item.tipo, { url: event.target.value })}
                      placeholder="https://n8n.seudominio.com/webhook/..."
                      disabled={!canEdit || loadingWebhooks || isSaving}
                      required
                    />
                  </label>

                  <label className="inline-option">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(event) => updateForm(item.tipo, { ativo: event.target.checked })}
                      disabled={!canEdit || loadingWebhooks || isSaving}
                    />
                    Webhook ativo
                  </label>

                  <small>
                    Última atualização: {form.updatedAt ? new Date(form.updatedAt).toLocaleString('pt-BR') : 'Ainda não salvo'}
                  </small>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button-soft"
                      onClick={() => void onTestWebhook(item.tipo)}
                      disabled={loadingWebhooks || isSaving || isTesting || form.url.trim().length === 0}
                    >
                      {isTesting ? 'Testando...' : 'Testar webhook'}
                    </button>
                    <button type="submit" className="cta" disabled={!canEdit || loadingWebhooks || isSaving}>
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </article>
            );
          })}

          {!canEdit ? (
            <p className="info-box">Somente administrador do condomínio pode alterar webhooks. O perfil atual possui acesso de leitura.</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
