export function WhatsAppSettingsPage(): JSX.Element {
  return (
    <section className="page-grid settings-page">
      <header className="page-header">
        <h1>Configurações de WhatsApp</h1>
        <p>Canal reservado para parâmetros de integração e automações via WhatsApp.</p>
      </header>

      <section className="settings-cards-grid" aria-label="Configurações de WhatsApp">
        <article className="panel report-card">
          <h2>Módulo em preparação</h2>
          <p>
            Esta seção foi criada para organizar as futuras funcionalidades de WhatsApp sem impactar as configurações
            gerais já existentes.
          </p>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>Estrutura pronta para evolução</dd>
            </div>
            <div>
              <dt>Escopo inicial</dt>
              <dd>Credenciais, templates e regras de envio</dd>
            </div>
            <div>
              <dt>Impacto atual</dt>
              <dd>Nenhum processo operacional alterado</dd>
            </div>
          </dl>
        </article>
      </section>
    </section>
  );
}
