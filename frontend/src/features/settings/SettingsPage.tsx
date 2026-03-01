import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';

const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Fortaleza',
  'America/Belem'
];

export function SettingsPage(): JSX.Element {
  const { user, updateTimezone } = useAuth();
  const canEditTimezone = Boolean(user?.condominioId);
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfiguracoes(): Promise<void> {
      if (!canEditTimezone) return;
      setCarregando(true);
      setErro(null);
      try {
        const { data } = await backendApi.get<{ timezone: string }>('/configuracoes');
        setTimezone(data.timezone);
        updateTimezone(data.timezone);
      } catch (err) {
        setErro(readApiError(err));
      } finally {
        setCarregando(false);
      }
    }
    void loadConfiguracoes();
  }, [canEditTimezone, updateTimezone]);

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
      const { data } = await backendApi.put<{ timezone: string }>('/configuracoes', { timezone });
      updateTimezone(data.timezone);
      setFeedback('Configuracoes salvas com sucesso.');
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="page-grid">
      <header className="page-header">
        <h1>Preferências da operação</h1>
        <p>Parametros operacionais, alertas e preferencias de visualizacao.</p>
      </header>

      <article className="panel">
        <h2>Preferencias gerais</h2>
        {carregando ? <p className="info-box">Carregando configuracoes...</p> : null}
        {!canEditTimezone ? <p className="info-box">Timezone configurado por condomínio. Conta global não possui ajuste próprio.</p> : null}
        {erro ? <p className="error-box">{erro}</p> : null}
        {feedback ? <p className="info-box">{feedback}</p> : null}
        <form className="form-grid" onSubmit={(event) => void onSave(event)}>
          <label>
            Nome da instancia
            <input defaultValue="CondoJET Operacao" disabled />
          </label>
          <label>
            Timezone
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!canEditTimezone || carregando || salvando}>
              {TIMEZONE_OPTIONS.map((option) => (
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
            <button type="submit" className="cta" disabled={!canEditTimezone || salvando || carregando}>
              {salvando ? 'Salvando...' : 'Salvar configuracoes'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
