from dataclasses import dataclass
from datetime import date, time


@dataclass(slots=True)
class Encomenda:
    id: int | None
    codigo_interno: str
    tipo: str
    status: str
    data_recebimento: date
    hora_recebimento: time
    morador_id: int
    endereco_id: int
