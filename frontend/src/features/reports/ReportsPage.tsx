import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { formatDateBR, parseApiDate } from '../../utils/dateTime';
import type { Endereco, EncomendaListItem } from '../encomendas/types';

type PeriodType = '7d' | '30d' | '90d' | 'year' | 'custom';
type DetailStatus = 'ENTREGUES' | 'AGUARDANDO_RETIRADA' | 'ESQUECIDAS';

type AnalyticsItem = EncomendaListItem & {
  receivedAt: Date | null;
  deliveredAt: Date | null;
  enderecoNome: string;
  endereco?: Endereco;
};

type ReportRange = {
  start: Date;
  end: Date;
  valid: boolean;
  label: string;
  error: string | null;
};

type DailyRow = {
  label: string;
  iso: string;
  recebidas: number;
  entregues: number;
};

type ReportDetailRow = {
  id: number;
  status: DetailStatus;
  statusLabel: string;
  dataEntrada: string;
  dataEntrega: string;
  aguardandoDias: number | null;
  dataEntradaOrder: number;
  moradorNome: string;
  contatoMorador: string;
  endereco: {
    quadra: string;
    secondLabel: string;
    secondValue: string;
    thirdLabel: string;
    thirdValue: string;
  };
};

type ConfiguracoesResponse = {
  timezone: string;
  prazo_dias_encomenda_esquecida: number;
};

type MoradorContato = {
  id: number;
  telefone?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FORGOTTEN_DAYS = 15;

const PERIOD_OPTIONS: Array<{ value: PeriodType; label: string }> = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'year', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' }
];

const DETAIL_STATUS_OPTIONS: Array<{ value: DetailStatus; label: string }> = [
  { value: 'ENTREGUES', label: 'Entregues' },
  { value: 'AGUARDANDO_RETIRADA', label: 'Aguardando Retirada' },
  { value: 'ESQUECIDAS', label: 'Esquecidas' }
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseDateTime(date?: string | null, time?: string | null): Date | null {
  const parsed = parseApiDate(date);
  if (!parsed) return null;
  if (!time) return parsed;

  const parts = time.split(':').map((item) => Number(item));
  const hour = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minute = Number.isFinite(parts[1]) ? parts[1] : 0;
  const second = Number.isFinite(parts[2]) ? parts[2] : 0;
  parsed.setHours(hour, minute, second, 0);
  return parsed;
}

function formatBrDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseBrDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const parsed = new Date(year, month, day, 0, 0, 0, 0);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) return null;
  return parsed;
}

function normalizeBrDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toIsoDate(value: string): string {
  const parsed = parseBrDate(value);
  if (!parsed) return '';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function fromIsoDate(value: string): string {
  const parsed = parseApiDate(value);
  return parsed ? formatBrDate(parsed) : '';
}

function buildEnderecoLabel(endereco?: Endereco): string {
  if (!endereco) return 'Não informado';
  const parts = [endereco.quadra, endereco.conjunto, endereco.lote].filter(Boolean);
  if (parts.length > 0) return parts.join(' - ');
  return endereco.tipo_endereco || `Endereço ${endereco.id}`;
}

function getEnderecoParts(endereco: Endereco | undefined): {
  quadra: string;
  secondLabel: string;
  secondValue: string;
  thirdLabel: string;
  thirdValue: string;
} {
  if (!endereco) {
    return {
      quadra: '-',
      secondLabel: 'Conjunto',
      secondValue: '-',
      thirdLabel: 'Lote',
      thirdValue: '-'
    };
  }

  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    return {
      quadra: endereco.quadra || '-',
      secondLabel: 'Setor/Chácara',
      secondValue: endereco.setor_chacara || '-',
      thirdLabel: 'Número Chácara',
      thirdValue: endereco.numero_chacara || '-'
    };
  }

  return {
    quadra: endereco.quadra || '-',
    secondLabel: 'Conjunto',
    secondValue: endereco.conjunto || '-',
    thirdLabel: 'Lote',
    thirdValue: endereco.lote || '-'
  };
}

function sameDayIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function statusLabel(status: DetailStatus): string {
  if (status === 'ENTREGUES') return 'Entregue';
  if (status === 'AGUARDANDO_RETIRADA') return 'Aguardando Retirada';
  return 'Esquecida';
}

function formatAguardandoValue(row: ReportDetailRow): string {
  if (row.status === 'ENTREGUES') return '-';
  return row.aguardandoDias === null ? '-' : `${row.aguardandoDias} dias`;
}

function matchesDetailStatusFilter(row: ReportDetailRow, selected: Set<DetailStatus>): boolean {
  if (selected.has(row.status)) return true;
  // "Aguardando Retirada" deve cobrir toda encomenda não entregue, incluindo esquecidas.
  if (selected.has('AGUARDANDO_RETIRADA') && row.status === 'ESQUECIDAS') return true;
  return false;
}

export function ReportsPage(): JSX.Element {
  const { user } = useAuth();

  const [period, setPeriod] = useState<PeriodType>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [moradorContatoMap, setMoradorContatoMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgottenDaysThreshold, setForgottenDaysThreshold] = useState<number>(DEFAULT_FORGOTTEN_DAYS);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailStatuses, setDetailStatuses] = useState<DetailStatus[]>(() => DETAIL_STATUS_OPTIONS.map((item) => item.value));
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const startPickerRef = useRef<HTMLInputElement | null>(null);
  const endPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadData(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [encomendasResponse, enderecosResponse, moradoresResponse] = await Promise.all([
          backendApi.get<EncomendaListItem[]>('/encomendas'),
          backendApi.get<Endereco[]>('/enderecos'),
          backendApi.get<MoradorContato[]>('/moradores')
        ]);

        const enderecoById = new Map<number, Endereco>();
        enderecosResponse.data.forEach((endereco) => enderecoById.set(endereco.id, endereco));

        const contatoByMorador: Record<number, string> = {};
        moradoresResponse.data.forEach((morador) => {
          contatoByMorador[morador.id] = morador.telefone?.trim() || '-';
        });

        const normalized = encomendasResponse.data.map((item) => {
          const endereco = enderecoById.get(item.endereco_id);
          return {
            ...item,
            receivedAt: parseDateTime(item.data_recebimento, item.hora_recebimento),
            deliveredAt: parseDateTime(item.data_entrega),
            enderecoNome: item.endereco_label?.trim() || buildEnderecoLabel(endereco),
            endereco
          };
        });

        setItems(normalized);
        setMoradorContatoMap(contatoByMorador);

        if (user?.role === 'ADMIN') {
          try {
            const { data } = await backendApi.get<ConfiguracoesResponse>('/configuracoes');
            setForgottenDaysThreshold(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
          } catch {
            setForgottenDaysThreshold(DEFAULT_FORGOTTEN_DAYS);
          }
        } else {
          setForgottenDaysThreshold(DEFAULT_FORGOTTEN_DAYS);
        }
      } catch (err) {
        setError(readApiError(err));
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user?.role]);

  useEffect(() => {
    if (period !== 'custom') return;
    setCustomStart('');
    setCustomEnd('');
  }, [period]);

  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    items.forEach((item) => {
      if (item.receivedAt) years.add(item.receivedAt.getFullYear());
      if (item.deliveredAt) years.add(item.deliveredAt.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

  useEffect(() => {
    if (availableYears.length === 0) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const range = useMemo<ReportRange>(() => {
    const now = new Date();

    if (period === '7d') {
      return {
        start: startOfDay(new Date(now.getTime() - 6 * DAY_MS)),
        end: endOfDay(now),
        valid: true,
        label: 'Últimos 7 dias',
        error: null
      };
    }

    if (period === '30d') {
      return {
        start: startOfDay(new Date(now.getTime() - 29 * DAY_MS)),
        end: endOfDay(now),
        valid: true,
        label: 'Últimos 30 dias',
        error: null
      };
    }

    if (period === '90d') {
      return {
        start: startOfDay(new Date(now.getTime() - 89 * DAY_MS)),
        end: endOfDay(now),
        valid: true,
        label: 'Últimos 90 dias',
        error: null
      };
    }

    if (period === 'year') {
      const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        valid: true,
        label: `01/01/${selectedYear} a 31/12/${selectedYear}`,
        error: null
      };
    }

    const start = parseBrDate(customStart);
    const end = parseBrDate(customEnd);

    if (!start || !end) {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        valid: false,
        label: 'Período personalizado',
        error: null
      };
    }

    if (end.getTime() < start.getTime()) {
      return {
        start: startOfDay(start),
        end: endOfDay(end),
        valid: false,
        label: `${formatBrDate(start)} a ${formatBrDate(end)}`,
        error: 'A data final não pode ser anterior à data inicial.'
      };
    }

    return {
      start: startOfDay(start),
      end: endOfDay(end),
      valid: true,
      label: `${formatBrDate(start)} a ${formatBrDate(end)}`,
      error: null
    };
  }, [customEnd, customStart, period, selectedYear]);

  const receivedWithinPeriod = useMemo(() => {
    if (!range.valid) return [] as AnalyticsItem[];
    return items.filter((item) => item.receivedAt && item.receivedAt >= range.start && item.receivedAt <= range.end);
  }, [items, range]);

  const deliveredWithinPeriod = useMemo(() => {
    if (!range.valid) return [] as AnalyticsItem[];
    return items.filter((item) => item.status === 'ENTREGUE' && item.deliveredAt && item.deliveredAt >= range.start && item.deliveredAt <= range.end);
  }, [items, range]);

  const aguardando = useMemo(() => {
    return receivedWithinPeriod.filter((item) => item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA');
  }, [receivedWithinPeriod]);

  const esquecidas = useMemo(() => {
    const limit = Date.now() - Math.max(1, forgottenDaysThreshold) * DAY_MS;
    return aguardando.filter((item) => item.receivedAt && item.receivedAt.getTime() < limit);
  }, [aguardando, forgottenDaysThreshold]);

  const deliveredWithinPeriodIds = useMemo(() => {
    return new Set<number>(deliveredWithinPeriod.map((item) => item.id));
  }, [deliveredWithinPeriod]);

  const statusChartData = useMemo(() => {
    return [
      { name: 'Entregues', value: deliveredWithinPeriod.length, color: '#10B981' },
      { name: 'Aguardando', value: aguardando.length, color: '#F59E0B' },
      { name: 'Esquecidas', value: esquecidas.length, color: '#EF4444' }
    ];
  }, [aguardando.length, deliveredWithinPeriod.length, esquecidas.length]);

  const dailyEvolutionData = useMemo<DailyRow[]>(() => {
    if (!range.valid) return [];

    const days = new Map<string, DailyRow>();
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      const iso = sameDayIso(cursor);
      days.set(iso, {
        iso,
        label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        recebidas: 0,
        entregues: 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    receivedWithinPeriod.forEach((item) => {
      if (!item.receivedAt) return;
      const day = days.get(sameDayIso(item.receivedAt));
      if (day) day.recebidas += 1;
    });

    deliveredWithinPeriod.forEach((item) => {
      if (!item.deliveredAt) return;
      const day = days.get(sameDayIso(item.deliveredAt));
      if (day) day.entregues += 1;
    });

    return Array.from(days.values());
  }, [deliveredWithinPeriod, range, receivedWithinPeriod]);

  const detailRows = useMemo<ReportDetailRow[]>(() => {
    if (!range.valid) return [];

    const pool = new Map<number, AnalyticsItem>();
    receivedWithinPeriod.forEach((item) => pool.set(item.id, item));
    deliveredWithinPeriod.forEach((item) => pool.set(item.id, item));

    const forgottenLimit = Date.now() - Math.max(1, forgottenDaysThreshold) * DAY_MS;

    return Array.from(pool.values())
      .map((item) => {
        let status: DetailStatus = 'AGUARDANDO_RETIRADA';

        if (deliveredWithinPeriodIds.has(item.id)) {
          status = 'ENTREGUES';
        } else if (item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA') {
          status = item.receivedAt && item.receivedAt.getTime() < forgottenLimit ? 'ESQUECIDAS' : 'AGUARDANDO_RETIRADA';
        }

        const parts = getEnderecoParts(item.endereco);

        return {
          id: item.id,
          status,
          statusLabel: statusLabel(status),
          dataEntrada: formatDateBR(item.data_recebimento),
          dataEntrega: status === 'ENTREGUES' ? formatDateBR(item.data_entrega) : '-',
          aguardandoDias:
            status === 'ENTREGUES'
              ? null
              : item.receivedAt
                ? Math.max(1, Math.floor((new Date().getTime() - item.receivedAt.getTime()) / DAY_MS))
                : 0,
          dataEntradaOrder: item.receivedAt?.getTime() ?? 0,
          moradorNome: item.morador_nome?.trim() || `Morador ${item.morador_id}`,
          contatoMorador: moradorContatoMap[item.morador_id] || '-',
          endereco: parts
        };
      })
      .sort((a, b) => b.dataEntradaOrder - a.dataEntradaOrder);
  }, [deliveredWithinPeriod, deliveredWithinPeriodIds, forgottenDaysThreshold, moradorContatoMap, range.valid, receivedWithinPeriod]);

  const filteredDetailRows = useMemo(() => {
    const selected = new Set(detailStatuses);
    return detailRows.filter((row) => matchesDetailStatusFilter(row, selected));
  }, [detailRows, detailStatuses]);

  function toggleDetailStatus(status: DetailStatus): void {
    setDetailStatuses((previous) => {
      if (previous.includes(status)) {
        return previous.filter((item) => item !== status);
      }
      return [...previous, status];
    });
  }

  function selectAllDetailStatus(): void {
    setDetailStatuses(DETAIL_STATUS_OPTIONS.map((item) => item.value));
  }

  function clearDetailStatus(): void {
    setDetailStatuses([]);
  }

  async function exportDetailPdf(): Promise<void> {
    if (exportingPdf || filteredDetailRows.length === 0) return;

    setExportingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;

      doc.setFontSize(16);
      doc.setTextColor(15, 37, 64);
      doc.text('CondoJET - Detalhamento de Relatório', margin, margin);
      doc.setFontSize(11);
      doc.text(`Período: ${range.label}`, margin, margin + 20);
      doc.text(`Status: ${DETAIL_STATUS_OPTIONS.filter((item) => detailStatuses.includes(item.value)).map((item) => item.label).join(', ')}`, margin, margin + 36);
      doc.text(`Total de encomendas: ${filteredDetailRows.length}`, margin, margin + 52);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, margin + 68);

      const body = filteredDetailRows.map((row) => [
        row.statusLabel,
        row.dataEntrada,
        formatAguardandoValue(row),
        row.dataEntrega,
        row.moradorNome,
        `Quadra: ${row.endereco.quadra}\n${row.endereco.secondLabel}: ${row.endereco.secondValue}\n${row.endereco.thirdLabel}: ${row.endereco.thirdValue}`,
        row.contatoMorador
      ]);

      autoTable(doc, {
        startY: margin + 84,
        head: [['Situação', 'DATA_ENTRADA', 'AGUARDANDO', 'DATA_ENTREGA', 'Morador(a)', 'Endereço', 'Contato']],
        body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
        headStyles: { fillColor: [15, 37, 64] },
        margin: { left: margin, right: margin }
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
      }

      doc.save(`detalhamento-relatorio-${Date.now()}.pdf`);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setExportingPdf(false);
    }
  }

  function exportDetailExcel(): void {
    if (exportingExcel || filteredDetailRows.length === 0) return;

    setExportingExcel(true);
    try {
      const data = filteredDetailRows.map((row) => ({
        SITUACAO: row.statusLabel,
        DATA_ENTRADA: row.dataEntrada,
        AGUARDANDO: formatAguardandoValue(row),
        DATA_ENTREGA: row.dataEntrega,
        MORADOR: row.moradorNome,
        ENDERECO: `Quadra: ${row.endereco.quadra} | ${row.endereco.secondLabel}: ${row.endereco.secondValue} | ${row.endereco.thirdLabel}: ${row.endereco.thirdValue}`,
        CONTATO: row.contatoMorador
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalhamento');
      XLSX.writeFile(workbook, `detalhamento-relatorio-${Date.now()}.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  }

  const customStartIso = toIsoDate(customStart);
  const customEndIso = toIsoDate(customEnd);

  return (
    <section className="page-grid reports-mgr-page">
      <section className="panel reports-mgr-filters">
        <div className="reports-mgr-export-row">
          <p className="reports-mgr-export-title">Escolha o filtro de período</p>
          <button
            type="button"
            className="cta reports-mgr-detail-btn"
            onClick={() => setShowDetailModal(true)}
            disabled={!range.valid || loading}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 3h10l4 4v13a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm9 1.5V8h3.5L14 4.5ZM7 11a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H7Zm0 4a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H7Z"
                fill="currentColor"
              />
            </svg>
            <span>Detalhar relatório</span>
          </button>
        </div>

        <div className="reports-mgr-filter-row" role="tablist" aria-label="Filtros rápidos de período">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`reports-mgr-period-btn ${period === option.value ? 'active' : ''}`}
              onClick={() => setPeriod(option.value)}
              role="tab"
              aria-selected={period === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        {period === 'year' ? (
          <label className="reports-year-select">
            Ano de referência
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {period === 'custom' ? (
          <div className="reports-mgr-custom-cards">
            <label className="reports-mgr-date-card">
              <span>Data início</span>
              <div className="reports-mgr-date-field">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={customStart}
                  onChange={(event) => {
                    const normalized = normalizeBrDate(event.target.value);
                    setCustomStart(normalized);
                  }}
                  onFocus={() => {
                    if (startPickerRef.current?.showPicker) startPickerRef.current.showPicker();
                  }}
                />
                <input
                  ref={startPickerRef}
                  type="date"
                  className="reports-mgr-date-hidden"
                  value={customStartIso}
                  onChange={(event) => {
                    setCustomStart(fromIsoDate(event.target.value));
                  }}
                />
                <button
                  type="button"
                  className="reports-mgr-date-trigger"
                  aria-label="Abrir calendário da data início"
                  onClick={() => {
                    if (startPickerRef.current?.showPicker) startPickerRef.current.showPicker();
                    else startPickerRef.current?.focus();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8ZM6 6H5a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1h-1v1a1 1 0 1 1-2 0V6H8v1a1 1 0 1 1-2 0V6Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </label>

            <label className="reports-mgr-date-card">
              <span>Data fim</span>
              <div className="reports-mgr-date-field">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={customEnd}
                  onChange={(event) => {
                    const normalized = normalizeBrDate(event.target.value);
                    setCustomEnd(normalized);
                  }}
                  onFocus={() => {
                    if (endPickerRef.current?.showPicker) endPickerRef.current.showPicker();
                  }}
                />
                <input
                  ref={endPickerRef}
                  type="date"
                  className="reports-mgr-date-hidden"
                  value={customEndIso}
                  min={customStartIso || undefined}
                  onChange={(event) => {
                    setCustomEnd(fromIsoDate(event.target.value));
                  }}
                />
                <button
                  type="button"
                  className="reports-mgr-date-trigger"
                  aria-label="Abrir calendário da data fim"
                  onClick={() => {
                    if (endPickerRef.current?.showPicker) endPickerRef.current.showPicker();
                    else endPickerRef.current?.focus();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8ZM6 6H5a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1h-1v1a1 1 0 1 1-2 0V6H8v1a1 1 0 1 1-2 0V6Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </label>
          </div>
        ) : null}

        <div className="reports-mgr-period-row">
          <small className="reports-mgr-period-caption">Período selecionado: {range.label}</small>
          {period === 'custom' ? (
            <button
              type="button"
              className="button-soft small"
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
              disabled={!customStart && !customEnd}
            >
              Limpar datas
            </button>
          ) : null}
        </div>
        {range.error ? <p className="error-box">A data final não pode ser anterior à data inicial.</p> : null}
      </section>

      {loading ? <p className="info-box">Carregando relatórios...</p> : null}
      {error ? <p className="error-box">{error}</p> : null}

      {!loading && !error && range.valid ? (
        <>
          <section className="reports-mgr-kpis">
            <article className="panel reports-mgr-kpi">
              <span>TOTAL RECEBIDAS</span>
              <strong>{receivedWithinPeriod.length}</strong>
            </article>
            <article className="panel reports-mgr-kpi reports-mgr-kpi-delivered">
              <span>Entregues</span>
              <strong>{deliveredWithinPeriod.length}</strong>
            </article>
            <article className="panel reports-mgr-kpi reports-mgr-kpi-waiting">
              <span>Aguardando Retirada</span>
              <strong>{aguardando.length}</strong>
            </article>
            <article
              className="panel reports-mgr-kpi reports-mgr-kpi-alert"
              title={`Encomendas com mais de ${forgottenDaysThreshold} dias aguardando retirada.`}
            >
              <span>Encomendas Esquecidas</span>
              <strong>{esquecidas.length}</strong>
              <small>{`Encomendas com mais de ${forgottenDaysThreshold} dias aguardando retirada.`}</small>
            </article>
          </section>

          <section className="reports-mgr-charts-grid">
            <article className="panel reports-mgr-chart-card">
              <h2>Distribuição por Status</h2>
              <div className="reports-mgr-chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={94} paddingAngle={3}>
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel reports-mgr-chart-card">
              <h2>Evolução no Período</h2>
              <div className="reports-mgr-chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyEvolutionData} margin={{ top: 8, right: 12, left: 6, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dce6f2" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={8} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="recebidas" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="entregues" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {showDetailModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide reports-mgr-detail-modal">
            <div className="reports-mgr-detail-head">
              <div>
                <h3>Detalhamento de Relatório</h3>
                <p>Período: {range.label}</p>
              </div>
              <button
                type="button"
                className="reports-mgr-modal-close"
                aria-label="Fechar modal"
                onClick={() => setShowDetailModal(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="reports-mgr-detail-filters">
              {DETAIL_STATUS_OPTIONS.map((option) => (
                <label key={option.value} className={`reports-mgr-status-chip ${detailStatuses.includes(option.value) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={detailStatuses.includes(option.value)}
                    onChange={() => toggleDetailStatus(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <div className="reports-mgr-detail-toolbar">
              <div className="action-group reports-mgr-selection-actions">
                <button type="button" className="button-soft small reports-mgr-selection-btn" onClick={selectAllDetailStatus}>
                  Marcar todos
                </button>
                <button type="button" className="button-soft small reports-mgr-selection-btn" onClick={clearDetailStatus}>
                  Limpar seleção
                </button>
              </div>

              <strong className="reports-mgr-detail-total">Total de encomendas: {filteredDetailRows.length}</strong>

              <div className="action-group">
                <button
                  type="button"
                  className="button-soft small"
                  onClick={exportDetailExcel}
                  disabled={filteredDetailRows.length === 0 || exportingExcel}
                >
                  {exportingExcel ? 'Exportando Excel...' : 'Exportar Excel'}
                </button>
                <button
                  type="button"
                  className="cta small"
                  onClick={() => void exportDetailPdf()}
                  disabled={filteredDetailRows.length === 0 || exportingPdf}
                >
                  {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
                </button>
              </div>
            </div>

            <div className="table-wrap reports-mgr-detail-table-wrap">
              <table className="reports-mgr-detail-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>DATA_ENTRADA</th>
                    <th>AGUARDANDO</th>
                    <th>DATA_ENTREGA</th>
                    <th>Morador(a)</th>
                    <th>Endereço</th>
                    <th>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.statusLabel}</td>
                      <td>{row.dataEntrada}</td>
                      <td>{formatAguardandoValue(row)}</td>
                      <td>{row.dataEntrega}</td>
                      <td>{row.moradorNome}</td>
                      <td>
                        <div className="reports-mgr-endereco-stack">
                          <p>
                            <strong>Quadra:</strong> {row.endereco.quadra}
                          </p>
                          <p>
                            <strong>{row.endereco.secondLabel}:</strong> {row.endereco.secondValue}
                          </p>
                          <p>
                            <strong>{row.endereco.thirdLabel}:</strong> {row.endereco.thirdValue}
                          </p>
                        </div>
                      </td>
                      <td>{row.contatoMorador}</td>
                    </tr>
                  ))}
                  {filteredDetailRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>Nenhuma encomenda encontrada para os filtros selecionados.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
