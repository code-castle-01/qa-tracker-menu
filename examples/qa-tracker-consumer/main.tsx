import { createRoot } from 'react-dom/client';
import { App, Button, ConfigProvider, Dropdown, Select, Space } from 'antd';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { CaptureButton, QaTrackerApp, createQaText } from 'qa-tracker-menu';
import type { QaNotify } from 'qa-tracker-menu';
import 'qa-tracker-menu/styles.css';

export function Example() {
  const { message } = App.useApp();
  const text = createQaText('es');
  const notify: QaNotify = (kind, content) => {
    void message[kind](content, 3);
  };
  const shared = { text, notify, databaseName: 'qa-package-example' };
  return (
    <>
      <nav>
        <Space>
          <Link to="/">Inicio</Link>
          <Link to="/qa-tracker">QA-Tracker</Link>
        </Space>
      </nav>
      <CaptureButton
        {...shared}
        getContext={() => ({ path: location.pathname, title: document.title })}
      />
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <h1>Consumidor independiente</h1>
              <p>
                Abre un menú y pulsa la cámara. Shift + clic permite capturar después de 5 segundos.
              </p>
              <Space>
                <Select
                  aria-label="Rol"
                  placeholder="Rol"
                  style={{ width: 200 }}
                  options={[
                    { value: 'qa', label: 'QA' },
                    { value: 'dev', label: 'Desarrollo' },
                  ]}
                />
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'details', label: 'Detalles' },
                      { key: 'edit', label: 'Editar' },
                    ],
                  }}
                >
                  <Button>Acciones</Button>
                </Dropdown>
                <Button onClick={() => document.querySelector('dialog')?.showModal()}>
                  Abrir modal nativo
                </Button>
              </Space>
              <dialog>
                <p>La cámara debe seguir accesible sobre este modal.</p>
                <form method="dialog">
                  <button>Cerrar</button>
                </form>
              </dialog>
            </main>
          }
        />
        <Route
          path="/qa-tracker"
          element={
            <QaTrackerApp
              {...shared}
              allowedOrigin="https://www.qa-tracker.online"
              storageKey="qa-package-example.external-url"
            />
          }
        />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <ConfigProvider>
    <App>
      <BrowserRouter>
        <Example />
      </BrowserRouter>
    </App>
  </ConfigProvider>,
);
