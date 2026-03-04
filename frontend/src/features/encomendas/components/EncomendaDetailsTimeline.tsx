import type { EncomendaDetail } from '../types'
import { getAppTimezone, parseApiDate } from '../../../utils/dateTime'

type TimelineEvent = {
  label: string
  date: string
  caption?: string
}

function formatTimelineDateTime(value?: string | null): string {
  if (!value) return '-'
  const raw = value.trim()
  if (!raw) return '-'

  const parsed = parseApiDate(raw)
  if (!parsed) return raw

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parsed.toLocaleDateString('pt-BR', { timeZone: getAppTimezone() })
  }

  const datePart = parsed.toLocaleDateString('pt-BR', { timeZone: getAppTimezone() })
  const timePart = parsed.toLocaleTimeString('pt-BR', {
    timeZone: getAppTimezone(),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${datePart} - ${timePart}`
}

function buildTimeline(detail: EncomendaDetail): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    label: 'Recebimento registrado',
    date: detail.data_recebimento ?? '-',
    caption: detail.hora_recebimento || undefined
  })

  if (detail.notificacao_status === 'ENVIADO') {
    events.push({
      label: 'Morador notificado',
      date: formatTimelineDateTime(detail.notificado_em ?? detail.data_recebimento ?? '-'),
      caption: detail.notificado_por || 'Notificação operacional'
    })
  }

  if (detail.notificacao_status === 'FALHA') {
    events.push({
      label: 'Falha ao notificar',
      date: formatTimelineDateTime(detail.notificado_em ?? detail.data_recebimento ?? '-'),
      caption: detail.notificacao_erro || detail.notificado_por || 'Falha na notificação operacional'
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
