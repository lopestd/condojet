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
        setErro('Configuração de timezone disponível apenas para administradores de condomínio.');
        return;
      }
      const { data } = await backendApi.put<{ timezone: string }>('/configuracoes', { timezone: modalTimezone });
      setTimezone(data.timezone);
      setModalTimezone(data.timezone);
      updateTimezone(data.timezone);
      setFeedback('Configurações salvas com sucesso.');
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
        <p>Parâmetros operacionais organizados por módulos de configuração.</p>
      </header>

      <section className="settings-cards-grid" aria-label="Módulos de configuração">
        <SettingsSectionCard
          title="Configuração de Timezone"
          description="Define o fuso horário oficial utilizado pelos registros de data e hora do condomínio."
          items={[
            { label: 'Timezone atual', value: timezone },
            { label: 'Status', value: 'Configuração ativa' },
            { label: 'Aplicação', value: 'Registros e consultas de data/hora' }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedback}
          infoMessage={canEditTimezone ? null : 'Timezone configurado por condomínio. Somente administrador do condomínio pode alterar.'}
          onOpen={openTimezoneModal}
        />

        <SettingsSectionCard
          title="Notificações e Alertas"
          description="Módulo reservado para parâmetros de canais, janelas de envio e regras de notificação."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrização' },
            { label: 'Visualização', value: 'Somente leitura no card' },
            { label: 'Edição', value: 'Via modal' }
          ]}
          infoMessage="Template: seguir o padrão do módulo de Timezone para novos itens."
          onOpen={() => setActiveModal('notificacoes')}
        />

        <SettingsSectionCard
          title="Integrações Operacionais"
          description="Módulo reservado para tokens, credenciais e políticas de integração com serviços externos."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrização' },
            { label: 'Visualização', value: 'Somente leitura no card' },
            { label: 'Edição', value: 'Via modal' }
          ]}
          infoMessage="Template: campos, validação e ação de salvar por módulo independente."
          onOpen={() => setActiveModal('integracoes')}
        />
      </section>

      {activeModal === 'timezone' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Configuração de Timezone</h3>
            <p className="modal-intro">Atualize o fuso horário oficial utilizado pelo condomínio.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSave(event)}>
              <label>
                Nome da instância
                <input value="CondoJET Operação" disabled />
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
            <h3>Editar Notificações e Alertas</h3>
            <p className="modal-intro">Este módulo está preparado para receber parâmetros em próxima evolução.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parâmetros editáveis nesta versão" disabled />
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
            <h3>Editar Integrações Operacionais</h3>
            <p className="modal-intro">Este módulo está preparado para receber parâmetros em próxima evolução.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parâmetros editáveis nesta versão" disabled />
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
