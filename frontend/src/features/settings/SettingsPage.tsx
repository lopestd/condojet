import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { backendApi, readApiError } from '../../services/httpClient';
import { SettingsSectionCard } from './components/SettingsSectionCard';

const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Fortaleza',
  'America/Belem'
];
const DEFAULT_FORGOTTEN_DAYS = 15;

type ConfiguracoesResponse = {
  timezone: string;
  prazo_dias_encomenda_esquecida: number;
};

type EnderecamentoParametros = {
  predio_rotulo_bloco: string;
  predio_rotulo_andar: string;
  predio_rotulo_apartamento: string;
  horizontal_rotulo_tipo: string;
  horizontal_rotulo_subtipo: string;
  horizontal_rotulo_numero: string;
  horizontal_hint_tipo: string;
  horizontal_hint_subtipo: string;
  horizontal_tipos_permitidos_ids: number[];
  horizontal_subtipos_permitidos_ids: number[];
  horizontal_tipos_permitidos_nomes: string[];
  horizontal_subtipos_permitidos_nomes: string[];
};

type CondominioConfiguracaoResponse = {
  condominio_id: number;
  nome_condominio: string;
  tipo_condominio_id: number | null;
  tipo_condominio_nome: string | null;
  tipo_condominio_slug: 'HORIZONTAL' | 'PREDIO_CONJUNTO' | null;
  parametros_enderecamento: EnderecamentoParametros;
};

type TipoCondominio = {
  id: number;
  nome: string;
  slug: 'HORIZONTAL' | 'PREDIO_CONJUNTO';
};

type TipoLogradouroHorizontal = { id: number; nome: string };
type SubtipoLogradouroHorizontal = { id: number; nome: string; tipo_logradouro_horizontal_id: number };

type EnderecosReferenciasResponse = {
  tipos_condominio: TipoCondominio[];
  tipos_logradouro_horizontal: TipoLogradouroHorizontal[];
  subtipos_logradouro_horizontal: SubtipoLogradouroHorizontal[];
};

const DEFAULT_PARAMETROS: EnderecamentoParametros = {
  predio_rotulo_bloco: 'Bloco',
  predio_rotulo_andar: 'Andar',
  predio_rotulo_apartamento: 'Apartamento',
  horizontal_rotulo_tipo: 'Tipo',
  horizontal_rotulo_subtipo: 'Subtipo',
  horizontal_rotulo_numero: 'Numero',
  horizontal_hint_tipo: 'Trecho, Quadra, Etapa ou Area',
  horizontal_hint_subtipo: 'Conjunto, Chacara, Quadra ou Area Especial',
  horizontal_tipos_permitidos_ids: [],
  horizontal_subtipos_permitidos_ids: [],
  horizontal_tipos_permitidos_nomes: [],
  horizontal_subtipos_permitidos_nomes: []
};

function enderecoPadraoLabel(
  tipoCondominioSlug: CondominioConfiguracaoResponse['tipo_condominio_slug'],
  parametros: EnderecamentoParametros
): string {
  if (tipoCondominioSlug === 'PREDIO_CONJUNTO') {
    return `${parametros.predio_rotulo_bloco} / ${parametros.predio_rotulo_andar} / ${parametros.predio_rotulo_apartamento}`;
  }
  if (tipoCondominioSlug === 'HORIZONTAL') {
    return `${parametros.horizontal_rotulo_tipo || 'Tipo'} / ${parametros.horizontal_rotulo_subtipo || 'Subtipo'} / ${parametros.horizontal_rotulo_numero || 'Numero'}`;
  }
  return 'Defina o tipo de condomínio para habilitar o padrão';
}

function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function toModalParametros(parametros: EnderecamentoParametros): EnderecamentoParametros {
  return {
    ...parametros,
    horizontal_rotulo_tipo:
      parametros.horizontal_rotulo_tipo === DEFAULT_PARAMETROS.horizontal_rotulo_tipo ? '' : parametros.horizontal_rotulo_tipo,
    horizontal_rotulo_subtipo:
      parametros.horizontal_rotulo_subtipo === DEFAULT_PARAMETROS.horizontal_rotulo_subtipo ? '' : parametros.horizontal_rotulo_subtipo,
    horizontal_rotulo_numero: parametros.horizontal_rotulo_numero || DEFAULT_PARAMETROS.horizontal_rotulo_numero
  };
}

