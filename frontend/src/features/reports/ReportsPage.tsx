import type { JSX } from 'react';

const REPORT_CATALOG: Array<{ title: string; objective: string; metrics: string; cadence: string }> = [
  {
    title: 'SLA de Entrega por Portaria',
    objective: 'Medir o tempo medio entre recebimento e retirada para identificar gargalos operacionais por turno/equipe.',
    metrics: 'Tempo medio de retirada, mediana, percentual dentro do SLA (24h/48h), volume por turno.',
    cadence: 'Diario e semanal'
  },
  {
    title: 'Encomendas em Risco de Atraso',
    objective: 'Antecipar pendencias antes de virar atraso critico.',
    metrics: 'Quantidade por faixa de espera (24h, 48h, 72h+), top unidades reincidentes, tendencia da semana.',
    cadence: 'Tempo real e diario'
  },
  {
    title: 'Taxa de Notificacao Efetiva',
    objective: 'Validar a efetividade do processo de aviso ao morador.',
    metrics: 'Tempo ate notificar, percentual de notificadas em ate 30 min, falhas/reenvios por canal.',
    cadence: 'Diario e mensal'
  },
  {
    title: 'Volume por Torre/Bloco/Quadra',
    objective: 'Entender concentracao de demanda para ajustar equipe e janelas de atendimento.',
    metrics: 'Entradas e retiradas por localizacao, pico por dia da semana e horario.',
    cadence: 'Semanal e mensal'
  },
  {
    title: 'Produtividade de Atendimento',
    objective: 'Comparar desempenho operacional da equipe sem expor dados sensiveis indevidos.',
    metrics: 'Recebimentos registrados por colaborador, retiradas finalizadas, tempo medio de atendimento.',
    cadence: 'Semanal'
  },
  {
    title: 'Moradores com Acumulo Recorrente',
    objective: 'Apoiar acao preventiva e comunicacao para reduzir estoque parado na portaria.',
    metrics: 'Unidades com maior recorrencia de atraso, permanencia media, historico de reincidencia.',
    cadence: 'Mensal'
  },
  {
    title: 'Auditoria de Rastreabilidade',
    objective: 'Garantir conformidade e rastreio completo de eventos da encomenda.',
    metrics: 'Itens sem etapa obrigatoria, divergencias de horario/evento, registros incompletos.',
    cadence: 'Diario e sob demanda'
  },
  {
    title: 'Capacidade da Area de Guarda',
    objective: 'Evitar saturacao fisica do espaco de encomendas.',
    metrics: 'Estoque atual, ocupacao por faixa de tamanho, projecao de lotacao para 7 dias.',
    cadence: 'Diario'
  }
];

export function ReportsPage(): JSX.Element {
  return (
    <section className="page-grid reports-page">
      <header className="panel reports-header">
        <h1>Relatorios de Encomendas</h1>
        <p>
          Propostas de relatorios para aumentar controle operacional, reduzir atrasos e melhorar a experiencia dos moradores.
        </p>
      </header>

      <section className="reports-grid" aria-label="Catalogo de relatorios">
        {REPORT_CATALOG.map((report) => (
          <article key={report.title} className="panel report-card">
            <h2>{report.title}</h2>
            <p>{report.objective}</p>
            <dl>
              <div>
                <dt>Metricas-chave</dt>
                <dd>{report.metrics}</dd>
              </div>
              <div>
                <dt>Periodicidade sugerida</dt>
                <dd>{report.cadence}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </section>
  );
}
