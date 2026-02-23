from src.domain.entities.encomenda import Encomenda
from src.domain.repositories.encomenda_repository import EncomendaRepository


class InMemoryEncomendaRepository(EncomendaRepository):
    def __init__(self) -> None:
        self._items: list[Encomenda] = []

    def save(self, encomenda: Encomenda) -> Encomenda:
        encomenda.id = len(self._items) + 1
        self._items.append(encomenda)
        return encomenda
