import type { EncomendaDetail } from '../types'
import { getAppTimezone, parseApiDate } from '../../../utils/dateTime'

type TimelineEvent = {
  label: string
  dateTime: string
  caption?: string
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_REGEX = /(\d{2}):(\d{2})(?::(\d{2}))?/

function normalizeTime(value?: string | null): string {
  if (!value) return '00:00:00'
  const match = TIME_REGEX.exec(value.trim())
  if (!match) return '00:00:00'
  const hh = match[1]
  const mm = match[2]
  const ss = match[3] ?? '00'
  return `${hh}:${mm}:${ss}`
}

function formatTimelineDateTime(dateValue?: string | null, timeValue?: string | null): string {
  if (!dateValue) return '-'
  const raw = dateValue.trim()
  if (!raw) return '-'

  const dateMatch = DATE_ONLY_REGEX.exec(raw)
  if (dateMatch) {
    const datePart = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`
    return `${datePart} - ${normalizeTime(timeValue)}`
  }

  const parsed = parseApiDate(raw)
  if (!parsed) return raw
  const datePart = parsed.toLocaleDateString('pt-BR', { timeZone: getAppTimezone() })
  const timePart = parsed.toLocaleTimeString('pt-BR', {
    timeZone: getAppTimezone(),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  return `${datePart} - ${timePart}`
}

function buildTimeline(detail: EncomendaDetail): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    label: 'Recebimento registrado',
    dateTime: formatTimelineDateTime(detail.data_recebimento, detail.hora_recebimento)
  })

  if (detail.notificacao_status === 'ENVIADO') {
    events.push({
      label: 'Morador notificado',
      dateTime: formatTimelineDateTime(detail.notificado_em ?? detail.data_recebimento ?? '-'),
      caption: detail.notificado_por || 'Notificação operacional'
    })
  }

  if (detail.notificacao_status === 'FALHA') {
    events.push({
      label: 'Falha ao notificar',
      dateTime: formatTimelineDateTime(detail.notificado_em ?? detail.data_recebimento ?? '-'),
      caption: detail.notificacao_erro || detail.notificado_por || 'Falha na notificação operacional'
    })
  }

  if (detail.data_entrega) {
    events.push({
      label: 'Encomenda entregue',
      dateTime: formatTimelineDateTime(detail.data_entrega)
    })
  }

  if (detail.reaberto_em) {
    events.push({
      label: 'Entrega reaberta',
      dateTime: formatTimelineDateTime(detail.reaberto_em),
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
        <li key={`${event.label}-${event.dateTime}-${index}`}>
          <div className="timeline-dot" aria-hidden="true" />
          <div>
            <p>{event.label}</p>
            <small>{event.dateTime}</small>
            {event.caption ? <small>{event.caption}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
