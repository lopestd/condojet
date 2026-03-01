import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { SettingsSectionCard } from './components/SettingsSectionCard';

const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Fortaleza',
  'America/Belem'
];

export function SettingsPage(): JSX.Element {
  const { user, updateTimezone } = useAuth();
  const canEditTimezone = user?.role === 'ADMIN' && Boolean(user?.condominioId);
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [modalTimezone, setModalTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'timezone' | 'notificacoes' | 'integracoes' | null>(null);
  const timezoneOptions = useMemo(() => {
    const normalized = String(timezone ?? '').trim();
    if (!normalized || TIMEZONE_OPTIONS.includes(normalized)) {
      return TIMEZONE_OPTIONS;
    }
    return [normalized, ...TIMEZONE_OPTIONS];
  }, [timezone]);

  useEffect(() => {
    async function loadConfiguracoes(): Promise<void> {
      if (!canEditTimezone) return;
      setCarregando(true);
      setErro(null);
      try {
        const { data } = await backendApi.get<{ timezone: string }>('/configuracoes');
        setTimezone(data.timezone);
        setModalTimezone(data.timezone);
        updateTimezone(data.timezone);
      } catch (err) {
        setErro(readApiError(err));
      } finally {
        setCarregando(false);
      }
    }
    void loadConfiguracoes();
  }, [canEditTimezone, updateTimezone]);

  function openTimezoneModal(): void {
    setErro(null);
    setFeedback(null);
    setModalTimezone(timezone);
    setActiveModal('timezone');
  }

  async function onSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    try {
      if (!canEditTimezone) {
        setErro('Configuracao de timezone disponivel apenas para administradores de condominio.');
        return;
      }
      const { data } = await backendApi.put<{ timezone: string }>('/configuracoes', { timezone: modalTimezone });
      setTimezone(data.timezone);
      setModalTimezone(data.timezone);
      updateTimezone(data.timezone);
      setFeedback('Configuracoes salvas com sucesso.');
      setActiveModal(null);
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="page-grid settings-page">
      <header className="page-header">
        <h1>Preferências da operação</h1>
        <p>Parametros operacionais organizados por modulos de configuracao.</p>
      </header>

      <section className="settings-cards-grid" aria-label="Modulos de configuracao">
        <SettingsSectionCard
          title="Configuracao de Timezone"
          description="Define o fuso horario oficial utilizado pelos registros de data e hora do condominio."
          items={[
            { label: 'Timezone atual', value: timezone },
            { label: 'Status', value: 'Configuracao ativa' },
            { label: 'Aplicacao', value: 'Registros e consultas de data/hora' }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedback}
          infoMessage={canEditTimezone ? null : 'Timezone configurado por condominio. Somente administrador do condominio pode alterar.'}
          onOpen={openTimezoneModal}
        />

        <SettingsSectionCard
          title="Notificacoes e Alertas"
          description="Modulo reservado para parametros de canais, janelas de envio e regras de notificacao."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrizacao' },
            { label: 'Visualizacao', value: 'Somente leitura no card' },
            { label: 'Edicao', value: 'Via modal' }
          ]}
          infoMessage="Template: seguir o padrao do modulo de Timezone para novos itens."
          onOpen={() => setActiveModal('notificacoes')}
        />

        <SettingsSectionCard
          title="Integracoes Operacionais"
          description="Modulo reservado para tokens, credenciais e politicas de integracao com servicos externos."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrizacao' },
            { label: 'Visualizacao', value: 'Somente leitura no card' },
            { label: 'Edicao', value: 'Via modal' }
          ]}
          infoMessage="Template: campos, validacao e acao de salvar por modulo independente."
          onOpen={() => setActiveModal('integracoes')}
        />
      </section>

      {activeModal === 'timezone' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Configuracao de Timezone</h3>
            <p className="modal-intro">Atualize o fuso horario oficial utilizado pelo condominio.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSave(event)}>
              <label>
                Nome da instancia
                <input value="CondoJET Operacao" disabled />
              </label>
              <label>
                Timezone
                <select
                  value={modalTimezone}
                  onChange={(event) => setModalTimezone(event.target.value)}
                  disabled={!canEditTimezone || carregando || salvando}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-option">
                <input type="checkbox" defaultChecked disabled />
                Receber alertas de encomenda em atraso
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canEditTimezone || salvando || carregando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'notificacoes' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Notificacoes e Alertas</h3>
            <p className="modal-intro">Este modulo esta preparado para receber parametros em proxima evolucao.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parametros editaveis nesta versao" disabled />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'integracoes' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Integracoes Operacionais</h3>
            <p className="modal-intro">Este modulo esta preparado para receber parametros em proxima evolucao.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parametros editaveis nesta versao" disabled />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
