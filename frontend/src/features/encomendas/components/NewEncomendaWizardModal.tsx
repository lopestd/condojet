import { FormEvent, useMemo, useState } from 'react'

import type { EncomendaFormState, EncomendaTipo, Endereco, Morador } from '../types'

type Props = {
  mode: 'create' | 'edit'
  form: EncomendaFormState
  setForm: (next: EncomendaFormState) => void
  moradores: Morador[]
  enderecos: Endereco[]
  loading: boolean
  onClose: () => void
  onSubmit: (event: FormEvent) => Promise<void>
}

function formatEnderecoField(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : '-'
}

function buildEnderecoRows(endereco: Endereco): Array<{ label: string; value: string }> {
  if (endereco.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Quadra', value: formatEnderecoField(endereco.quadra) }
    ]
    rows.push({ label: 'Setor/Chácara', value: formatEnderecoField(endereco.setor_chacara) })
    rows.push({ label: 'Número Chácara', value: formatEnderecoField(endereco.numero_chacara) })
    return rows
  }

  const rows: Array<{ label: string; value: string }> = [{ label: 'Quadra', value: formatEnderecoField(endereco.quadra) }]
  rows.push({ label: 'Conjunto', value: formatEnderecoField(endereco.conjunto) })
  rows.push({ label: 'Lote', value: formatEnderecoField(endereco.lote) })
  return rows
}

export function NewEncomendaWizardModal({
  mode,
  form,
  setForm,
  moradores,
  enderecos,
  loading,
  onClose,
  onSubmit
}: Props): JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)

  const enderecoSelecionado = useMemo(
    () => enderecos.find((item) => item.id === Number(form.endereco_id)),
    [enderecos, form.endereco_id]
  )

  function onMoradorChange(nextMoradorId: string): void {
    const morador = moradores.find((item) => item.id === Number(nextMoradorId))
    setForm({
      ...form,
      morador_id: nextMoradorId,
      endereco_id: morador ? String(morador.endereco_id) : form.endereco_id
    })
  }

  const canNextStep1 = Boolean(form.tipo && form.codigo_externo.trim() && form.empresa_entregadora.trim())
  const canNextStep2 = Boolean(form.morador_id && form.endereco_id)

  async function onWizardSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (step < 2) {
      if (!canNextStep1) return
      setStep(2)
      return
    }
    await onSubmit(event)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card morador-modal encomenda-wizard-modal">
        <h3>{mode === 'create' ? 'Nova encomenda' : 'Editar encomenda'}</h3>
        <p className="wizard-caption">Etapa {step} de 2</p>

        <div className="wizard-steps" role="list" aria-label="Etapas do cadastro">
          <span className={step >= 1 ? 'active' : ''}>Dados da encomenda</span>
          <span className={step >= 2 ? 'active' : ''}>Morador e endereço</span>
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
                <input
                  value={form.codigo_externo}
                  onChange={(event) => setForm({ ...form, codigo_externo: event.target.value })}
                  required
                />
              </label>
              <label>
                Empresa responsável
                <input
                  value={form.empresa_entregadora}
                  onChange={(event) => setForm({ ...form, empresa_entregadora: event.target.value })}
                  required
                />
              </label>
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
              <label>
                Morador
                <select value={form.morador_id} onChange={(event) => onMoradorChange(event.target.value)} required>
                  <option value="">Selecione</option>
                  {moradores.map((morador) => (
                    <option key={morador.id} value={morador.id}>{`#${morador.id} - ${morador.nome}`}</option>
                  ))}
                </select>
              </label>

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
              <button
                type="submit"
                className="cta"
                disabled={loading || !canNextStep1}
              >
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
    </div>
  )
}
