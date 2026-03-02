export type EncomendaStatus = 'RECEBIDA' | 'DISPONIVEL_RETIRADA' | 'ENTREGUE'
export type EncomendaTipo = 'PACOTE' | 'ENVELOPE' | 'CAIXA'

export type EncomendaListItem = {
  id: number
  condominio_id: number
  codigo_interno: string
  codigo_externo?: string | null
  status: EncomendaStatus
  tipo: EncomendaTipo
  morador_id: number
  morador_nome?: string | null
  endereco_id: number
  endereco_label?: string | null
  data_recebimento?: string | null
  hora_recebimento?: string | null
  data_entrega?: string | null
}

export type EncomendaDetail = EncomendaListItem & {
  codigo_externo?: string | null
  descricao?: string | null
  empresa_entregadora?: string | null
  entregue_por_usuario_id?: number | null
  retirado_por_nome?: string | null
  motivo_reabertura?: string | null
  reaberto_por_usuario_id?: number | null
  reaberto_em?: string | null
  notificado_em?: string | null
  notificado_por?: string | null
}

export type Morador = {
  id: number
  nome: string
  endereco_id: number
}

export type Endereco = {
  id: number
  tipo_endereco: string
  quadra: string
  conjunto?: string | null
  lote?: string | null
  setor_chacara?: string | null
  numero_chacara?: string | null
}

export type EncomendaFormState = {
  tipo: EncomendaTipo
  morador_id: string
  endereco_id: string
  codigo_externo: string
  descricao: string
  empresa_entregadora: string
}

export type EncomendaSort = 'RECENTES' | 'ANTIGAS' | 'MORADOR_AZ' | 'MORADOR_ZA'
export type EncomendaFilter = 'ALL' | EncomendaStatus | 'ESQUECIDA'
