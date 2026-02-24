import { useState } from 'react';

export function SettingsPage(): JSX.Element {
  const [salvando, setSalvando] = useState(false);

  async function onSave(): Promise<void> {
    setSalvando(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSalvando(false);
  }

  return (
    <section className="page-grid">
      <header className="page-header">
        <h1>Configuracoes CondoJET</h1>
        <p>Parametros operacionais, alertas e preferencias de visualizacao.</p>
      </header>

      <article className="panel">
        <h2>Preferencias gerais</h2>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <label>
            Nome da instancia
            <input defaultValue="CondoJET Operacao" />
          </label>
          <label>
            Timezone
            <select defaultValue="America/Sao_Paulo">
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
            </select>
          </label>
          <label className="inline-option">
            <input type="checkbox" defaultChecked />
            Receber alertas de encomenda em atraso
          </label>
          <div className="modal-actions">
            <button type="submit" className="cta" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar configuracoes'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

