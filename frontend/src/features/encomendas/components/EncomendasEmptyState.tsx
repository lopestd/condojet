type Props = {
  hasFilters: boolean
  onCreate: () => void
}

export function EncomendasEmptyState({ hasFilters, onCreate }: Props): JSX.Element {
  return (
    <div className="encomendas-empty card">
      <h3>{hasFilters ? 'Nenhuma encomenda encontrada' : 'Nenhuma encomenda cadastrada'}</h3>
      <p>
        {hasFilters
          ? 'Ajuste os filtros ou a busca para localizar encomendas.'
          : 'Cadastre a primeira encomenda para iniciar o controle operacional.'}
      </p>
      {!hasFilters ? (
        <button type="button" className="cta" onClick={onCreate}>
          Nova encomenda
        </button>
      ) : null}
    </div>
  )
}
