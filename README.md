# qa-tracker-menu

Componentes React para capturar evidencias de QA, guardarlas localmente y trabajar
con una plataforma externa. Licencia MIT · CodeCastle.


## Repositorio independiente

El desarrollo de esta librería continúa en https://github.com/code-castle-01/qa-tracker-menu.

```sh
npm ci
npm run typecheck
npm test
npm run build
cd examples/qa-tracker-consumer
npm ci
npm run dev
```

El ejemplo abre en http://localhost:3011. Consulta [la extracción](docs/extraction.md)
y [la guía de desarrollo](docs/publishing.md).
## Instalación

```sh
npm i qa-tracker-menu
```

Requiere React y React DOM 19, Ant Design >=6.6.5 <7 y @ant-design/icons >=6.3.4 <7.
Son `peerDependencies`: se comparten con la aplicación, no se incluyen copias en el
bundle. Si tu proyecto aún no las tiene:

```sh
npm i react@^19 react-dom@^19 antd@^6.6.5 @ant-design/icons@^6.3.4
```

El paquete distribuye ESM y tipos TypeScript. Usa Node >=20.19 para las herramientas.
La UI es para navegador. No depende de Tailwind, Vite, React Router, i18next,
Axios ni React Query en ejecución. Importa su CSS una vez:

```tsx
import 'qa-tracker-menu/styles.css';
```

Instalar el paquete no modifica las rutas ni el menú de tu proyecto. Monta la
cámara en tu layout autorizado y la pantalla QA en la ruta que prefieras.

## Ejemplo completo con React Router

Este ejemplo requiere `react-router-dom`, perteneciente a la aplicación:

```tsx
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { CaptureButton, QaTrackerApp, createQaText } from 'qa-tracker-menu';
import type { QaNotify } from 'qa-tracker-menu';
import 'qa-tracker-menu/styles.css';

function AuthorizedLayout() {
  const { message } = AntApp.useApp();
  const text = createQaText('es');
  const notify: QaNotify = (kind, content) => {
    void message[kind](content, 3);
  };
  const shared = { databaseName: 'my-app-qa', text, notify };

  return (
    <>
      <nav><Link to="/qa-tracker">QA-Tracker</Link></nav>
      <CaptureButton
        {...shared}
        getContext={() => ({ path: location.pathname, title: document.title })}
      />
      <Routes>
        <Route path="/" element={<h1>Mi aplicación</h1>} />
        <Route path="/qa-tracker" element={
          <QaTrackerApp
            {...shared}
            allowedOrigin="https://www.qa-tracker.online"
            storageKey="my-app.qa-external-url"
          />
        } />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <ConfigProvider>
    <AntApp>
      <BrowserRouter><AuthorizedLayout /></BrowserRouter>
    </AntApp>
  </ConfigProvider>,
);
```

`AuthorizedLayout` representa el área que tu aplicación ya protege mediante sus
controles de acceso. El paquete no autentica usuarios ni concede permisos.

## API

| Export | Uso |
| --- | --- |
| `CaptureButton` | Cámara flotante. Requiere `getContext`, `text` y `notify`. |
| `QaTrackerApp` | Pantalla con galería y plataforma externa. Requiere `databaseName`, `storageKey`, `allowedOrigin`, `text` y `notify`. |
| `EvidenceGallery` | Galería independiente; `databaseName` es opcional. Requiere `text` y `notify`. |
| `ExternalQaPanel` | Panel externo independiente; requiere `allowedOrigin`, `storageKey` y `text`. |
| `clearEvidence(databaseName)` | Borra las capturas de la base indicada. Devuelve una promesa. |
| `DEFAULT_DATABASE` | Nombre predeterminado: `qa-tracker`. |
| `createQaText(locale?)` | Traductor sin i18next. Español por defecto; acepta `es`, `en` y variantes como `en-US`. Una clave desconocida devuelve la propia clave. |
| `es`, `en` | Diccionarios exportados para integrarlos en tu traductor. |

También se exportan los tipos de propiedades de los cuatro componentes,
`CaptureContext`, `CaptureImage`, `CaptureOptions`, `CaptureAdapter`, `Evidence`,
`QaNotify`, `QaText` y `QaLocale`.

`qa-tracker-menu/storage` expone las operaciones de almacenamiento sin cargar la
UI; `qa-tracker-menu/locales` expone los diccionarios y el traductor.

### Cámara

| Propiedad opcional | Predeterminado | Comportamiento |
| --- | --- | --- |
| `databaseName` | `qa-tracker` | Debe coincidir con la galería. |
| `position` | `bottom-right` | También acepta `top-left`, `top-right`, `bottom-left`. |
| `offset` | `24` | Margen inicial en píxeles. |
| `coordinates` | — | Coordenadas CSS `top`, `right`, `bottom`, `left`; sustituyen la esquina inicial. |
| `draggable` | `true` | Arrastre y movimiento con flechas, en pasos de 10 px. |
| `positionStorageKey` | `${databaseName}.capture-position` | Ubicación en localStorage; prevalece sobre la posición inicial. |
| `zIndex` | `2147483647` | Orden de apilamiento de respaldo. |
| `capture` | Captura nativa | Adaptador de captura reemplazable. |

