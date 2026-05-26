# Design: configurable-startup-banner

## Contexto

El banner de inicio se renderiza hoy desde `extensions/startup-banner.ts` con arte ASCII y colores RGB hardcodeados. La extensión `extensions/gentle-ai.ts` ya concentra comandos globales de Gentle AI y tiene precedentes de configuración global persistida mediante `GENTLE_PI_CONFIG_HOME` o `~/.pi/gentle-ai`.

Este cambio agrega una preferencia global para elegir una paleta preset de colores, sin rediseñar la animación, sin cambiar los defaults actuales y sin agregar toggles de visibilidad para la rosa o el logo textual.

## Objetivos de diseño

- Mantener exactamente el comportamiento visual por defecto cuando no existe configuración.
- Centralizar defaults, validación y persistencia fuera de las extensiones UI/render.
- Exponer comandos bajo `/gentle:*` y aliases `/gentle-ai:*`.
- Mantener las restricciones existentes de ancho/alto del terminal para la rosa y el logo textual.
- Mantener el cambio implementable dentro de un review budget aproximado de 350 líneas.

## Estructura de configuración

Agregar un módulo compartido pequeño:

```text
lib/banner-config.ts
```

Contrato público sugerido:

```ts
export const BANNER_COLOR_PRESETS = ["pink", "cyan", "yellow", "green"] as const;
export type BannerColorPreset = (typeof BANNER_COLOR_PRESETS)[number];

export interface BannerConfig {
  colorPreset: BannerColorPreset;
}

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  colorPreset: "pink",
};

export function bannerConfigPath(): string;
export function normalizeBannerConfig(value: unknown): BannerConfig;
export function readBannerConfig(): BannerConfig;
export async function readBannerConfigAsync(): Promise<BannerConfig>;
export function writeBannerConfig(config: BannerConfig): void;
export async function writeBannerConfigAsync(config: BannerConfig): Promise<void>;
export function updateBannerConfig(patch: Partial<BannerConfig>): BannerConfig;
export async function updateBannerConfigAsync(patch: Partial<BannerConfig>): Promise<BannerConfig>;
```

Persistencia:

```text
<GENTLE_PI_CONFIG_HOME o ~/.pi/gentle-ai>/banner.json
```

JSON esperado:

```json
{
  "colorPreset": "pink"
}
```

### Validación y defaults

`normalizeBannerConfig` debe ser tolerante:

- Si el archivo no existe, usar `DEFAULT_BANNER_CONFIG`.
- Si el JSON no parsea o no es objeto, usar defaults completos y no lanzar desde el camino de render del banner.
- Si `colorPreset` no es uno de `pink | cyan | yellow | green`, usar `pink`.
- Campos heredados o desconocidos, como antiguos `showRose`/`showTextLogo`, se ignoran.
- Al escribir, normalizar antes de persistir para no propagar valores inválidos.

Tradeoff: no se bloquea el arranque por un archivo inválido. El panel/comandos pueden notificar al usuario si se decide exponer una advertencia, pero el renderer debe ser fail-safe.

## Integración con `startup-banner.ts`

### Lectura

En el handler `session_start`, antes de construir el header, leer configuración normalizada:

```ts
const bannerConfig = readBannerConfig();
```

Se recomienda lectura síncrona porque:

- El render path actual ya usa operaciones síncronas/estado precalculado en startup.
- El archivo es pequeño.
- Evita meter async mutable state dentro del `render(width)`.

Si la lectura falla inesperadamente, el helper debe devolver defaults.

### Composición con layout existente

La configuración solo cambia colores. La visibilidad de la rosa y el logo textual sigue determinada por el modo actual y las restricciones de ancho del renderer.

- En modo `minimal`, mantener el comportamiento existente.
- En layout horizontal, mantener el criterio existente de ancho suficiente.
- En layout vertical/simple, mantener los checks existentes de ancho para logo y rosa.
- El panel de runtime info no cambia por esta feature.

### Paletas

Extraer los RGB hardcodeados a un mapa de paleta local o importado. Para minimizar el cambio, mantener la lógica de animación y solo sustituir valores base.

Contrato sugerido en `startup-banner.ts`:

```ts
type Rgb = readonly [number, number, number];
interface BannerPalette {
  roseBase: Rgb;
  glint: Rgb;
  logoTip: Rgb;
  logoFreshDark: Rgb;
  logoFreshLight: Rgb;
  logoInkDark: Rgb;
  logoInkLight: Rgb;
  label: Rgb;
  value: Rgb;
}
```

