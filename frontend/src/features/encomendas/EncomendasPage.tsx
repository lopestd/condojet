import { useEffect, useState } from 'react';

import { backendApi } from '../../services/httpClient';

type HealthResponse = {
  status: string;
  service: string;
};

export function EncomendasPage(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    backendApi.get<HealthResponse>('/health').then(({ data }) => setHealth(data));
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">CondoJET MVP</h1>
      <p className="text-sm text-slate-600">
        Base pronta para os fluxos de recebimento, organização e entrega de encomendas.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <span className="font-medium">Status do backend:</span>{' '}
        {health ? `${health.status} (${health.service})` : 'carregando...'}
      </div>
    </section>
  );
}
