import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { backendApi, readApiError } from '../../../services/httpClient'
import { canOpenScannerCamera, isMobileScannerAvailable } from '../utils/mobileScanner'
import type { EncomendaFormState, EncomendaTipo, Endereco, Morador } from '../types'
import { BarcodeScanner } from './BarcodeScanner'

type Props = {
  mode: 'create' | 'edit'
  form: EncomendaFormState
  setForm: (next: EncomendaFormState) => void
  moradores: Morador[]
  enderecos: Endereco[]
  empresasResponsaveis: string[]
  loading: boolean
  onClose: () => void
  onSubmit: (event: FormEvent) => Promise<void>
  onMoradorCreated: (moradorId: number) => Promise<void>
}

type NewMoradorFormState = {
  nome: string
  email: string
  telefone1: string
  telefone2: string
  senha: string
}

type TipoCondominioSlug = 'HORIZONTAL' | 'PREDIO_CONJUNTO' | null

type ParametrosEnderecamento = {
  predio_rotulo_bloco: string
  predio_rotulo_andar: string
  predio_rotulo_apartamento: string
  horizontal_rotulo_tipo: string
  horizontal_rotulo_subtipo: string
  horizontal_rotulo_numero: string
  horizontal_hint_tipo: string
  horizontal_hint_subtipo: string
  horizontal_tipos_permitidos_ids: number[]
  horizontal_subtipos_permitidos_ids: number[]
  horizontal_tipos_permitidos_nomes: string[]
  horizontal_subtipos_permitidos_nomes: string[]
}

type CondominioConfiguracaoResponse = {
  tipo_condominio_slug: TipoCondominioSlug
  parametros_enderecamento: ParametrosEnderecamento
}

type TipoLogradouroHorizontal = {
  id: number
  nome: string
}

type SubtipoLogradouroHorizontal = {
  id: number
  tipo_logradouro_horizontal_id: number
  nome: string
}

type EnderecosReferenciasResponse = {
  tipos_logradouro_horizontal: TipoLogradouroHorizontal[]
  subtipos_logradouro_horizontal: SubtipoLogradouroHorizontal[]
}

const DEFAULT_PARAMETROS_ENDERECAMENTO: ParametrosEnderecamento = {
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
}

function buildInitialMoradorForm(): NewMoradorFormState {
  return {
    nome: '',
    email: '',
    telefone1: '',
    telefone2: '',
    senha: ''
  }
}

function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function rankMoradorByQuery(nome: string, query: string): number {
  const normalizedName = normalizeText(nome)
  if (!query) return 0
  if (!normalizedName) return -1

  const tokens = normalizedName.split(' ').filter(Boolean)
  const firstName = tokens[0] ?? ''
  const lastName = tokens[tokens.length - 1] ?? ''

  if (firstName.startsWith(query)) return 400
  if (lastName.startsWith(query)) return 300
  if (tokens.some((token) => token.startsWith(query))) return 200
  if (normalizedName.includes(query)) return 100
  return -1
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function buildPhoneStorageValue(values: string[]): string {
  return values.map((item) => item.trim()).filter(Boolean).join(' | ')
}

function formatEnderecoField(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '-'
}

function buildEnderecoRows(endereco: Endereco): Array<{ label: string; value: string }> {
  if (endereco.tipo_condominio_slug === 'PREDIO_CONJUNTO') {
    return [
      { label: 'Bloco', value: formatEnderecoField(endereco.bloco) },
      { label: 'Andar', value: formatEnderecoField(endereco.andar) },
      { label: 'Apartamento', value: formatEnderecoField(endereco.apartamento) }
    ]
  }

  if (endereco.tipo_condominio_slug === 'HORIZONTAL') {
    return [
      {
        label: formatEnderecoField(endereco.tipo_logradouro_campo_nome || 'Tipo'),
        value: formatEnderecoField(endereco.tipo_logradouro_nome)
      },
      {
        label: formatEnderecoField(endereco.subtipo_logradouro_campo_nome || 'Subtipo'),
        value: formatEnderecoField(endereco.subtipo_logradouro_nome)
      },
      { label: 'Número', value: formatEnderecoField(endereco.numero) }
    ]
  }

  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    return [
      { label: 'Quadra', value: formatEnderecoField(endereco.quadra) },
      { label: 'Setor/Chácara', value: formatEnderecoField(endereco.setor_chacara) },
      { label: 'Número Chácara', value: formatEnderecoField(endereco.numero_chacara) }
    ]
  }

  return [
    { label: 'Quadra', value: formatEnderecoField(endereco.quadra) },
    { label: 'Conjunto', value: formatEnderecoField(endereco.conjunto) },
    { label: 'Lote', value: formatEnderecoField(endereco.lote) }
  ]
}

