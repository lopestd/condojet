import { useEffect, useMemo, useState } from 'react';

import { backendApi, readApiError } from '../../services/httpClient';
import { parseApiDate } from '../../utils/dateTime';
import { EncomendaDetailsTimeline } from '../encomendas/components/EncomendaDetailsTimeline';
import { statusLabel } from '../encomendas/utils/statusMapping';
import type { EncomendaDetail } from '../encomendas/types';

type MinhaEncomenda = {
  id: number;
  codigo_interno: string;
  status: string;
  tipo: string;
  codigo_externo?: string | null;
  empresa_entregadora?: string | null;
  empresa_responsavel?: string | null;
  data_recebimento?: string | null;
  data_entrada?: string | null;
  data_entrega?: string | null;
  data_retirada?: string | null;
  retirado_por_nome?: string | null;
  retirado_por?: string | null;
};

type ResidentStatusFilter = 'ALL' | 'AGUARDANDO_RETIRADA' | 'ENTREGUE';

const MOBILE_BREAKPOINT = 900;

function normalizeResidentStatus(status: string): 'AGUARDANDO RETIRADA' | 'ENTREGUE' {
  return status === 'ENTREGUE' ? 'ENTREGUE' : 'AGUARDANDO RETIRADA';
}

function normalizeResidentStatusKey(status: string): 'AGUARDANDO_RETIRADA' | 'ENTREGUE' {
  return status === 'ENTREGUE' ? 'ENTREGUE' : 'AGUARDANDO_RETIRADA';
}

function statusClassName(status: string): string {
  return status === 'ENTREGUE' ? 'entregue' : 'disponivel';
}