function toPayloadParametros(parametros: EnderecamentoParametros): EnderecamentoParametros {
  return {
    ...parametros,
    horizontal_rotulo_tipo: parametros.horizontal_rotulo_tipo.trim() || DEFAULT_PARAMETROS.horizontal_rotulo_tipo,
    horizontal_rotulo_subtipo: parametros.horizontal_rotulo_subtipo.trim() || DEFAULT_PARAMETROS.horizontal_rotulo_subtipo,
    horizontal_rotulo_numero: parametros.horizontal_rotulo_numero.trim() || DEFAULT_PARAMETROS.horizontal_rotulo_numero,
    horizontal_tipos_permitidos_ids: [
      ...new Set((parametros.horizontal_tipos_permitidos_ids ?? []).map((item) => Number(item)).filter((item) => item > 0))
    ],
    horizontal_subtipos_permitidos_ids: [
      ...new Set((parametros.horizontal_subtipos_permitidos_ids ?? []).map((item) => Number(item)).filter((item) => item > 0))
    ],
    horizontal_tipos_permitidos_nomes: [
      ...new Set((parametros.horizontal_tipos_permitidos_nomes ?? []).map((item) => String(item).trim()).filter(Boolean))
    ],
    horizontal_subtipos_permitidos_nomes: [
      ...new Set((parametros.horizontal_subtipos_permitidos_nomes ?? []).map((item) => String(item).trim()).filter(Boolean))
    ]
  };
}

