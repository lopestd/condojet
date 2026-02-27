type Props = {
  total: number
  aguardando: number
  notificadas: number
  entregues: number
  atrasadas: number
}

export function EncomendasStatsStrip({ total, aguardando, notificadas, entregues, atrasadas }: Props): JSX.Element {
  return (
    <section className="encomendas-stats" aria-label="Resumo das encomendas">
      <article className="kpi-card">
        <span>Total</span>
        <strong>{total}</strong>
      </article>
      <article className="kpi-card">
        <span>Aguardando</span>
        <strong>{aguardando}</strong>
      </article>
      <article className="kpi-card">
        <span>Notificadas</span>
        <strong>{notificadas}</strong>
      </article>
      <article className="kpi-card">
        <span>Entregues</span>
        <strong>{entregues}</strong>
      </article>
      <article className="kpi-card kpi-overdue">
        <span>Atrasadas</span>
        <strong>{atrasadas}</strong>
      </article>
    </section>
  )
}