function formatDateTimeBR(value?: string | null): string {
  if (!value) return '-';
  const parsed = parseApiDate(value);
  if (!parsed) return '-';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} - ${hh}:${min}`;
}

function resolveEntrada(item: MinhaEncomenda): string | null {
  return item.data_recebimento ?? item.data_entrada ?? null;
}

function resolveRetirada(item: MinhaEncomenda): string | null {
  return item.data_entrega ?? item.data_retirada ?? null;
}

function resolveEmpresa(item: MinhaEncomenda): string {
  return (item.empresa_entregadora ?? item.empresa_responsavel ?? '').trim() || '-';
}

function resolveCodigoRastreio(item: MinhaEncomenda): string {
  return (item.codigo_externo ?? '').trim() || '-';
}

function resolveRetiradoPor(item: MinhaEncomenda): string {
  return (item.retirado_por_nome ?? item.retirado_por ?? '').trim() || '-';
}

export function ResidentPage(): JSX.Element {
  const [items, setItems] = useState<MinhaEncomenda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResidentStatusFilter>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));

  const [showViewModal, setShowViewModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<EncomendaDetail | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<MinhaEncomenda[]>('/minhas-encomendas');
      setItems(data);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(encomendaId: number): Promise<EncomendaDetail | null> {
    setDetailLoading(true);
    setError(null);
    try {
      const { data } = await backendApi.get<EncomendaDetail>(`/minhas-encomendas/${encomendaId}`);
      setDetail(data);
      return data;
    } catch (err) {
      setError(readApiError(err));
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  async function openViewModal(encomendaId: number): Promise<void> {
    const loaded = await loadDetail(encomendaId);
    if (!loaded) return;
    setShowViewModal(true);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchTerm(rawSearchTerm.trim().toLowerCase()), 250);
    return () => window.clearTimeout(handle);
  }, [rawSearchTerm]);

  useEffect(() => {
    function onResize(): void {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobileView = viewportWidth < MOBILE_BREAKPOINT;

  const filteredItems = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return items
      .filter((item) => {
        const residentStatus = normalizeResidentStatusKey(item.status);
        if (statusFilter !== 'ALL' && residentStatus !== statusFilter) return false;

        if (searchTerm) {
          const haystack = `${item.tipo} ${resolveCodigoRastreio(item)} ${resolveEmpresa(item)}`.toLowerCase();
          if (!haystack.includes(searchTerm)) return false;
        }

        if (start || end) {
          const entrada = parseApiDate(resolveEntrada(item));
          if (!entrada) return false;
          if (start && entrada < start) return false;
          if (end && entrada > end) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = parseApiDate(resolveEntrada(a))?.getTime() ?? 0;
        const bDate = parseApiDate(resolveEntrada(b))?.getTime() ?? 0;
        if (aDate !== bDate) return bDate - aDate;
        return b.id - a.id;
      });
  }, [endDate, items, searchTerm, startDate, statusFilter]);

  return (
    <section className="page-grid resident-page resident-encomendas-page">
      <header className="page-header">
        <h1>Acompanhamento</h1>
      </header>

      {error ? <p className="error-box">{error}</p> : null}
      {loading ? <p className="info-box">Carregando...</p> : null}

      <article className="card encomendas-controls resident-encomendas-controls" aria-label="Filtros de encomendas do morador">
        <div className="encomendas-chip-filters resident-status-filters" role="group" aria-label="Filtro por status">
          <button
            type="button"
            className={`chip-filter ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`chip-filter ${statusFilter === 'AGUARDANDO_RETIRADA' ? 'active' : ''}`}
            onClick={() => setStatusFilter('AGUARDANDO_RETIRADA')}
          >
            Aguardando Retirada
          </button>
          <button
            type="button"
            className={`chip-filter ${statusFilter === 'ENTREGUE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ENTREGUE')}
          >
            Entregue
          </button>
        </div>

        <label className="encomendas-search-wrap resident-search-filter">
          Buscar
          <input
            value={rawSearchTerm}
            onChange={(event) => setRawSearchTerm(event.target.value)}
            placeholder="Código de rastreio ou empresa"
          />
        </label>

        <div className="resident-date-filters-grid">
          <label className="resident-date-filter">
            Entrada inicial
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="resident-date-filter">
            Entrada final
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>

        <div className="resident-filter-actions">
          <button
            type="button"
            className="button-soft"
            onClick={() => {
              setRawSearchTerm('');
              setStatusFilter('ALL');
              setStartDate('');
              setEndDate('');
            }}
          >
            Limpar filtros
          </button>
        </div>
      </article>

      <article className="card section-card">
        {!loading && filteredItems.length === 0 ? (
          <div className="encomendas-empty">
            <h3>Nenhuma encomenda encontrada</h3>
            <p>Ajuste os filtros para localizar suas encomendas.</p>
          </div>
        ) : null}

        {loading ? (
          <div className="encomendas-skeleton-grid" aria-hidden="true">
            <div className="encomendas-skeleton-card" />
            <div className="encomendas-skeleton-card" />
            <div className="encomendas-skeleton-card" />
          </div>
        ) : null}

        {!loading && filteredItems.length > 0 && !isMobileView ? (
          <div className="table-wrap">
            <table className="operation-table resident-encomendas-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Código de Rastreio</th>
                  <th>Empresa Responsável</th>
                  <th>Data de Entrada</th>
                  <th>Status</th>
                  <th>Data de Retirada</th>
                  <th>Retirado por</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="row-openable" onClick={() => void openViewModal(item.id)}>
                    <td>{item.tipo}</td>
                    <td>
                      <span className="rastreio-pill">{resolveCodigoRastreio(item)}</span>
                    </td>
                    <td>{resolveEmpresa(item)}</td>
                    <td>{formatDateTimeBR(resolveEntrada(item))}</td>
                    <td>
                      <span className={`status-badge ${statusClassName(item.status)}`}>{normalizeResidentStatus(item.status)}</span>
                    </td>
                    <td>{formatDateTimeBR(resolveRetirada(item))}</td>
                    <td>{resolveRetiradoPor(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && filteredItems.length > 0 && isMobileView ? (
          <section className="encomendas-cards-grid resident-encomendas-cards">
            {filteredItems.map((item) => (
              <article key={item.id} className="encomenda-card resident-encomenda-card row-openable" onClick={() => void openViewModal(item.id)}>
                <div className="encomenda-card-head">
                  <p className="encomenda-code">{item.tipo}</p>
                  <span className={`status-badge ${statusClassName(item.status)}`}>{normalizeResidentStatus(item.status)}</span>
                </div>
                <dl className="encomenda-card-data">
                  <div>
                    <dt>Código de Rastreio</dt>
                    <dd>{resolveCodigoRastreio(item)}</dd>
                  </div>
                  <div>
                    <dt>Empresa Responsável</dt>
                    <dd>{resolveEmpresa(item)}</dd>
                  </div>
                  <div>
                    <dt>Data de Entrada</dt>
                    <dd>{formatDateTimeBR(resolveEntrada(item))}</dd>
                  </div>
                  <div>
                    <dt>Data de Retirada</dt>
                    <dd>{formatDateTimeBR(resolveRetirada(item))}</dd>
                  </div>
                  <div>
                    <dt>Retirado por</dt>
                    <dd>{resolveRetiradoPor(item)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        ) : null}
      </article>

      {showViewModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card morador-modal encomenda-detalhe-modal">
            <h3>Detalhes da encomenda</h3>
            {detailLoading ? <p className="info-box">Carregando detalhes...</p> : null}
            {detail ? (
              <div className="detail-content">
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Código de Rastreio</span>
                    <strong>{detail.codigo_externo || '-'}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Status</span>
                    <strong>{statusLabel(detail.status)}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Tipo</span>
                    <strong>{detail.tipo}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Morador</span>
                    <strong>{detail.morador_nome ?? `Morador #${detail.morador_id}`}</strong>
                  </div>
                </div>

                <div className="encomenda-detalhe-grid">
                  <div className="modal-data operation-modal-data">
                    <p><strong>Empresa responsável:</strong> {detail.empresa_entregadora || '-'}</p>
                    <p><strong>Descrição:</strong> {detail.descricao || '-'}</p>
                    <p><strong>Data de entrada:</strong> {detail.data_recebimento || '-'} {detail.hora_recebimento || ''}</p>
                    <p><strong>Data de entrega:</strong> {detail.data_entrega || '-'}</p>
                    <p><strong>Retirado por:</strong> {detail.retirado_por_nome || '-'}</p>
                    <p><strong>Motivo de reabertura:</strong> {detail.motivo_reabertura || '-'}</p>
                  </div>
                  <section className="encomenda-timeline-panel">
                    <h4>Linha do tempo</h4>
                    <EncomendaDetailsTimeline detail={detail} />
                  </section>
                </div>
              </div>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="button-soft" onClick={() => setShowViewModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
