# QA-TRACKER

Set `mode_debuging=true` in `.env`, then restart Vite or rebuild the deployment.
The default is `false`; only the exact string `true` enables the feature. QA is
available to authenticated users, with a camera button and `/qa-tracker` menu entry.
Disabled builds omit the capture/gallery chunks and do not open the database.

## Capture and storage

Use HTTPS or localhost with a desktop browser supporting `getDisplayMedia`.
Each click asks for permission: select the **current tab**. Screen/window selections
are rejected when the browser reports the surface type. Browsers cannot universally
enforce or verify which tab was selected. The image represents the rendered frame
after permission is granted, not the instant before the picker opened. Native
capture preserves CSS, canvas and overlays better than DOM reconstruction.
Tracks stop immediately after capture or failure; audio is never requested.
The camera hides during capture. Browser-owned sharing indicators cannot be hidden.

PNG blobs and timestamps, dimensions, pathname and view title are stored in native
IndexedDB (`qa-tracker`, version 1). No backend or storage library is required for
this single-store transaction API. Data is shared by sessions on the same origin
and browser profile; it persists until deleted or cleared/evicted by the browser.
Copy requires Clipboard API permission and a secure context. No silent fallback
uploads or DOM capture are performed.

## Reuse

Install `qa-tracker-menu` and import its CSS. Provide
your own routing, translations and notification adapter; no application imports
are used by the core. Render inside your Ant Design theme provider.

### Stand-alone shell

`QaTrackerApp` provides the QA Tracker header and workspace without the host
application's navigation or page chrome. The host remains responsible for
authentication and routing, then passes its adapters and deployment settings:

```tsx
import { QaTrackerApp } from 'qa-tracker-menu';

<QaTrackerApp
  allowedOrigin="https://www.qa-tracker.online"
  databaseName="my-project-qa"
  storageKey="my-project.qa-external-url"
  text={key => translate(`qa.${key}`)}
  notify={(kind, message) => showNotification(kind, message)}
/>;
```

The standalone shell does not read host auth, router, header, or navigation
contexts. Integrations should mount it behind their own access guard and provide
an Ant Design `App`/theme provider plus the translation and notification adapters.

```tsx
import { CaptureButton } from 'qa-tracker-menu';
import { EvidenceGallery } from 'qa-tracker-menu';

const options = {
  databaseName: 'my-project-qa',
  text: (key: string) => translate(`qa.${key}`),
  notify: (kind, message) => showNotification(kind, message),
};

// Guard the lazy imports, routes and mounted components with your build flag.
<CaptureButton {...options} position="top-right" offset={24}
  getContext={() => ({ path: location.pathname, title: document.title })} />
<EvidenceGallery {...options} />
```

`position` supports all four corners; `coordinates` accepts CSS top/right/bottom/left
values instead. `zIndex` defaults to 2147483647. A manual popover lifts the button
into the browser top layer; the portal moves inside an open native modal so it
remains interactive. Without Popover API, the fixed portal covers ordinary overlays
but cannot guarantee precedence over native top-layer UI. Browser chrome is outside
the application's control.

Use a `capture: CaptureAdapter` prop to replace the screenshot backend. It receives
an AbortSignal and returns `{ blob, width, height, createdAt }` with an `image/png`
blob and ISO date. The adapter must release its resources on abort. Use the same
database name for capture and gallery. Message keys are listed in the project's
exported `es` and `en` dictionaries.

Manual acceptance: Chrome and Edge, HTTPS/localhost, scrolled view, open modal and
drawer, native dialog, cancellation, copy/paste into an image-capable application,
reload persistence, individual deletion and delete-all. Desktop permission pickers
require a human interaction; mocked tests do not replace this check.

## External QA panel

The QA scene starts with a 20/80 split: local evidence on a slate-600 background
on the left, the external platform on the right. Drag the Ant Design splitter to
resize the evidence panel between 20% and 30%. Resizing keeps the iframe mounted.
Below 1024px the panels stack, the splitter is hidden, and the iframe uses 70dvh. Each desktop
panel scrolls independently. Copy an image, focus the platform's attachment field
and paste manually. The application does not upload evidence or inspect the
cross-origin document.

```tsx
import { ExternalQaPanel } from 'qa-tracker-menu';

<ExternalQaPanel
  allowedOrigin="https://www.qa-tracker.online"
  storageKey="my-project.qa-external-url"
  text={key => translate(`qa.${key}`)}
/>;
```

Only absolute HTTPS URLs with the exact configured origin and no credentials are
accepted. The project fixes that origin to `https://www.qa-tracker.online`.
Paths, query strings and fragments are retained. Invalid input clears the field,
iframe and stored URL. Paste validates immediately; manual typing validates on
blur, Enter or Load. The last valid URL is saved in sessionStorage and revalidated
on restoration; blocked storage falls back to scene memory. No sample task link
is embedded in the implementation.

The iframe uses `allow-scripts allow-same-origin allow-forms` sandbox permissions
and sends no Referer. Top-window navigation and popup windows are not permitted.
Copying/deleting local evidence does not recreate the iframe. The explicit
Open in another tab link remains available if framing, authentication, third-party
cookies or clipboard handling are restricted by the external platform/browser.
An iframe load event does not prove the platform loaded successfully; no such
success claim is displayed. URL validation applies to submitted/restored URLs,
not to subsequent internal cross-origin navigation, which the parent cannot inspect.

## Movable capture button

The camera is draggable by default, using mouse, touch, or pen. Move at least 5px
to drag; releasing a drag never captures. With focus on the camera, arrow keys
move it 10px; Enter/Space still capture. The button stays inside the viewport,
including after resizing, and cancelled gestures restore their starting location.

The initial location is bottom-right with a 24px offset. Completed moves persist
in localStorage under `${databaseName}.capture-position`; `positionStorageKey`
can override this key. A valid saved location takes precedence over `position`,
`offset`, and `coordinates`. Invalid/unavailable storage falls back to the initial
location; subsequent moves still work in memory if writes fail. Set
`draggable={false}` to use only the configured initial placement and disable
movement/persistence. No host routing or authentication dependencies are needed.

Provide the `moveCapture` translation for pointer/keyboard instructions.

## Capturing open menus and hover states

The camera prevents the primary pointer default so clicking it preserves the
focused input and does not emit compatibility mousedown events that close Ant
Design Select/Dropdown overlays. This does not freeze UI state or prevent the
browser's screen picker from changing focus. Keyboard focus navigation and
hover-only menus may still close transient UI normally.

Use **Shift + click** (or Shift + Enter/Space with the camera focused) for a timed
capture: select the current tab in the browser picker, then reopen the menu or
hover the target within 5 seconds. The delay begins after permission and video
readiness. The camera stays hidden throughout. The host's informational message
should disappear within 5 seconds (the supplied Ant Design adapter uses its
3-second default). Capturing, failure, cancellation and unmount release the stream.

`CaptureAdapter` accepts an optional second argument containing `delayMs` and
`onDelayStart`. Custom adapters must honor these options to support timed capture;
existing single-argument adapters remain compatible for immediate capture. Provide
`delayedCapture` and `captureDelayStarted` translation keys.
