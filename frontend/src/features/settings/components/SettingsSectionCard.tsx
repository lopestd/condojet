import type { ReactNode } from 'react';

type SettingsSectionItem = {
  label: string;
  value: ReactNode;
};

type SettingsSectionCardProps = {
  title: string;
  description: string;
  items: SettingsSectionItem[];
  loading?: boolean;
  error?: string | null;
  feedback?: string | null;
  infoMessage?: string | null;
  onOpen: () => void;
};

export function SettingsSectionCard({
  title,
  description,
  items,
  loading = false,
  error = null,
  feedback = null,
  infoMessage = null,
  onOpen
}: SettingsSectionCardProps): JSX.Element {
  return (
    <article className="panel settings-card settings-card-interactive">
      <button type="button" className="settings-card-trigger" onClick={onOpen}>
        <header className="settings-card-header">
          <div className="settings-card-title-row">
            <h2>{title}</h2>
            <span className="settings-card-edit-label">Clique para editar</span>
          </div>
          <p>{description}</p>
        </header>
        <div className="settings-card-divider" aria-hidden="true" />
        <dl className="settings-readonly-list">
          {items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        {loading ? <p className="info-box">Carregando configurações...</p> : null}
        {infoMessage ? <p className="info-box">{infoMessage}</p> : null}
        {error ? <p className="error-box">{error}</p> : null}
        {feedback ? <p className="info-box">{feedback}</p> : null}
      </button>
    </article>
  );
}