El arrastre comienza a los 5 px y no dispara capturas al soltar. La cámara permanece
dentro de la ventana; se reajusta al redimensionar. Si el almacenamiento está
bloqueado, continúa en memoria. Con `draggable={false}` usa solo la posición inicial.

Clic normal captura preservando el foco del elemento activo. **Shift + clic**
(o Shift + Enter/Espacio) permite reabrir un menú o mostrar un tooltip: autoriza la
pestaña y tendrás 5 segundos antes de capturar. La espera empieza después del permiso,
no antes. El aviso informativo debe desaparecer en menos de 5 segundos; el ejemplo
usa 3. La cámara se oculta durante la captura.

### Idioma, tema y adaptadores

Puedes pasar `text={key => t(key, { ns: 'qa-tracker' })}` si usas i18next. Registra
primero `es` y `en` en ese namespace; no necesitas copiar JSON a `/public`.
El `notify` recibe `success`, `error` o `info` y un texto. Mantén las notificaciones
informativas por debajo de 5 segundos para no fotografiar el aviso del temporizador.

Los componentes heredan tu `ConfigProvider`. Los estilos propios están limitados
a clases `qa-*` y usan variables `--qa-tracker-*` y `--qa-button-*`; no cambian el
body, los botones de la aplicación ni requieren un reset global.

Un `CaptureAdapter` recibe `(signal, options?)` y devuelve `{ blob, width, height,
createdAt }` con PNG y fecha ISO. Debe liberar recursos al abortar y respetar
`delayMs`/`onDelayStart` para soportar la captura diferida.

### Activación y cierre de sesión

La bandera de habilitación pertenece al consumidor. Protege tanto la cámara como
la ruta y el enlace del menú. Para excluir la UI de builds deshabilitados, utiliza
imports dinámicos detrás de una constante que tu bundler pueda resolver:

```tsx
const Capture = import.meta.env.VITE_ENABLE_QA === 'true'
  ? lazy(() => import('qa-tracker-menu').then(m => ({ default: m.CaptureButton })))
  : null;
```

Importa `lazy`/`Suspense` de React y monta el componente con sus propiedades dentro
de `Suspense`. Usa el mismo patrón para la pantalla; `enabled={false}` por sí solo
no elimina imports estáticos del bundle. La hoja CSS también puede cargarse dentro
del módulo que importas de forma diferida.

```ts
import { clearEvidence } from 'qa-tracker-menu/storage';
// En el flujo de logout del consumidor, con su manejo habitual de errores:
await clearEvidence('my-app-qa');
```

La limpieza de evidencias no borra la posición de la cámara ni el enlace guardado.

## Almacenamiento y límites

Las imágenes se guardan como `Blob` en IndexedDB nativo, versión 1, almacén
`captures`. **fake-indexeddb solo se usa en pruebas** y no es dependencia de
producción. Las evidencias persisten en el navegador/origen hasta borrarse o ser
eliminadas por el navegador. No hay uploads automáticos ni backend incluido.

La captura requiere HTTPS o localhost y un navegador de escritorio compatible
con `getDisplayMedia`. Selecciona la pestaña actual. Cada captura solicita permiso;
no es posible garantizar universalmente qué pestaña eligió el usuario. El selector
del navegador puede cerrar estados transitorios: utiliza la captura diferida.
La copia requiere Clipboard API y sus permisos.

El panel acepta exclusivamente URLs HTTPS del `allowedOrigin` configurado, sin
credenciales; el enlace se conserva en sessionStorage. La política CSP, las cookies
externas o las cabeceras del destino pueden impedir el iframe; se ofrece abrir en
otra pestaña. No se inspecciona ni se modifica el contenido del sitio externo.

## Desarrollo y publicación

Consulta [la guía de mantenimiento](docs/publishing.md) y los
[detalles de comportamiento](docs/behavior.md). El ejemplo mínimo de consumo en
el repositorio está en `examples/qa-tracker-consumer`.

## Ancho del componente

`QaTrackerApp` ocupa el 100 % del ancho disponible en su contenedor, incluido
el padding (`box-sizing: border-box`), sin un ancho m�ximo propio. Puede usarse
dentro de layouts flex o grid sin imponer un ancho m�nimo por su contenido.

El layout anfitri�n tambi�n debe permitir todo el ancho: elimina `max-width`
o clases como `max-w-[1180px]` del contenedor de la ruta QA. En Tailwind usa
`w-full min-w-0 max-w-none`. La librer�a no modifica los ancestros ni usa
`100vw`, para respetar barras laterales y evitar scroll horizontal.

### Altura de la escena (desde 0.1.3)

`QaTrackerApp` ocupa **100dvh** por defecto (100vh como respaldo), incluyendo
cabecera y padding. No necesita que el contenedor padre tenga una altura definida
ni depende de cuántas imágenes haya en la galería. En escritorio el iframe ocupa
el espacio restante tras los controles y las evidencias tienen scroll independiente.
En pantallas estrechas los paneles se apilan y la escena permite desplazamiento vertical.

Los 100dvh corresponden a la escena QA completa: si el anfitrión añade una cabecera
por encima, la página completa puede superar la altura de la ventana. El paquete
no oculta esa cabecera ni cambia estilos de sus ancestros. La página externa aún
puede tener scroll propio si su contenido supera el área del iframe; no es posible
redimensionar su contenido de otro origen desde QA-Tracker.
