from src.application.dtos.encomenda_dto import CreateEncomendaDTO
from src.domain.entities.encomenda import Encomenda
from src.domain.repositories.encomenda_repository import EncomendaRepository
from src.infrastructure.timezone import app_now


class CreateEncomendaUseCase:
    def __init__(self, repository: EncomendaRepository) -> None:
        self.repository = repository

    def execute(self, dto: CreateEncomendaDTO) -> Encomenda:
        now = app_now()
        encomenda = Encomenda(
            id=None,
            codigo_interno=f"ENC-{int(now.timestamp())}",
            tipo=dto.tipo,
            status="RECEBIDA",
            data_recebimento=now.date(),
            hora_recebimento=now.time().replace(microsecond=0),
            morador_id=dto.morador_id,
            endereco_id=dto.endereco_id,
        )
        return self.repository.save(encomenda)