export function NewEncomendaWizardModal({
  mode,
  form,
  setForm,
  moradores,
  enderecos,
  empresasResponsaveis,
  loading,
  onClose,
  onSubmit,
  onMoradorCreated
}: Props): JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scannerAvailable, setScannerAvailable] = useState<boolean>(() => isMobileScannerAvailable())
  const trackingInputRef = useRef<HTMLInputElement | null>(null)
  const [empresaMode, setEmpresaMode] = useState<'catalogo' | 'manual'>('catalogo')
  const [empresaManual, setEmpresaManual] = useState<string>('')

  const [moradorDropdownOpen, setMoradorDropdownOpen] = useState(false)
  const [moradorQuery, setMoradorQuery] = useState('')
  const [moradorHighlightedIndex, setMoradorHighlightedIndex] = useState<number>(-1)
  const moradorComboRef = useRef<HTMLDivElement | null>(null)
  const [moradoresLocais, setMoradoresLocais] = useState<Morador[]>([])

  const [showNovoMoradorModal, setShowNovoMoradorModal] = useState(false)
  const [novoMoradorForm, setNovoMoradorForm] = useState<NewMoradorFormState>(buildInitialMoradorForm)
  const [savingNovoMorador, setSavingNovoMorador] = useState(false)
  const [novoMoradorError, setNovoMoradorError] = useState<string | null>(null)

  const [loadingAddressMetadata, setLoadingAddressMetadata] = useState(false)
  const [tipoCondominioSlug, setTipoCondominioSlug] = useState<TipoCondominioSlug>(null)
  const [parametrosEnderecamento, setParametrosEnderecamento] = useState<ParametrosEnderecamento>(
    DEFAULT_PARAMETROS_ENDERECAMENTO
  )
  const [tiposLogradouroHorizontal, setTiposLogradouroHorizontal] = useState<TipoLogradouroHorizontal[]>([])
  const [subtiposLogradouroHorizontal, setSubtiposLogradouroHorizontal] = useState<SubtipoLogradouroHorizontal[]>([])

  const [showAddressCreate, setShowAddressCreate] = useState(false)
  const [creatingAddress, setCreatingAddress] = useState(false)
  const [bloco, setBloco] = useState('')
  const [andar, setAndar] = useState('')
  const [apartamento, setApartamento] = useState('')
  const [tipoCampoSelecionado, setTipoCampoSelecionado] = useState('')
  const [subtipoCampoSelecionado, setSubtipoCampoSelecionado] = useState('')
  const [tipoLogradouroInput, setTipoLogradouroInput] = useState('')
  const [subtipoLogradouroInput, setSubtipoLogradouroInput] = useState('')
  const [numero, setNumero] = useState('')

  const allMoradores = useMemo(() => {
    const map = new Map<number, Morador>()
    moradores.forEach((item) => map.set(item.id, item))
    moradoresLocais.forEach((item) => map.set(item.id, item))
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
  }, [moradores, moradoresLocais])

  const filteredMoradores = useMemo(() => {
    const normalizedQuery = normalizeText(moradorQuery)
    const ranked = allMoradores
      .map((morador) => ({ morador, score: rankMoradorByQuery(morador.nome, normalizedQuery) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.morador.nome.localeCompare(b.morador.nome, 'pt-BR', { sensitivity: 'base' })
      })
      .map((item) => item.morador)
    return ranked
  }, [allMoradores, moradorQuery])

  const moradorSelecionado = useMemo(
    () => allMoradores.find((item) => item.id === Number(form.morador_id)),
    [allMoradores, form.morador_id]
  )

  const enderecoSelecionado = useMemo(() => {
    const enderecoId = Number(form.endereco_id || moradorSelecionado?.endereco_id)
    return enderecos.find((item) => item.id === enderecoId)
  }, [enderecos, form.endereco_id, moradorSelecionado])

  const optionsMorador = filteredMoradores

  const tiposDisponiveis = useMemo(() => {
    const filtered = tiposLogradouroHorizontal
      .filter(
        (item) =>
          (parametrosEnderecamento.horizontal_tipos_permitidos_ids ?? []).length === 0 ||
          (parametrosEnderecamento.horizontal_tipos_permitidos_ids ?? []).includes(item.id)
      )
      .map((item) => item.nome)
    return [...new Set(filtered)]
  }, [tiposLogradouroHorizontal, parametrosEnderecamento.horizontal_tipos_permitidos_ids])

  const tipoSelecionadoRefId = useMemo(() => {
    if (!tipoCampoSelecionado) return null
    return (
      tiposLogradouroHorizontal.find((item) => normalizeText(item.nome) === normalizeText(tipoCampoSelecionado))?.id ??
      null
    )
  }, [tipoCampoSelecionado, tiposLogradouroHorizontal])

  const subtiposDisponiveis = useMemo(() => {
    const filtered = subtiposLogradouroHorizontal
      .filter(
        (item) =>
          ((parametrosEnderecamento.horizontal_subtipos_permitidos_ids ?? []).length === 0 ||
            (parametrosEnderecamento.horizontal_subtipos_permitidos_ids ?? []).includes(item.id)) &&
          (tipoSelecionadoRefId == null || item.tipo_logradouro_horizontal_id === tipoSelecionadoRefId)
      )
      .map((item) => item.nome)
    return [...new Set(filtered)]
  }, [
    subtiposLogradouroHorizontal,
    parametrosEnderecamento.horizontal_subtipos_permitidos_ids,
    tipoSelecionadoRefId
  ])

  const hasMultipleSubtiposConfigured = useMemo(() => subtiposDisponiveis.length > 1, [subtiposDisponiveis.length])
  const empresaAtualTrimmed = (form.empresa_entregadora ?? '').trim()
  const empresaAtualEhCatalogo = useMemo(
    () => empresasResponsaveis.some((empresa) => normalizeText(empresa) === normalizeText(empresaAtualTrimmed)),
    [empresasResponsaveis, empresaAtualTrimmed]
  )
  const deveExibirOpcaoEmpresaRegistrada =
    Boolean(empresaAtualTrimmed) && !empresaAtualEhCatalogo && empresaMode !== 'manual'

  function resetAddressForm(): void {
    setBloco('')
    setAndar('')
    setApartamento('')
    setTipoCampoSelecionado('')
    setSubtipoCampoSelecionado('')
    setTipoLogradouroInput('')
    setSubtipoLogradouroInput('')
    setNumero('')
    setShowAddressCreate(false)
  }

  function onMoradorChange(nextMoradorId: string): void {
    const morador = allMoradores.find((item) => item.id === Number(nextMoradorId))
    setForm({
      ...form,
      morador_id: nextMoradorId,
      endereco_id: morador ? String(morador.endereco_id) : ''
    })
  }

  function selectMorador(nextMorador: Morador): void {
    setMoradorQuery(nextMorador.nome)
    setMoradorDropdownOpen(false)
    setMoradorHighlightedIndex(-1)
    onMoradorChange(String(nextMorador.id))
  }

  function onMoradorInputChange(value: string): void {
    setMoradorQuery(value)
    setMoradorDropdownOpen(true)
    setMoradorHighlightedIndex(0)
    if (form.morador_id) {
      setForm({
        ...form,
        morador_id: '',
        endereco_id: ''
      })
    }
  }

  function toggleMoradorDropdown(): void {
    setMoradorDropdownOpen((previous) => {
      if (previous) return false
      setMoradorQuery('')
      setMoradorHighlightedIndex(0)
      return true
    })
  }

  function onMoradorInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (!moradorDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setMoradorDropdownOpen(true)
      setMoradorHighlightedIndex(0)
      return
    }

    if (!moradorDropdownOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setMoradorHighlightedIndex((previous) => Math.min(previous + 1, Math.max(optionsMorador.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setMoradorHighlightedIndex((previous) => Math.max(previous - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      if (moradorHighlightedIndex < 0 || moradorHighlightedIndex >= optionsMorador.length) return
      event.preventDefault()
      const candidate = optionsMorador[moradorHighlightedIndex]
      if (!candidate) return
      selectMorador(candidate)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setMoradorDropdownOpen(false)
      setMoradorHighlightedIndex(-1)
    }
  }

  function onTelefoneNovoMoradorChange(field: 'telefone1' | 'telefone2', event: ChangeEvent<HTMLInputElement>): void {
    const masked = formatPhoneInput(event.target.value)
    setNovoMoradorForm((previous) => ({ ...previous, [field]: masked }))
  }

  function generatePassword(size = 14): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let result = ''
    for (let i = 0; i < size; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  async function loadAddressMetadata(): Promise<void> {
    setLoadingAddressMetadata(true)
    try {
      const [condominioConfig, referencias] = await Promise.all([
        backendApi.get<CondominioConfiguracaoResponse>('/configuracoes/condominio'),
        backendApi.get<EnderecosReferenciasResponse>('/configuracoes/enderecos/referencias')
      ])
      setTipoCondominioSlug(condominioConfig.data.tipo_condominio_slug)
      setParametrosEnderecamento(
        condominioConfig.data.parametros_enderecamento ?? DEFAULT_PARAMETROS_ENDERECAMENTO
      )
      setTiposLogradouroHorizontal(referencias.data.tipos_logradouro_horizontal ?? [])
      setSubtiposLogradouroHorizontal(referencias.data.subtipos_logradouro_horizontal ?? [])
    } finally {
      setLoadingAddressMetadata(false)
    }
  }

  async function openNovoMoradorModal(): Promise<void> {
    setNovoMoradorError(null)
    setNovoMoradorForm(buildInitialMoradorForm())
    resetAddressForm()
    setShowNovoMoradorModal(true)
    try {
      await loadAddressMetadata()
    } catch (err) {
      setNovoMoradorError(readApiError(err))
    }
  }

  function closeNovoMoradorModal(): void {
    setNovoMoradorError(null)
    setShowNovoMoradorModal(false)
    setNovoMoradorForm(buildInitialMoradorForm())
    resetAddressForm()
  }

  async function createEnderecoForNovoMorador(): Promise<number> {
    if (!showAddressCreate) {
      throw new Error('endereco_required')
    }

    if (!tipoCondominioSlug) {
      throw new Error('tipo_condominio_not_defined')
    }

    const payload: Record<string, unknown> = {}

    if (tipoCondominioSlug === 'PREDIO_CONJUNTO') {
      payload.bloco = bloco
      payload.andar = andar
      payload.apartamento = apartamento
    } else {
      const resolvedTipoTitulo = tipoCampoSelecionado || (tiposDisponiveis.length === 1 ? tiposDisponiveis[0] : '')
      const resolvedSubtipoTitulo =
        subtipoCampoSelecionado || (subtiposDisponiveis.length === 1 ? subtiposDisponiveis[0] : '')
      const tipoValor = tipoLogradouroInput.trim()
      const subtipoValor = subtipoLogradouroInput.trim()
      const numeroValor = numero.trim()

      if (!tipoValor || !subtipoValor || !numeroValor) {
        throw new Error('endereco_horizontal_campos_obrigatorios')
      }
      if (tiposDisponiveis.length > 1 && !resolvedTipoTitulo) {
        throw new Error('endereco_horizontal_titulo_tipo_obrigatorio')
      }
      if (subtiposDisponiveis.length > 1 && !resolvedSubtipoTitulo) {
        throw new Error('endereco_horizontal_titulo_subtipo_obrigatorio')
      }

      const tipoRef = resolvedTipoTitulo
        ? tiposLogradouroHorizontal.find((item) => normalizeText(item.nome) === normalizeText(resolvedTipoTitulo))
        : null
      if (!tipoRef) {
        throw new Error('tipo_logradouro_not_found')
      }
      const subtipoRef = subtiposLogradouroHorizontal.find(
        (item) =>
          item.tipo_logradouro_horizontal_id === tipoRef.id &&
          normalizeText(item.nome) === normalizeText(resolvedSubtipoTitulo)
      )
      if (!subtipoRef) {
        throw new Error('subtipo_not_belongs_to_tipo')
      }

      payload.tipo_logradouro_horizontal_id = tipoRef.id
      payload.subtipo_logradouro_horizontal_id = subtipoRef.id
      payload.tipo_logradouro_horizontal_nome = tipoValor
      payload.subtipo_logradouro_horizontal_nome = subtipoValor
      payload.numero = numeroValor
    }

    setCreatingAddress(true)
    try {
      const { data } = await backendApi.post<{ id: number }>('/enderecos/v2', payload)
      return data.id
    } finally {
      setCreatingAddress(false)
    }
  }

  async function onSaveNovoMorador(event: FormEvent): Promise<void> {
    event.preventDefault()
    setNovoMoradorError(null)

    if (!novoMoradorForm.telefone1.trim()) {
      setNovoMoradorError('Informe o Telefone 1 (principal).')
      return
    }

    const telefone = buildPhoneStorageValue([novoMoradorForm.telefone1, novoMoradorForm.telefone2])

    setSavingNovoMorador(true)
    try {
      const enderecoId = await createEnderecoForNovoMorador()

      const payload = {
        nome: novoMoradorForm.nome.trim(),
        email: novoMoradorForm.email.trim(),
        telefone,
        senha: novoMoradorForm.senha,
        endereco_id: enderecoId
      }

      const { data } = await backendApi.post<{ id: number }>('/moradores', payload)
      const novoMorador: Morador = {
        id: data.id,
        nome: payload.nome,
        endereco_id: payload.endereco_id
      }

      setMoradoresLocais((previous) => [...previous.filter((item) => item.id !== novoMorador.id), novoMorador])
      await onMoradorCreated(data.id)

      setMoradorQuery(payload.nome)
      setForm({
        ...form,
        morador_id: String(data.id),
        endereco_id: String(payload.endereco_id)
      })
      closeNovoMoradorModal()
    } catch (err) {
      if (err instanceof Error && err.message === 'endereco_required') {
        setNovoMoradorError('Cadastro de endereço é obrigatório.')
      } else if (err instanceof Error && err.message === 'tipo_condominio_not_defined') {
        setNovoMoradorError('Defina primeiro o tipo de condomínio em Configurações/Gerais.')
      } else if (err instanceof Error && err.message === 'endereco_horizontal_campos_obrigatorios') {
        setNovoMoradorError('Preencha Tipo, Subtipo e Número para incluir o endereço.')
      } else if (err instanceof Error && err.message === 'endereco_horizontal_titulo_tipo_obrigatorio') {
        setNovoMoradorError('Selecione o campo de TIPO antes de salvar o endereço.')
      } else if (err instanceof Error && err.message === 'endereco_horizontal_titulo_subtipo_obrigatorio') {
        setNovoMoradorError('Selecione o campo de SUBTIPO antes de salvar o endereço.')
      } else if (err instanceof Error && err.message === 'tipo_logradouro_not_found') {
        setNovoMoradorError('Tipo configurado não encontrado na tabela de referências.')
      } else if (err instanceof Error && err.message === 'subtipo_not_belongs_to_tipo') {
        setNovoMoradorError('Subtipo incompatível com o tipo selecionado.')
      } else {
        setNovoMoradorError(readApiError(err))
      }
    } finally {
      setSavingNovoMorador(false)
    }
  }

  const canNextStep1 = Boolean(form.tipo && form.codigo_externo.trim() && form.empresa_entregadora.trim())
  const canNextStep2 = Boolean(form.morador_id && form.endereco_id)

  useEffect(() => {
    function onViewportChange(): void {
      setScannerAvailable(isMobileScannerAvailable())
    }
    window.addEventListener('resize', onViewportChange)
    return () => window.removeEventListener('resize', onViewportChange)
  }, [])

  useEffect(() => {
    if (mode !== 'create') return
    if (!form.empresa_entregadora) return
    setForm({ ...form, empresa_entregadora: '' })
  }, [mode])

  useEffect(() => {
    if (!empresaAtualTrimmed) {
      if (empresaMode === 'manual') {
        return
      }
      if (empresaMode !== 'catalogo') {
        setEmpresaMode('catalogo')
      }
      if (empresaManual) {
        setEmpresaManual('')
      }
      return
    }

    if (empresaAtualEhCatalogo) {
      if (empresaMode !== 'catalogo') {
        setEmpresaMode('catalogo')
      }
      if (empresaManual) {
        setEmpresaManual('')
      }
      return
    }

    if (empresaMode === 'manual' && !empresaManual) {
      setEmpresaManual(empresaAtualTrimmed)
    }
  }, [empresaAtualEhCatalogo, empresaAtualTrimmed, empresaManual, empresaMode])

  useEffect(() => {
    const selected = allMoradores.find((item) => item.id === Number(form.morador_id))
    if (!selected) return
    if (moradorDropdownOpen) return
    if (moradorQuery === selected.nome) return
    setMoradorQuery(selected.nome)
  }, [allMoradores, form.morador_id, moradorDropdownOpen, moradorQuery])

  useEffect(() => {
    if (!moradorDropdownOpen) return
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node | null
      if (!target) return
      if (moradorComboRef.current?.contains(target)) return
      setMoradorDropdownOpen(false)
      setMoradorHighlightedIndex(-1)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [moradorDropdownOpen])

  useEffect(() => {
    if (tipoCondominioSlug !== 'HORIZONTAL' || !showAddressCreate) return
    if (tiposDisponiveis.length === 1) {
      const unico = tiposDisponiveis[0]
      if (unico && tipoCampoSelecionado !== unico) {
        setTipoCampoSelecionado(unico)
      }
    }
  }, [tipoCondominioSlug, showAddressCreate, tiposDisponiveis, tipoCampoSelecionado])

  useEffect(() => {
    if (tipoCondominioSlug !== 'HORIZONTAL' || !showAddressCreate) return
    if (subtiposDisponiveis.length === 1) {
      const unico = subtiposDisponiveis[0]
      if (unico && subtipoCampoSelecionado !== unico) {
        setSubtipoCampoSelecionado(unico)
      }
    }
  }, [tipoCondominioSlug, showAddressCreate, subtiposDisponiveis, subtipoCampoSelecionado])

  function onEmpresaSelectChange(value: string): void {
    if (value === '__manual__') {
      setEmpresaMode('manual')
      const nextManual = empresaManual || form.empresa_entregadora || ''
      setEmpresaManual(nextManual)
      setForm({ ...form, empresa_entregadora: nextManual })
      return
    }
    setEmpresaMode('catalogo')
    if (empresaManual) {
      setEmpresaManual('')
    }
    setForm({ ...form, empresa_entregadora: value })
  }

  async function onWizardSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (step < 2) {
      if (!canNextStep1) return
      setStep(2)
      return
    }
    await onSubmit(event)
  }

  function openScanner(): void {
    if (!canOpenScannerCamera()) {
      setCameraError('Scanner indisponível neste navegador. Acesse por HTTPS ou localhost e permita câmera.')
      return
    }
    setCameraError(null)
    setIsScannerOpen(true)
  }

  function closeScanner(): void {
    setIsScannerOpen(false)
  }

  function handleScannerDetected(code: string): void {
    setForm({ ...form, codigo_externo: code })
    setIsScannerOpen(false)
    window.requestAnimationFrame(() => {
      trackingInputRef.current?.focus()
    })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card morador-modal encomenda-wizard-modal">
        <h3>{mode === 'create' ? 'Nova encomenda' : 'Editar encomenda'}</h3>
        <p className="wizard-caption">Etapa {step} de 2</p>

        <div className="wizard-steps" role="list" aria-label="Etapas do cadastro">
          <span className={step >= 1 ? 'active' : ''}>Dados da encomenda</span>
          <span className={step >= 2 ? 'active' : ''}>Endereço e Morador</span>
        </div>

        <form className="form-grid" onSubmit={(event) => void onWizardSubmit(event)}>
          {step === 1 ? (
            <>
              <label>
                Tipo
                <select
                  value={form.tipo}
                  onChange={(event) => setForm({ ...form, tipo: event.target.value as EncomendaTipo })}
                >
                  <option value="PACOTE">PACOTE</option>
                  <option value="ENVELOPE">ENVELOPE</option>
                  <option value="CAIXA">CAIXA</option>
                </select>
              </label>
              <label>
                Código de Rastreio
                <div className="input-action-wrap">
                  <input
                    ref={trackingInputRef}
                    value={form.codigo_externo}
                    onChange={(event) => setForm({ ...form, codigo_externo: event.target.value })}
                    required
                  />
                  {scannerAvailable ? (
                    <button
                      type="button"
                      className="input-inline-action scanner-open-action"
                      onClick={openScanner}
                      aria-label="Abrir scanner"
                      title="Ler com câmera"
                    >
                      Scan
                    </button>
                  ) : null}
                </div>
              </label>
              {cameraError ? <p className="error-box scanner-field-error">{cameraError}</p> : null}
              <label>
                Empresa responsável
                <select
                  value={empresaMode === 'catalogo' ? form.empresa_entregadora : '__manual__'}
                  onChange={(event) => onEmpresaSelectChange(event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {deveExibirOpcaoEmpresaRegistrada ? (
                    <option value={empresaAtualTrimmed}>{empresaAtualTrimmed}</option>
                  ) : null}
                  <option value="__manual__">Informar manualmente</option>
                  {empresasResponsaveis.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </select>
              </label>
              {empresaMode === 'manual' ? (
                <label>
                  Empresa responsável (manual)
                  <input
                    value={empresaManual}
                    onChange={(event) => {
                      const value = event.target.value
                      setEmpresaManual(value)
                      setForm({ ...form, empresa_entregadora: value })
                    }}
                    required
                  />
                </label>
              ) : null}
              <label>
                Descrição
                <textarea
                  className="hint-soft"
                  value={form.descricao}
                  onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                  placeholder="Inclua uma descrição resumida do produto aqui"
                  rows={3}
                />
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <label className="morador-combobox-field">
                <span className="morador-combobox-label">Selecionar Morador(a):</span>
                <div
                  className={`morador-combobox ${moradorDropdownOpen ? 'is-open' : ''}`}
                  ref={moradorComboRef}
                >
                  <input
                    role="combobox"
                    aria-expanded={moradorDropdownOpen}
                    aria-controls="morador-listbox"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      moradorDropdownOpen && moradorHighlightedIndex >= 0
                        ? `morador-option-${optionsMorador[moradorHighlightedIndex]?.id ?? 'none'}`
                        : undefined
                    }
                    value={moradorQuery}
                    onChange={(event) => onMoradorInputChange(event.target.value)}
                    onKeyDown={onMoradorInputKeyDown}
                    onFocus={() => setMoradorDropdownOpen(true)}
                    placeholder="Digite o nome ou selecione na lista"
                    required
                  />
                  <button
                    type="button"
                    className="morador-combobox-toggle"
                    aria-label="Abrir lista de moradores"
                    onClick={toggleMoradorDropdown}
                  >
                    <span aria-hidden="true">▾</span>
                  </button>

                  {moradorDropdownOpen ? (
                    <div className="morador-combobox-list" role="listbox" id="morador-listbox">
                      {optionsMorador.length === 0 ? (
                        <div className="morador-combobox-empty">Nenhum morador encontrado</div>
                      ) : (
                        optionsMorador.map((morador, index) => (
                          <button
                            key={morador.id}
                            id={`morador-option-${morador.id}`}
                            type="button"
                            role="option"
                            aria-selected={String(morador.id) === form.morador_id}
                            className={`morador-combobox-option ${index === moradorHighlightedIndex ? 'is-highlighted' : ''}`}
                            onMouseEnter={() => setMoradorHighlightedIndex(index)}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              selectMorador(morador)
                            }}
                          >
                            {morador.nome}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </label>

              <div className="inline-subtle-action">
                <button type="button" className="subtle-link-button" onClick={() => void openNovoMoradorModal()}>
                  Novo(a) morador(a)
                </button>
              </div>

              {enderecoSelecionado ? (
                <div className="inline-panel">
                  <h4>Endereço do Morador</h4>
                  <div className="summary-grid">
                    {buildEnderecoRows(enderecoSelecionado).map((row) => (
                      <div key={`${row.label}-${row.value}`} className="summary-card">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="button-soft" onClick={onClose} disabled={loading}>
              Cancelar
            </button>

            {step > 1 ? (
              <button
                type="button"
                className="button-soft"
                onClick={() => setStep((previous) => Math.max(1, previous - 1) as 1 | 2)}
                disabled={loading}
              >
                Voltar
              </button>
            ) : null}

            {step < 2 ? (
              <button type="submit" className="cta" disabled={loading || !canNextStep1}>
                Próxima etapa
              </button>
            ) : (
              <button type="submit" className="cta" disabled={loading || !canNextStep2}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </form>
      </div>

      {showNovoMoradorModal ? (
        <div className="modal-overlay modal-overlay-nested" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide morador-modal">
            <h3>Novo(a) morador(a)</h3>
            <p className="modal-intro">Preencha os dados do morador e cadastre o endereço.</p>
            {novoMoradorError ? <p className="error-box">{novoMoradorError}</p> : null}
            {loadingAddressMetadata ? <p className="info-box">Carregando parâmetros de endereçamento...</p> : null}

            <form className="form-grid" onSubmit={(event) => void onSaveNovoMorador(event)}>
              <label>
                Nome completo
                <input
                  value={novoMoradorForm.nome}
                  onChange={(event) => setNovoMoradorForm((previous) => ({ ...previous, nome: event.target.value }))}
                  required
                />
              </label>

              <label>
                E-Mail
                <input
                  type="email"
                  value={novoMoradorForm.email}
                  onChange={(event) => setNovoMoradorForm((previous) => ({ ...previous, email: event.target.value }))}
                  required
                />
              </label>

              <div className="phones-inline-2">
                <label>
                  Telefone 1 (principal)
                  <input
                    value={novoMoradorForm.telefone1}
                    onChange={(event) => onTelefoneNovoMoradorChange('telefone1', event)}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 99999-8888"
                    required
                  />
                </label>
                <label>
                  Telefone 2 (opcional)
                  <input
                    value={novoMoradorForm.telefone2}
                    onChange={(event) => onTelefoneNovoMoradorChange('telefone2', event)}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 99999-8888"
                  />
                </label>
              </div>

              <div className="action-group">
                <button
                  type="button"
                  className="button-soft address-action-button"
                  disabled={loadingAddressMetadata}
                  onClick={() => {
                    setShowAddressCreate(true)
                    if (tipoCondominioSlug !== 'HORIZONTAL') return
                    if (tiposDisponiveis.length === 1) {
                      setTipoCampoSelecionado(tiposDisponiveis[0])
                    }
                    if (subtiposDisponiveis.length === 1) {
                      setSubtipoCampoSelecionado(subtiposDisponiveis[0])
                    }
                  }}
                >
                  Incluir endereço
                </button>
              </div>

              {showAddressCreate ? (
                <div className="inline-panel">
                  <h4>Novo endereço</h4>
                  {tipoCondominioSlug === 'PREDIO_CONJUNTO' ? (
                    <div className="address-inline-3">
                      <label>
                        {parametrosEnderecamento.predio_rotulo_bloco}
                        <input value={bloco} onChange={(event) => setBloco(event.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        {parametrosEnderecamento.predio_rotulo_andar}
                        <input value={andar} onChange={(event) => setAndar(event.target.value)} required={showAddressCreate} />
                      </label>
                      <label>
                        {parametrosEnderecamento.predio_rotulo_apartamento}
                        <input
                          value={apartamento}
                          onChange={(event) => setApartamento(event.target.value)}
                          required={showAddressCreate}
                        />
                      </label>
                    </div>
                  ) : tipoCondominioSlug === 'HORIZONTAL' ? (
                    <div className="address-inline-3">
                      <label>
                        <div className="address-field-title">
                          {tiposDisponiveis.length <= 1 ? (
                            tiposDisponiveis[0] || parametrosEnderecamento.horizontal_rotulo_tipo || 'Campo de endereço 1'
                          ) : (
                            <select
                              className="field-title-select"
                              value={tipoCampoSelecionado}
                              onChange={(event) => {
                                setTipoCampoSelecionado(event.target.value)
                                setSubtipoCampoSelecionado('')
                              }}
                              required={showAddressCreate}
                            >
                              <option value="">Selecione o campo...</option>
                              {tiposDisponiveis.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          value={tipoLogradouroInput}
                          onChange={(event) => setTipoLogradouroInput(event.target.value)}
                          placeholder="Digite o valor"
                          required={showAddressCreate}
                        />
                      </label>

                      <label>
                        <div className="address-field-title">
                          {!hasMultipleSubtiposConfigured && subtiposDisponiveis.length <= 1 ? (
                            subtiposDisponiveis[0] ||
                            parametrosEnderecamento.horizontal_rotulo_subtipo ||
                            'Campo de endereço 2'
                          ) : (
                            <select
                              className="field-title-select"
                              value={subtipoCampoSelecionado}
                              onChange={(event) => setSubtipoCampoSelecionado(event.target.value)}
                              required={showAddressCreate}
                            >
                              <option value="">Selecione o campo...</option>
                              {subtiposDisponiveis.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          value={subtipoLogradouroInput}
                          onChange={(event) => setSubtipoLogradouroInput(event.target.value)}
                          placeholder="Digite o valor"
                          required={showAddressCreate}
                        />
                      </label>

                      <label>
                        {parametrosEnderecamento.horizontal_rotulo_numero}
                        <input value={numero} onChange={(event) => setNumero(event.target.value)} required={showAddressCreate} />
                      </label>
                    </div>
                  ) : (
                    <p className="info-box">Defina o tipo de condomínio em Configurações/Gerais para cadastrar endereços.</p>
                  )}
                </div>
              ) : null}

              <label className="senha-field">
                Senha
                <div className="input-action-wrap">
                  <input
                    type="password"
                    value={novoMoradorForm.senha}
                    onChange={(event) => setNovoMoradorForm((previous) => ({ ...previous, senha: event.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="input-inline-action"
                    onClick={() => setNovoMoradorForm((previous) => ({ ...previous, senha: generatePassword() }))}
                    title="Gerar senha segura automaticamente"
                  >
                    Gerar
                  </button>
                </div>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-soft"
                  onClick={closeNovoMoradorModal}
                  disabled={savingNovoMorador || creatingAddress || loadingAddressMetadata}
                >
                  Cancelar
                </button>
                <button type="submit" className="cta" disabled={savingNovoMorador || creatingAddress || loadingAddressMetadata}>
                  {savingNovoMorador || creatingAddress ? 'Salvando...' : 'Cadastrar morador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isScannerOpen ? (
        <BarcodeScanner onDetected={handleScannerDetected} onClose={closeScanner} onError={setCameraError} />
      ) : null}
    </div>
  )
}
