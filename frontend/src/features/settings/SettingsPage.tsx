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
const DEFAULT_FORGOTTEN_DAYS = 15;

type ConfiguracoesResponse = {
  timezone: string;
  prazo_dias_encomenda_esquecida: number;
};

export function SettingsPage(): JSX.Element {
  const { user, updateTimezone } = useAuth();
  const canEditTimezone = user?.role === 'ADMIN' && Boolean(user?.condominioId);
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [modalTimezone, setModalTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [prazoEsquecida, setPrazoEsquecida] = useState<number>(DEFAULT_FORGOTTEN_DAYS);
  const [modalPrazoEsquecida, setModalPrazoEsquecida] = useState<number>(DEFAULT_FORGOTTEN_DAYS);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'timezone' | 'esquecida' | 'notificacoes' | 'integracoes' | null>(null);
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
        const { data } = await backendApi.get<ConfiguracoesResponse>('/configuracoes');
        setTimezone(data.timezone);
        setModalTimezone(data.timezone);
        setPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
        setModalPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
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

  function openPrazoModal(): void {
    setErro(null);
    setFeedback(null);
    setModalPrazoEsquecida(prazoEsquecida);
    setActiveModal('esquecida');
  }

  async function onSaveTimezone(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    try {
      if (!canEditTimezone) {
        setErro('Configuração de timezone disponível apenas para administradores de condomínio.');
        return;
      }
      const { data } = await backendApi.put<ConfiguracoesResponse>('/configuracoes', { timezone: modalTimezone });
      setTimezone(data.timezone);
      setModalTimezone(data.timezone);
      setPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      setModalPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      updateTimezone(data.timezone);
      setFeedback('Configurações salvas com sucesso.');
      setActiveModal(null);
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  async function onSavePrazoEsquecida(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    try {
      if (!canEditTimezone) {
        setErro('Configuração de prazo disponível apenas para administradores de condomínio.');
        return;
      }
      const prazoNormalizado = Number.isFinite(modalPrazoEsquecida) ? Math.floor(modalPrazoEsquecida) : DEFAULT_FORGOTTEN_DAYS;
      const { data } = await backendApi.put<ConfiguracoesResponse>('/configuracoes', {
        prazo_dias_encomenda_esquecida: Math.max(1, prazoNormalizado)
      });
      setPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      setModalPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
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
          title="Prazo para Encomendas Esquecidas"
          description="Define em quantos dias uma encomenda pendente deve ser classificada como esquecida."
          items={[
            { label: 'Prazo atual', value: `${prazoEsquecida} dias` },
            { label: 'Status', value: 'Configuração ativa' },
            { label: 'Aplicação', value: 'Telas de Encomendas e Relatórios' }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedback}
          infoMessage={canEditTimezone ? null : 'Somente administrador do condomínio pode alterar esse prazo.'}
          onOpen={openPrazoModal}
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
            <form className="form-grid" onSubmit={(event) => void onSaveTimezone(event)}>
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

      {activeModal === 'esquecida' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Prazo de Encomendas Esquecidas</h3>
            <p className="modal-intro">Defina o número de dias para classificar encomendas pendentes como esquecidas.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSavePrazoEsquecida(event)}>
              <label>
                Prazo em dias
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={modalPrazoEsquecida}
                  onChange={(event) => setModalPrazoEsquecida(Number(event.target.value))}
                  disabled={!canEditTimezone || carregando || salvando}
                />
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
