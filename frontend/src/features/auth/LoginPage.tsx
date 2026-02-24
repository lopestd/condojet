import { FormEvent, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { readApiError } from '../../services/httpClient';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const [mode, setMode] = useState<'global' | 'condominio'>('global');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
        accessMode: mode
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
        <p className="brand-eyebrow">CondoJET</p>
        <h1>Controle operacional de condominios</h1>
        <p>Autentique-se para acompanhar recebimentos, retiradas e administracao da plataforma.</p>

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
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button type="button" className="button-soft small" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          <label className="inline-option">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Lembrar de mim
          </label>

          {error ? <p className="error-box">{error}</p> : null}

          <button className="cta" type="submit" disabled={submitting}>
            {submitting ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
