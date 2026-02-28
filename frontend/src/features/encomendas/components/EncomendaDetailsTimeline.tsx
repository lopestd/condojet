import type { EncomendaDetail } from '../types'

type TimelineEvent = {
  label: string
  date: string
  caption?: string
}

function buildTimeline(detail: EncomendaDetail): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    label: 'Recebimento registrado',
    date: detail.data_recebimento ?? '-',
    caption: detail.hora_recebimento || undefined
  })

  if (detail.notificado_em || detail.status === 'DISPONIVEL_RETIRADA' || detail.status === 'ENTREGUE') {
    events.push({
      label: 'Morador notificado',
      date: detail.notificado_em ?? detail.data_recebimento ?? '-',
      caption: detail.notificado_por || 'Notificacao operacional'
    })
  }

  if (detail.data_entrega) {
    events.push({
      label: 'Encomenda entregue',
      date: detail.data_entrega,
      caption: detail.retirado_por_nome ?? undefined
    })
  }

  if (detail.reaberto_em) {
    events.push({
      label: 'Entrega reaberta',
      date: detail.reaberto_em,
      caption: detail.motivo_reabertura ?? undefined
    })
  }

  return events
}

export function EncomendaDetailsTimeline({ detail }: { detail: EncomendaDetail }): JSX.Element {
  const events = buildTimeline(detail)

  return (
    <ol className="encomenda-timeline" aria-label="Linha do tempo da encomenda">
      {events.map((event, index) => (
        <li key={`${event.label}-${event.date}-${index}`}>
          <div className="timeline-dot" aria-hidden="true" />
          <div>
            <p>{event.label}</p>
            <small>{event.date}</small>
            {event.caption ? <small>{event.caption}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
