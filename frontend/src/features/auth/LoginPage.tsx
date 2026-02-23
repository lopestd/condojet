import { FormEvent, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { readApiError } from '../../services/httpClient';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const [mode, setMode] = useState<'global' | 'condominio'>('global');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [condominioId, setCondominioId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({
        email,
        senha,
        condominioId: mode === 'condominio' ? Number(condominioId) : undefined
      });
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>CondoJET</h1>
        <p>Selecione o contexto de acesso e autentique no sistema.</p>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'global' ? 'active' : ''}
            onClick={() => setMode('global')}
          >
            Acesso Global (SaaS)
          </button>
          <button
            type="button"
            className={mode === 'condominio' ? 'active' : ''}
            onClick={() => setMode('condominio')}
          >
            Acesso Condomínio
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </label>

          {mode === 'condominio' ? (
            <label>
              ID do condomínio
              <input
                type="number"
                min={1}
                value={condominioId}
                onChange={(e) => setCondominioId(e.target.value)}
                required
              />
            </label>
          ) : null}

          {error ? <p className="error-box">{error}</p> : null}

          <button className="cta" type="submit" disabled={submitting}>
            {submitting ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
