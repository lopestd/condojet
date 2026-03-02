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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { formatDateBR, parseApiDate } from '../../utils/dateTime';
import type { Endereco, EncomendaDetail, EncomendaListItem } from '../encomendas/types';

type PeriodType = '7d' | '30d' | '90d' | 'custom';

type AnalyticsItem = EncomendaListItem & {
  receivedAt: Date | null;
  deliveredAt: Date | null;
  enderecoNome: string;
};

type CompanyCache = Record<number, string>;

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

const DAY_MS = 24 * 60 * 60 * 1000;
const FORGOTTEN_DAYS = 15;

const PERIOD_OPTIONS: Array<{ value: PeriodType; label: string }> = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' }
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

function sameDayIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function ReportsPage(): JSX.Element {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [companyCache, setCompanyCache] = useState<CompanyCache>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const statusChartRef = useRef<HTMLDivElement | null>(null);
  const evolutionChartRef = useRef<HTMLDivElement | null>(null);
  const startPickerRef = useRef<HTMLInputElement | null>(null);
  const endPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadData(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [encomendasResponse, enderecosResponse] = await Promise.all([
          backendApi.get<EncomendaListItem[]>('/encomendas'),
          backendApi.get<Endereco[]>('/enderecos')
        ]);

        const enderecoById = new Map<number, Endereco>();
        enderecosResponse.data.forEach((endereco) => enderecoById.set(endereco.id, endereco));

        const normalized = encomendasResponse.data.map((item) => {
          const enderecoLabel = item.endereco_label?.trim() || buildEnderecoLabel(enderecoById.get(item.endereco_id));
          return {
            ...item,
            receivedAt: parseDateTime(item.data_recebimento, item.hora_recebimento),
            deliveredAt: parseDateTime(item.data_entrega),
            enderecoNome: enderecoLabel
          };
        });

        setItems(normalized);
      } catch (err) {
        setError(readApiError(err));
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    if (period !== 'custom') return;
    setCustomStart('');
    setCustomEnd('');
  }, [period]);

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
  }, [customEnd, customStart, period]);

  const receivedWithinPeriod = useMemo(() => {
    if (!range.valid) return [] as AnalyticsItem[];
    return items.filter((item) => item.receivedAt && item.receivedAt >= range.start && item.receivedAt <= range.end);
  }, [items, range]);

  const deliveredWithinPeriod = useMemo(() => {
    if (!range.valid) return [] as AnalyticsItem[];
    return items.filter((item) => item.status === 'ENTREGUE' && item.deliveredAt && item.deliveredAt >= range.start && item.deliveredAt <= range.end);
  }, [items, range]);

  const recebidas = useMemo(() => {
    return receivedWithinPeriod.filter((item) => item.status === 'RECEBIDA');
  }, [receivedWithinPeriod]);

  const aguardando = useMemo(() => {
    return receivedWithinPeriod.filter((item) => item.status === 'RECEBIDA' || item.status === 'DISPONIVEL_RETIRADA');
  }, [receivedWithinPeriod]);

  const esquecidas = useMemo(() => {
    const limit = Date.now() - FORGOTTEN_DAYS * DAY_MS;
    return aguardando.filter((item) => item.receivedAt && item.receivedAt.getTime() < limit);
  }, [aguardando]);

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

  const detailedRows = useMemo(() => {
    const ids = new Set<number>();
    const rows: AnalyticsItem[] = [];
    [...aguardando, ...deliveredWithinPeriod].forEach((item) => {
      if (ids.has(item.id)) return;
      ids.add(item.id);
      rows.push(item);
    });
    return rows.sort((a, b) => (b.receivedAt?.getTime() ?? 0) - (a.receivedAt?.getTime() ?? 0));
  }, [aguardando, deliveredWithinPeriod]);

  async function ensureCompanies(ids: number[]): Promise<Record<number, string>> {
    const missing = ids.filter((id) => !companyCache[id]);
    if (missing.length === 0) return companyCache;

    const loadedEntries = await Promise.all(
      missing.map(async (id) => {
        try {
          const response = await backendApi.get<EncomendaDetail>(`/encomendas/${id}`);
          return [id, response.data.empresa_entregadora?.trim() || '-'] as const;
        } catch {
          return [id, '-'] as const;
        }
      })
    );

    const next: CompanyCache = { ...companyCache };
    loadedEntries.forEach(([id, company]) => {
      next[id] = company;
    });
    setCompanyCache(next);
    return next;
  }

  async function exportPdf(): Promise<void> {
    if (!range.valid || exporting) return;
    setExporting(true);
    try {
      const rows = detailedRows;
      const companies = await ensureCompanies(rows.map((item) => item.id));

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;

      const condoName = user?.nomeCondominio || 'Condomínio';
      const logoText = condoName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');

      doc.setFillColor(15, 37, 64);
      doc.circle(margin + 18, margin + 8, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(logoText || 'CJ', margin + 18, margin + 12, { align: 'center' });

      doc.setTextColor(15, 37, 64);
      doc.setFontSize(18);
      doc.text('CondoJET', margin + 46, margin + 2);
      doc.setFontSize(11);
      doc.text(`Relatório Gerencial - ${condoName}`, margin + 46, margin + 18);
      doc.text(`Período analisado: ${range.label}`, margin + 46, margin + 34);
      doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, margin + 46, margin + 50);
      doc.text(`Usuário: ${user?.nomeUsuario ?? 'Usuário'}`, margin + 46, margin + 66);

      let y = margin + 94;

      doc.setFontSize(13);
      doc.text('Resumo Executivo', margin, y);
      y += 12;

      const kpis = [
        `Total Recebidas: ${receivedWithinPeriod.length}`,
        `Entregues: ${deliveredWithinPeriod.length}`,
        `Aguardando Retirada: ${aguardando.length}`,
        `Encomendas Esquecidas: ${esquecidas.length}`
      ];

      doc.setFontSize(10);
      kpis.forEach((line, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        doc.text(line, margin + col * 250, y + row * 16);
      });
      y += 46;

      const chartBlocks: Array<{ title: string; ref: HTMLDivElement | null }> = [
        { title: 'Distribuição por Status', ref: statusChartRef.current },
        { title: 'Evolução no Período', ref: evolutionChartRef.current }
      ];

      doc.setFontSize(13);
      doc.text('Gráficos', margin, y);
      y += 12;

      for (const block of chartBlocks) {
        if (!block.ref) continue;
        const canvas = await html2canvas(block.ref, { backgroundColor: '#ffffff', scale: 2 });
        const imageData = canvas.toDataURL('image/png', 1.0);
        const renderWidth = pageWidth - margin * 2;
        const renderHeight = Math.min(180, (canvas.height * renderWidth) / canvas.width);

        if (y + 22 + renderHeight > pageHeight - margin - 130) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(11);
        doc.text(block.title, margin, y + 11);
        doc.addImage(imageData, 'PNG', margin, y + 16, renderWidth, renderHeight);
        y += renderHeight + 26;
      }

      if (y > pageHeight - 240) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(13);
      doc.text('Tabela Detalhada', margin, y);
      y += 8;

      const tableBody = rows.map((item) => {
        const daysWaiting = item.receivedAt
          ? Math.max(0, Math.ceil(((item.deliveredAt ?? new Date()).getTime() - item.receivedAt.getTime()) / DAY_MS))
          : 0;
        return [
          item.morador_nome || `Morador ${item.morador_id}`,
          item.enderecoNome,
          companies[item.id] || '-',
          formatDateBR(item.data_recebimento),
          formatDateBR(item.data_entrega),
          item.status,
          String(daysWaiting)
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Morador', 'Endereço', 'Empresa', 'Data recebimento', 'Data entrega', 'Status', 'Dias aguardando']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 37, 64] },
        margin: { left: margin, right: margin }
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
        doc.text('Gerado automaticamente pelo CondoJET', margin, pageHeight - 18);
      }

      doc.save(`relatorio-condojet-${Date.now()}.pdf`);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setExporting(false);
    }
  }

  const customStartIso = toIsoDate(customStart);
  const customEndIso = toIsoDate(customEnd);

  return (
    <section className="page-grid reports-mgr-page">
      <section className="panel reports-mgr-filters">
        <div className="reports-mgr-export-row">
          <p className="reports-mgr-export-title">Escolha o filtro de período</p>
          <button type="button" className="cta" onClick={() => void exportPdf()} disabled={!range.valid || exporting || loading}>
            {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
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
                  onChange={(event) => setCustomStart(normalizeBrDate(event.target.value))}
                  onFocus={() => {
                    if (startPickerRef.current?.showPicker) startPickerRef.current.showPicker();
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
                <input
                  ref={startPickerRef}
                  type="date"
                  className="reports-mgr-date-hidden"
                  value={customStartIso}
                  onChange={(event) => setCustomStart(fromIsoDate(event.target.value))}
                />
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
                  onChange={(event) => setCustomEnd(normalizeBrDate(event.target.value))}
                  onFocus={() => {
                    if (!customEnd && customStart) setCustomEnd(customStart);
                    if (endPickerRef.current?.showPicker) endPickerRef.current.showPicker();
                  }}
                />
                <button
                  type="button"
                  className="reports-mgr-date-trigger"
                  aria-label="Abrir calendário da data fim"
                  onClick={() => {
                    if (!customEnd && customStart) setCustomEnd(customStart);
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
                <input
                  ref={endPickerRef}
                  type="date"
                  className="reports-mgr-date-hidden"
                  value={customEndIso}
                  min={customStartIso || undefined}
                  onChange={(event) => {
                    const nextBr = fromIsoDate(event.target.value);
                    const start = parseBrDate(customStart);
                    const end = parseBrDate(nextBr);
                    if (start && end && end.getTime() < start.getTime()) {
                      setCustomEnd(nextBr);
                      return;
                    }
                    setCustomEnd(nextBr);
                  }}
                />
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
            <article className="panel reports-mgr-kpi reports-mgr-kpi-alert" title="Encomendas com mais de 15 dias aguardando retirada.">
              <span>Encomendas Esquecidas</span>
              <strong>{esquecidas.length}</strong>
              <small>Encomendas com mais de 15 dias aguardando retirada.</small>
            </article>
          </section>

          <section className="reports-mgr-charts-grid">
            <article className="panel reports-mgr-chart-card">
              <h2>Distribuição por Status</h2>
              <div ref={statusChartRef} className="reports-mgr-chart-wrap">
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
              <div ref={evolutionChartRef} className="reports-mgr-chart-wrap">
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
    </section>
  );
}
