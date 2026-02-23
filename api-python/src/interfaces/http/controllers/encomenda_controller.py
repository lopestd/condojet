from src.application.dtos.encomenda_dto import CreateEncomendaDTO
from src.application.use_cases.create_encomenda import CreateEncomendaUseCase


class EncomendaController:
    def __init__(self, use_case: CreateEncomendaUseCase) -> None:
        self.use_case = use_case

    def create(self, payload: CreateEncomendaDTO) -> dict:
        encomenda = self.use_case.execute(payload)
        return {
            "id": encomenda.id,
            "codigo_interno": encomenda.codigo_interno,
            "status": encomenda.status,
        }