export function SettingsPage(): JSX.Element {
  const { user, updateTimezone } = useAuth();
  const canViewCondoSettings = (user?.role === 'ADMIN' || user?.role === 'PORTEIRO') && Boolean(user?.condominioId);
  const canEditCondoSettings = user?.role === 'ADMIN' && Boolean(user?.condominioId);
  const canEditTimezone = canEditCondoSettings;

  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [modalTimezone, setModalTimezone] = useState(user?.timezone ?? 'America/Sao_Paulo');
  const [prazoEsquecida, setPrazoEsquecida] = useState<number>(DEFAULT_FORGOTTEN_DAYS);
  const [modalPrazoEsquecida, setModalPrazoEsquecida] = useState<number>(DEFAULT_FORGOTTEN_DAYS);

  const [nomeCondominio, setNomeCondominio] = useState<string>('');
  const [tipoCondominioId, setTipoCondominioId] = useState<number | null>(null);
  const [tipoCondominioNome, setTipoCondominioNome] = useState<string | null>(null);
  const [tipoCondominioSlug, setTipoCondominioSlug] = useState<CondominioConfiguracaoResponse['tipo_condominio_slug']>(null);
  const [parametrosEnderecamento, setParametrosEnderecamento] = useState<EnderecamentoParametros>(DEFAULT_PARAMETROS);

  const [tiposCondominio, setTiposCondominio] = useState<TipoCondominio[]>([]);
  const [tiposLogradouroHorizontal, setTiposLogradouroHorizontal] = useState<TipoLogradouroHorizontal[]>([]);
  const [subtiposLogradouroHorizontal, setSubtiposLogradouroHorizontal] = useState<SubtipoLogradouroHorizontal[]>([]);

  const [modalNomeCondominio, setModalNomeCondominio] = useState<string>('');
  const [modalTipoCondominioId, setModalTipoCondominioId] = useState<number | null>(null);
  const [modalParametros, setModalParametros] = useState<EnderecamentoParametros>(DEFAULT_PARAMETROS);
  const [numeroEditavel, setNumeroEditavel] = useState(false);

  const [tiposCustomizados, setTiposCustomizados] = useState<string[]>([]);
  const [subtiposCustomizados, setSubtiposCustomizados] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [novoSubtipo, setNovoSubtipo] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackModule, setFeedbackModule] = useState<
    'timezone' | 'esquecida' | 'definicao_enderecamento' | null
  >(null);
  const [erro, setErro] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'timezone' | 'esquecida' | 'definicao_enderecamento' | 'notificacoes' | 'integracoes' | null>(
    null
  );
  const numeroInputRef = useRef<HTMLInputElement | null>(null);

  const timezoneOptions = useMemo(() => {
    const normalized = String(timezone ?? '').trim();
    if (!normalized || TIMEZONE_OPTIONS.includes(normalized)) {
      return TIMEZONE_OPTIONS;
    }
    return [normalized, ...TIMEZONE_OPTIONS];
  }, [timezone]);

  const modalTipoCondominioSlug = useMemo(() => {
    const selected = tiposCondominio.find((item) => item.id === modalTipoCondominioId);
    return selected?.slug ?? null;
  }, [modalTipoCondominioId, tiposCondominio]);

  useEffect(() => {
    async function loadConfiguracoes(): Promise<void> {
      if (!canViewCondoSettings) return;
      setCarregando(true);
      setErro(null);
      try {
        const [configuracoesResult, condominioResult, referenciasResult] = await Promise.all([
          backendApi.get<ConfiguracoesResponse>('/configuracoes'),
          backendApi.get<CondominioConfiguracaoResponse>('/configuracoes/condominio'),
          backendApi.get<EnderecosReferenciasResponse>('/configuracoes/enderecos/referencias')
        ]);

        const configuracoes = configuracoesResult.data;
        setTimezone(configuracoes.timezone);
        setModalTimezone(configuracoes.timezone);
        setPrazoEsquecida(configuracoes.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
        setModalPrazoEsquecida(configuracoes.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
        updateTimezone(configuracoes.timezone);

        const referencias = referenciasResult.data;
        const condominio = condominioResult.data;
        const parametros = condominio.parametros_enderecamento ?? DEFAULT_PARAMETROS;

        setTiposCondominio(referencias.tipos_condominio ?? []);
        setTiposLogradouroHorizontal(referencias.tipos_logradouro_horizontal ?? []);
        setSubtiposLogradouroHorizontal(referencias.subtipos_logradouro_horizontal ?? []);

        setNomeCondominio(condominio.nome_condominio);
        setTipoCondominioId(condominio.tipo_condominio_id);
        setTipoCondominioNome(condominio.tipo_condominio_nome);
        setTipoCondominioSlug(condominio.tipo_condominio_slug);
        setParametrosEnderecamento(parametros);

        setModalNomeCondominio(condominio.nome_condominio);
        setModalTipoCondominioId(condominio.tipo_condominio_id);
        setModalParametros(toModalParametros(parametros));

        setTiposCustomizados(
          (parametros.horizontal_tipos_permitidos_ids ?? [])
            .map((id) => (referencias.tipos_logradouro_horizontal ?? []).find((item) => item.id === id)?.nome)
            .filter((nome): nome is string => Boolean(nome))
        );
        setSubtiposCustomizados(
          (parametros.horizontal_subtipos_permitidos_ids ?? [])
            .map((id) => (referencias.subtipos_logradouro_horizontal ?? []).find((item) => item.id === id)?.nome)
            .filter((nome): nome is string => Boolean(nome))
        );
      } catch (err) {
        setErro(readApiError(err));
      } finally {
        setCarregando(false);
      }
    }
    void loadConfiguracoes();
  }, [canViewCondoSettings, updateTimezone]);

  function openTimezoneModal(): void {
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    setModalTimezone(timezone);
    setActiveModal('timezone');
  }

  function openPrazoModal(): void {
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    setModalPrazoEsquecida(prazoEsquecida);
    setActiveModal('esquecida');
  }

  function openDefinicaoEnderecamentoModal(): void {
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    setModalNomeCondominio(nomeCondominio);
    setModalTipoCondominioId(tipoCondominioId);
    setModalParametros(toModalParametros(parametrosEnderecamento));
    setNumeroEditavel(false);
    setNovoTipo('');
    setNovoSubtipo('');

    const tipos = (parametrosEnderecamento.horizontal_tipos_permitidos_ids ?? [])
      .map((id) => tiposLogradouroHorizontal.find((item) => item.id === id)?.nome)
      .filter((nome): nome is string => Boolean(nome));
    const subtipos = (parametrosEnderecamento.horizontal_subtipos_permitidos_ids ?? [])
      .map((id) => subtiposLogradouroHorizontal.find((item) => item.id === id)?.nome)
      .filter((nome): nome is string => Boolean(nome));
    setTiposCustomizados(tipos);
    setSubtiposCustomizados(subtipos);

    setActiveModal('definicao_enderecamento');
  }

  function onAddTipo(): void {
    const value = novoTipo.trim();
    if (!value) return;
    if (!tiposCustomizados.some((item) => normalizeText(item) === normalizeText(value))) {
      setTiposCustomizados((current) => [...current, value]);
    }
    setNovoTipo('');
  }

  function onAddSubtipo(): void {
    const value = novoSubtipo.trim();
    if (!value) return;
    if (!subtiposCustomizados.some((item) => normalizeText(item) === normalizeText(value))) {
      setSubtiposCustomizados((current) => [...current, value]);
    }
    setNovoSubtipo('');
  }

  function onRemoveTipo(value: string): void {
    setTiposCustomizados((current) => current.filter((item) => normalizeText(item) !== normalizeText(value)));
  }

  function onRemoveSubtipo(value: string): void {
    setSubtiposCustomizados((current) => current.filter((item) => normalizeText(item) !== normalizeText(value)));
  }

  async function onSaveTimezone(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    try {
      if (!canEditTimezone) {
        setErro('Configuração de timezone disponível apenas para administradores de condomínio.');
        return;
      }
      const { data } = await backendApi.put<ConfiguracoesResponse>('/configuracoes', { timezone: modalTimezone });
      setTimezone(data.timezone);
      setModalTimezone(data.timezone);
      setPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      setModalPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      updateTimezone(data.timezone);
      setFeedback('Configurações salvas com sucesso.');
      setFeedbackModule('timezone');
      setActiveModal(null);
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  async function onSavePrazoEsquecida(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    try {
      if (!canEditTimezone) {
        setErro('Configuração de prazo disponível apenas para administradores de condomínio.');
        return;
      }
      const prazoNormalizado = Number.isFinite(modalPrazoEsquecida) ? Math.floor(modalPrazoEsquecida) : DEFAULT_FORGOTTEN_DAYS;
      const { data } = await backendApi.put<ConfiguracoesResponse>('/configuracoes', {
        prazo_dias_encomenda_esquecida: Math.max(1, prazoNormalizado)
      });
      setPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      setModalPrazoEsquecida(data.prazo_dias_encomenda_esquecida ?? DEFAULT_FORGOTTEN_DAYS);
      setTimezone(data.timezone);
      setModalTimezone(data.timezone);
      updateTimezone(data.timezone);
      setFeedback('Configurações salvas com sucesso.');
      setFeedbackModule('esquecida');
      setActiveModal(null);
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  async function onSaveDefinicaoEnderecamento(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setFeedback(null);
    setFeedbackModule(null);
    try {
      if (!canEditCondoSettings) {
        setErro('Definição de endereçamento disponível apenas para administradores de condomínio.');
        return;
      }
      if (!modalTipoCondominioId) {
        setErro('Selecione o tipo de condomínio.');
        return;
      }

      if (tiposCustomizados.length === 0) {
        setErro('Cadastre ao menos um Tipo válido para o condomínio.');
        return;
      }
      if (subtiposCustomizados.length === 0) {
        setErro('Cadastre ao menos um Subtipo válido para o condomínio.');
        return;
      }

      const payload: Record<string, unknown> = {
        nome_condominio: modalNomeCondominio,
        tipo_condominio_id: modalTipoCondominioId,
        parametros_enderecamento: toPayloadParametros({
          ...modalParametros,
          horizontal_tipos_permitidos_ids: [],
          horizontal_subtipos_permitidos_ids: [],
          horizontal_tipos_permitidos_nomes: tiposCustomizados,
          horizontal_subtipos_permitidos_nomes: subtiposCustomizados
        })
      };

      const { data } = await backendApi.put<CondominioConfiguracaoResponse>('/configuracoes/condominio', payload);
      const referenciasAtualizadas = await backendApi.get<EnderecosReferenciasResponse>('/configuracoes/enderecos/referencias');
      setNomeCondominio(data.nome_condominio);
      setTipoCondominioId(data.tipo_condominio_id);
      setTipoCondominioNome(data.tipo_condominio_nome);
      setTipoCondominioSlug(data.tipo_condominio_slug);
      setModalNomeCondominio(data.nome_condominio);
      setModalTipoCondominioId(data.tipo_condominio_id);
      setParametrosEnderecamento(data.parametros_enderecamento ?? DEFAULT_PARAMETROS);
      setModalParametros(toModalParametros(data.parametros_enderecamento ?? DEFAULT_PARAMETROS));
      setTiposLogradouroHorizontal(referenciasAtualizadas.data.tipos_logradouro_horizontal ?? []);
      setSubtiposLogradouroHorizontal(referenciasAtualizadas.data.subtipos_logradouro_horizontal ?? []);
      setFeedback('Definição de endereçamento salva com sucesso.');
      setFeedbackModule('definicao_enderecamento');
      setActiveModal(null);
    } catch (err) {
      setErro(readApiError(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="page-grid settings-page">
      <header className="page-header">
        <h1>Preferências da operação</h1>
        <p>Parâmetros operacionais organizados por módulos de configuração.</p>
      </header>

      <section className="settings-cards-grid" aria-label="Módulos de configuração">
        <SettingsSectionCard
          title="Configuração de Timezone"
          description="Define o fuso horário oficial utilizado pelos registros de data e hora do condomínio."
          items={[
            { label: 'Timezone atual', value: timezone },
            { label: 'Status', value: 'Configuração ativa' },
            { label: 'Aplicação', value: 'Registros e consultas de data/hora' }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedbackModule === 'timezone' ? feedback : null}
          infoMessage={canEditTimezone ? null : 'Timezone configurado por condomínio. Somente administrador do condomínio pode alterar.'}
          onOpen={openTimezoneModal}
        />

        <SettingsSectionCard
          title="Prazo para Encomendas Esquecidas"
          description="Define em quantos dias uma encomenda pendente deve ser classificada como esquecida."
          items={[
            { label: 'Prazo atual', value: `${prazoEsquecida} dias` },
            { label: 'Status', value: 'Configuração ativa' },
            { label: 'Aplicação', value: 'Telas de Encomendas e Relatórios' }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedbackModule === 'esquecida' ? feedback : null}
          infoMessage={canEditTimezone ? null : 'Somente administrador do condomínio pode alterar esse prazo.'}
          onOpen={openPrazoModal}
        />

        <SettingsSectionCard
          title="Definição de Endereçamento"
          description="Padroniza os parâmetros de endereço dos moradores conforme o tipo de condomínio."
          items={[
            { label: 'Condomínio', value: nomeCondominio || 'Não definido' },
            { label: 'Tipo de condomínio', value: tipoCondominioNome || 'Não definido' },
            { label: 'Padrão aplicado', value: enderecoPadraoLabel(tipoCondominioSlug, parametrosEnderecamento) }
          ]}
          loading={carregando}
          error={erro}
          feedback={feedbackModule === 'definicao_enderecamento' ? feedback : null}
          infoMessage={canEditCondoSettings ? null : 'Somente leitura para este perfil.'}
          onOpen={openDefinicaoEnderecamentoModal}
        />

        <SettingsSectionCard
          title="Notificações e Alertas"
          description="Módulo reservado para parâmetros de canais, janelas de envio e regras de notificação."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrização' },
            { label: 'Visualização', value: 'Somente leitura no card' },
            { label: 'Edição', value: 'Via modal' }
          ]}
          infoMessage="Template: seguir o padrão do módulo de Timezone para novos itens."
          onOpen={() => setActiveModal('notificacoes')}
        />

        <SettingsSectionCard
          title="Integrações Operacionais"
          description="Módulo reservado para tokens, credenciais e políticas de integração com serviços externos."
          items={[
            { label: 'Status', value: 'Estrutura pronta para parametrização' },
            { label: 'Visualização', value: 'Somente leitura no card' },
            { label: 'Edição', value: 'Via modal' }
          ]}
          infoMessage="Template: campos, validação e ação de salvar por módulo independente."
          onOpen={() => setActiveModal('integracoes')}
        />
      </section>

      {activeModal === 'timezone' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Configuração de Timezone</h3>
            <p className="modal-intro">Atualize o fuso horário oficial utilizado pelo condomínio.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSaveTimezone(event)}>
              <label>
                Nome da instância
                <input value="CondoJET Operação" disabled />
              </label>
              <label>
                Timezone
                <select
                  value={modalTimezone}
                  onChange={(event) => setModalTimezone(event.target.value)}
                  disabled={!canEditTimezone || carregando || salvando}
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-option">
                <input type="checkbox" defaultChecked disabled />
                Receber alertas de encomenda em atraso
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canEditTimezone || salvando || carregando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'esquecida' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Prazo de Encomendas Esquecidas</h3>
            <p className="modal-intro">Defina o número de dias para classificar encomendas pendentes como esquecidas.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSavePrazoEsquecida(event)}>
              <label>
                Prazo em dias
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={modalPrazoEsquecida}
                  onChange={(event) => setModalPrazoEsquecida(Number(event.target.value))}
                  disabled={!canEditTimezone || carregando || salvando}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canEditTimezone || salvando || carregando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'definicao_enderecamento' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Definição de Endereçamento</h3>
            <p className="modal-intro">Configure o nome do condomínio e os nomes dos campos de endereço.</p>
            {erro ? <p className="error-box">{erro}</p> : null}
            <form className="form-grid" onSubmit={(event) => void onSaveDefinicaoEnderecamento(event)}>
              <label>
                Nome do condomínio
                <input
                  value={modalNomeCondominio}
                  onChange={(event) => setModalNomeCondominio(event.target.value)}
                  disabled={!canEditCondoSettings || carregando || salvando}
                />
              </label>
              <label>
                Tipo de condomínio
                <select
                  value={modalTipoCondominioId ?? ''}
                  onChange={(event) => setModalTipoCondominioId(event.target.value ? Number(event.target.value) : null)}
                  disabled={!canEditCondoSettings || carregando || salvando}
                >
                  <option value="">Selecione...</option>
                  {tiposCondominio.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </label>

              {modalTipoCondominioSlug === 'PREDIO_CONJUNTO' ? (
                <>
                  <label>
                    Rótulo do campo 1
                    <input
                      value={modalParametros.predio_rotulo_bloco}
                      onChange={(event) =>
                        setModalParametros((previous) => ({ ...previous, predio_rotulo_bloco: event.target.value }))
                      }
                      disabled={!canEditCondoSettings || carregando || salvando}
                    />
                  </label>
                  <label>
                    Rótulo do campo 2
                    <input
                      value={modalParametros.predio_rotulo_andar}
                      onChange={(event) =>
                        setModalParametros((previous) => ({ ...previous, predio_rotulo_andar: event.target.value }))
                      }
                      disabled={!canEditCondoSettings || carregando || salvando}
                    />
                  </label>
                  <label>
                    Rótulo do campo 3
                    <input
                      value={modalParametros.predio_rotulo_apartamento}
                      onChange={(event) =>
                        setModalParametros((previous) => ({ ...previous, predio_rotulo_apartamento: event.target.value }))
                      }
                      disabled={!canEditCondoSettings || carregando || salvando}
                    />
                  </label>
                </>
              ) : null}

              {modalTipoCondominioSlug === 'HORIZONTAL' ? (
                <>
                  <label>
                    Defina o TIPO
                    <div className="input-action-wrap">
                      <input
                        value={novoTipo}
                        onChange={(event) => setNovoTipo(event.target.value)}
                        placeholder="Exemplo: Quadra, Trecho, Etapa ou Área"
                        disabled={!canEditCondoSettings || carregando || salvando}
                        className="has-inline-action"
                      />
                      <button
                        type="button"
                        className="input-inline-action"
                        onClick={onAddTipo}
                        disabled={!canEditCondoSettings || carregando || salvando || !novoTipo.trim()}
                      >
                        Cadastrar
                      </button>
                    </div>
                  </label>
                  {tiposCustomizados.length > 0 ? (
                    <div className="chips-block">
                      <span className="chips-title">Tipos cadastrados</span>
                      <div className="chips-list" role="list" aria-label="Tipos cadastrados">
                        {tiposCustomizados.map((item, index) => (
                          <button
                            key={`tipo-cadastrado-${index}`}
                            type="button"
                            className="value-chip"
                            onClick={() => onRemoveTipo(item)}
                            disabled={!canEditCondoSettings || carregando || salvando}
                            title={`Remover tipo ${item}`}
                            aria-label={`Remover tipo ${item}`}
                          >
                            <span>{item}</span>
                            <span className="chip-remove">x</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label>
                    Defina o SUBTIPO
                    <div className="input-action-wrap">
                      <input
                        value={novoSubtipo}
                        onChange={(event) => setNovoSubtipo(event.target.value)}
                        placeholder="Exemplo: Conjunto, Chácara, Quadra ou Área Especial"
                        disabled={!canEditCondoSettings || carregando || salvando}
                        className="has-inline-action"
                      />
                      <button
                        type="button"
                        className="input-inline-action"
                        onClick={onAddSubtipo}
                        disabled={!canEditCondoSettings || carregando || salvando || !novoSubtipo.trim()}
                      >
                        Cadastrar
                      </button>
                    </div>
                  </label>
                  {subtiposCustomizados.length > 0 ? (
                    <div className="chips-block">
                      <span className="chips-title">Subtipos cadastrados</span>
                      <div className="chips-list" role="list" aria-label="Subtipos cadastrados">
                        {subtiposCustomizados.map((item, index) => (
                          <button
                            key={`subtipo-cadastrado-${index}`}
                            type="button"
                            className="value-chip"
                            onClick={() => onRemoveSubtipo(item)}
                            disabled={!canEditCondoSettings || carregando || salvando}
                            title={`Remover subtipo ${item}`}
                            aria-label={`Remover subtipo ${item}`}
                          >
                            <span>{item}</span>
                            <span className="chip-remove">x</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label>
                    Número
                    <div className="input-action-wrap">
                      <input
                        ref={numeroInputRef}
                        value={modalParametros.horizontal_rotulo_numero}
                        onChange={(event) =>
                          setModalParametros((previous) => ({ ...previous, horizontal_rotulo_numero: event.target.value }))
                        }
                        disabled={!canEditCondoSettings || carregando || salvando}
                        readOnly={!numeroEditavel}
                        className="has-inline-action"
                      />
                      <button
                        type="button"
                        className="input-inline-action"
                        onClick={() => {
                          if (!canEditCondoSettings || carregando || salvando) return;
                          setNumeroEditavel(true);
                          window.setTimeout(() => numeroInputRef.current?.focus(), 0);
                        }}
                        disabled={!canEditCondoSettings || carregando || salvando}
                        title="Habilitar edição do campo Número"
                        aria-label="Editar campo Número"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                          <path
                            d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.96 1.96 3.75 3.75 2.12-2.12z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </label>
                </>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={!canEditCondoSettings || salvando || carregando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'notificacoes' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Notificações e Alertas</h3>
            <p className="modal-intro">Este módulo está preparado para receber parâmetros em próxima evolução.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parâmetros editáveis nesta versão" disabled />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === 'integracoes' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Editar Integrações Operacionais</h3>
            <p className="modal-intro">Este módulo está preparado para receber parâmetros em próxima evolução.</p>
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                Status
                <input value="Sem parâmetros editáveis nesta versão" disabled />
              </label>
              <div className="modal-actions">
                <button type="button" className="button-soft" onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
