'use client';

import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from 'react';

const PIN_LENGTH = 10;

export function PasscodeGate() {
  const [digits, setDigits] = useState<string[]>(
    () => Array(PIN_LENGTH).fill(''),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const authenticate = async (pin: string) => {
    if (busy || pin.length !== PIN_LENGTH) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        throw new Error('That access code did not match.');
      }
      window.location.assign('/');
    } catch (requestError) {
      setDigits(Array(PIN_LENGTH).fill(''));
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in to IANLAN NextGen.',
      );
      inputs.current[0]?.focus();
      setBusy(false);
    }
  };

  const placeDigits = (start: number, value: string) => {
    const incoming = value.replace(/\D/g, '').slice(0, PIN_LENGTH - start);
    if (!incoming) return;
    const next = [...digits];
    for (let offset = 0; offset < incoming.length; offset += 1) {
      next[start + offset] = incoming[offset];
    }
    setDigits(next);
    setError('');
    const nextIndex = Math.min(start + incoming.length, PIN_LENGTH - 1);
    inputs.current[nextIndex]?.focus();
    if (next.every(Boolean)) void authenticate(next.join(''));
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...digits];
      const target = next[index] ? index : Math.max(0, index - 1);
      next[target] = '';
      setDigits(next);
      inputs.current[target]?.focus();
    } else if (event.key === 'ArrowLeft') {
      inputs.current[Math.max(0, index - 1)]?.focus();
    } else if (event.key === 'ArrowRight') {
      inputs.current[Math.min(PIN_LENGTH - 1, index + 1)]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    placeDigits(0, event.clipboardData.getData('text'));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void authenticate(digits.join(''));
  };

  return (
    <main className="auth-screen">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-logo" aria-hidden="true">
          <span>IN</span>
          <i />
        </div>
        <p className="auth-kicker">Private reports workspace</p>
        <h1 id="auth-title">IANLAN<br /><em>NextGen</em></h1>
        <p className="auth-copy">
          Enter the ten-digit access code to open the report library—master
          plans, project records, investigations, and the evidence behind them.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="pin-grid" aria-label="Ten digit access code">
            {digits.map((digit, index) => (
              <input
                // The position is the stable identity in this fixed PIN row.
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                value={digit}
                type="password"
                autoFocus={index === 0}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                aria-label={`Digit ${index + 1}`}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) {
                    const next = [...digits];
                    next[index] = '';
                    setDigits(next);
                    return;
                  }
                  placeDigits(index, value);
                }}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>
          <div className="auth-status" aria-live="polite">
            {error || (busy ? 'Opening IANLAN NextGen…' : 'Secure workspace authentication')}
          </div>
          <button
            className="auth-button"
            type="submit"
            disabled={busy || digits.some((digit) => !digit)}
          >
            {busy ? 'Verifying' : 'Enter IANLAN NextGen'}
          </button>
        </form>
        <div className="auth-rule">
          <span>Workspace</span>
          <code>reports.ianlan.nextgen</code>
        </div>
      </section>
    </main>
  );
}
