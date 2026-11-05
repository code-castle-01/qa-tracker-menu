# Desarrollo independiente

Este repositorio contiene la librería React `qa-tracker-menu`. No necesita el
proyecto de Enfermedades Raras, sus variables de entorno ni su backend.
Usa Node 22.14 o posterior de la rama 22 (o una versión LTS posterior compatible).

Se recomienda npm 11.6.2 (declarado en packageManager).

## Preparación y validación

```sh
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm run dev` recompila la librería al editar. Cuando cambies tipos públicos,
ejecuta `npm run build` para regenerar las declaraciones.

## Ejecutar el ejemplo

```sh
npm run build
cd examples/qa-tracker-consumer
npm ci
npm run dev
```

Abre http://localhost:3011. El ejemplo consume la librería local mediante `file:../..`.
Para comprobar el artefacto distribuible, ejecuta `npm pack` en la raíz e instala
el archivo `.tgz` generado en una copia externa del ejemplo antes de compilarlo.

Las pruebas usan fake-indexeddb y APIs simuladas. La captura real de pantalla
requiere permisos del navegador y verificación manual en localhost o HTTPS.

## Publicación en npm

Actualiza `version` y CHANGELOG antes de publicar una versión nueva. Comprueba
primero la cuenta y las versiones existentes:

```sh
npm whoami
npm view qa-tracker-menu versions
npm publish --access public
```

`prepublishOnly` ejecuta tipos, pruebas y build; `prepack` regenera el artefacto.
No se puede sobrescribir una versión publicada. El paquete contiene únicamente
`dist`, documentación, licencia, changelog y manifiesto. No guardes credenciales,
archivos `.env` ni capturas en Git.

## Consumidores

Los proyectos consumidores instalan una versión publicada con
`npm install qa-tracker-menu@<version>` y conservan sus propias rutas, permisos,
traducciones y configuración de almacenamiento. Este repositorio no publica
versiones automáticamente ni cambia la integración de otros proyectos.
