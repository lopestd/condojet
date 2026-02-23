from abc import ABC, abstractmethod

from src.domain.entities.encomenda import Encomenda


class EncomendaRepository(ABC):
    @abstractmethod
    def save(self, encomenda: Encomenda) -> Encomenda:
        raise NotImplementedError
