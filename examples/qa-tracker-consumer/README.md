# Consumidor de ejemplo

Desde la raíz de este repositorio:

```sh
npm ci
npm run build
cd examples/qa-tracker-consumer
npm ci
npm run dev
```

Abre http://localhost:3011. La dependencia `file:../..` usa la librería local.
`npm run build` comprueba tipos y genera el ejemplo para producción.

Incluye Select, Dropdown y un diálogo nativo para comprobar la captura.
Usa una base independiente `qa-package-example`. No necesita archivos,
variables de entorno ni servicios del proyecto original.

Para validar la distribución, copia este ejemplo fuera del repositorio e instala
el `.tgz` generado con `npm pack` en la raíz en lugar de la dependencia local.
