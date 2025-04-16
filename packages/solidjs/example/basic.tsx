import { render } from 'solid-js/web';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { createSignal, For, Show } from 'solid-js';
import { NLogin, NostrLoginProvider, NostrProvider, useNostrLogin } from '@nostrify/solidjs';

// Add some basic styling
const styles = `
  body {
    font-family: system-ui, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  form {
    display: flex;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  input {
    flex: 1;
    min-width: 300px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  button {
    padding: 8px 16px;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #0051a8;
  }
  
  ul {
    list-style: none;
    padding: 0;
  }
  
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid #eee;
    margin-bottom: 10px;
    border-radius: 4px;
  }
  
  .pubkey {
    font-family: monospace;
    word-break: break-all;
    margin-right: 15px;
  }
  
  .buttons {
    display: flex;
    gap: 8px;
  }

  .debug {
    background: #eee;
    padding: 10px;
    margin: 10px 0;
    font-family: monospace;
    white-space: pre-wrap;
    overflow: auto;
    max-height: 200px;
  }
`;

function LoginForm() {
  const { addLogin } = useNostrLogin();
  const [nsec, setNsec] = createSignal('');
  const [error, setError] = createSignal('');
  const [successMessage, setSuccessMessage] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      if (!nsec().trim()) {
        throw new Error('Please enter a valid nsec');
      }

      const login = NLogin.fromNsec(nsec());
      addLogin(login);
      setNsec('');
      setSuccessMessage(`Successfully added login for ${login.pubkey.slice(0, 6)}...${login.pubkey.slice(-6)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid nsec');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type='password'
        value={nsec()}
        onInput={(e) => setNsec(e.currentTarget.value)}
        placeholder='Enter nsec'
      />
      <button type='submit'>Login</button>
      <Show when={error()}>
        <div style={{ color: 'red', width: '100%', 'margin-top': '8px' }}>{error()}</div>
      </Show>
      <Show when={successMessage()}>
        <div style={{ color: 'green', width: '100%', 'margin-top': '8px' }}>{successMessage()}</div>
      </Show>
    </form>
  );
}

function LoginList() {
  const loginContext = useNostrLogin();

  return (
    <div>
      <h2>Your Logins</h2>
      <div class='debug'>
        Debug: {JSON.stringify(loginContext.logins, null, 2)}
      </div>

      <Show
        when={loginContext.logins.length > 0}
        fallback={<p>No logins yet. Add one using the form above.</p>}
      >
        <ul>
          <For each={loginContext.logins}>
            {(login) => (
              <li>
                <div class='pubkey'>{login.pubkey}</div>
                <div class='buttons'>
                  <button type='button' onClick={() => loginContext.setLogin(login.id)}>Use</button>
                  <button type='button' onClick={() => loginContext.removeLogin(login.id)}>Remove</button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function App() {
  const relays = ['wss://ditto.pub/relay'];

  const nostr = new NPool({
    open(url: string) {
      return new NRelay1(url);
    },
    reqRouter(filters) {
      return new Map(relays.map((url) => [url, filters]));
    },
    eventRouter(_event: NostrEvent) {
      return relays;
    },
  });

  return (
    <>
      <style>{styles}</style>
      <NostrProvider appName='NostrifyExample' nostr={nostr}>
        <NostrLoginProvider storageKey='nostrify-example-logins'>
          <h1>Nostrify SolidJS Example</h1>
          <p>This example shows how to use the @nostrify/solidjs package to login with Nostr.</p>
          <LoginForm />
          <LoginList />
        </NostrLoginProvider>
      </NostrProvider>
    </>
  );
}

render(() => <App />, document.getElementById('root')!);