Presets iniciales:

- `pink`: valores actuales exactos.
- `cyan`: mismas intensidades aproximadas, hue cyan/teal.
- `yellow`: amber/gold con contraste suficiente.
- `green`: emerald/green con contraste suficiente.

`pink` debe copiar los RGB existentes para preservar defaults:

- rose base: `[255, 118, 195]`
- glint: `[255, 245, 252]`
- logo tip: `[255, 205, 238]`
- logo fresh dark/light: `[110, 36, 70]` / `[255, 138, 206]`
- logo ink dark/light: `[95, 30, 60]` / `[255, 120, 198]`
- label/value: `[200, 100, 160]` / `[255, 140, 210]`

El flash a blanco y sparkle blanco pueden permanecer iguales para no reescribir la animación.

## Estrategia de comandos/UI

Registrar comandos en `extensions/gentle-ai.ts`:

```text
/gentle:banner-color
/gentle-ai:banner-color
```


### Comando rápido

- `/gentle:banner-color`: `ctx.ui.select` con `pink`, `cyan`, `yellow`, `green`; persiste selección.

El alias `/gentle-ai:banner-color` debe llamar al mismo helper para evitar duplicación.

Nota de UX: los cambios afectan futuros renders/sesiones. No es necesario re-renderizar retroactivamente el header ya mostrado; documentarlo en la notificación o README.

## Tests

### Config helper

Agregar tests enfocados:

- `readBannerConfig` devuelve defaults cuando no existe `banner.json`.
- `writeBannerConfig` persiste JSON normalizado en `GENTLE_PI_CONFIG_HOME/banner.json`.
- `normalizeBannerConfig` corrige campos faltantes/incorrectos.
- Preset inválido cae a `pink`.
- Todos los presets soportados son aceptados.
- Campos heredados como `showRose`/`showTextLogo` se ignoran y no se reescriben.

Usar `process.env.GENTLE_PI_CONFIG_HOME` apuntando a un temp dir como ya hace `runtime-harness.mjs` para modelos.

### Runtime harness / comandos

Actualizar `EXPECTED_COMMANDS` en `tests/runtime-harness.mjs` con los dos comandos de color.

Ejercitar comportamiento práctico:

- Configurar `ctx.ui.select` para devolver un preset no-default, invocar `gentle:banner-color` y verificar `colorPreset`.
- Invocar `/gentle-ai:banner-color` para verificar que el alias directo no duplica lógica observable.

### Render smoke opcional

Si el header es difícil de testear sin TUI real, no sobrecargar el cambio. Como mínimo, la config helper y comandos cubren persistencia y contrato. Si se puede aislar una función de render/layout con bajo diff, agregar smoke para confirmar que un color preset no-default llega al renderer sin cambiar la estructura del banner.

## Documentación

Actualizar `README.md` en la sección de comandos/configuración global:

- Comando principal y alias.
- Default: preset `pink` con la rosa y el logo textual existentes.
- Presets disponibles: `pink`, `cyan`, `yellow`, `green`.
- Ruta global: `$GENTLE_PI_CONFIG_HOME/banner.json` o `~/.pi/gentle-ai/banner.json`.
- Cambios aplican a sesiones/renders futuros.
- No hay RGB custom ni arte custom en este cambio.
- No hay toggles de visibilidad para rosa o logo textual en este cambio.

## Migración, compatibilidad y rollback

### Migración

No requiere migración. Usuarios existentes sin `banner.json` conservan el banner actual por defaults.

Si existe un `banner.json` manual inválido o con campos heredados de una rama anterior, se normaliza en lectura y escritura. El renderer no debe fallar ni bloquear Pi.

### Rollback

- Quitar import/uso de `lib/banner-config.ts` en `startup-banner.ts` y volver a colores hardcodeados.
- Quitar registros de comandos y handlers de `extensions/gentle-ai.ts`.
- Quitar tests y README de banner customization.
- Los archivos `banner.json` que queden en home global se pueden ignorar de forma segura.

## Tradeoffs y decisiones

- **Global, no project-local**: consistente con el alcance y con modelo global actual; evita que una preferencia visual dependa del repo.
- **Preset-only**: reduce validación, riesgos de contraste y superficie de UI; custom RGB queda fuera.
- **Sin toggles de visibilidad**: sigue feedback del maintainer y reduce el alcance del PR stack.
- **Sin custom panel**: `ctx.ui.select` mantiene bajo el diff y suficiente para presets.
