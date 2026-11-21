# PUENTE

Plataforma institucional de continuidad asistencial: traducción clínica
bidireccional y verificable, historial compartido entre profesionales
tratantes de un mismo paciente, y revisión entre pares — construida para el
[Firebase Hybrid AI Hackathon](https://firebasehybridaihackathon.devpost.com/rules).

El paciente deja de ser responsable de transportar órdenes, resultados e
informes entre consultorios. Cada afirmación generada por IA es trazable a un
fragmento concreto del documento original; si el sistema no puede justificar
una explicación, lo señala en vez de inventarla.

Ámbito elegido: **sistema interno de una sola institución** (un hospital,
con profesionales y pacientes ficticios para la demo), no una red
inter-institucional. Esa decisión se puede revisar más adelante si el
problema de identidad/interoperabilidad entre instituciones se vuelve
tratable.

## Por qué "hybrid AI" y no un resumen de PDF

Un lector de PDF resume un documento aislado. PUENTE relaciona órdenes,
resultados, informes y revisiones de distintos profesionales dentro de una
institución, mantiene el historial, y usa **Firebase AI Logic hybrid
inference** (Gemini Nano on-device vía Chrome Built-in AI, con fallback a
Vertex AI en la nube) para generar las traducciones — demostrando
explícitamente el procesamiento local y la transición a la nube que exige
el concurso, no solo "Gemini resume un PDF".

## Decisión de lenguaje

Ver [`docs/language-decision.md`](docs/language-decision.md) para el
registro completo (fuerzas, candidatos rechazados, condición de reapertura).

Resumen: **TypeScript end-to-end** — Next.js (App Router) + Firebase
Functions 2nd gen + Firestore + Firebase AI Logic Web SDK. El hybrid
inference del hackathon solo existe hoy vía el SDK web (Chrome Built-in AI),
lo que fija el frontend en JS/TS; agregar un segundo lenguaje en el backend
no evita ninguna frontera real y cuesta tiempo que no hay en 10 días.

## Niveles

Ver [`docs/levels.md`](docs/levels.md). Construcción por niveles: cada nivel
es un estado coherente y usable del producto, no una capa técnica aislada
(no hay "nivel de seguridad" aparte — los roles y la autoría están desde el
Nivel 1).

1. Expediente compartido con procedencia
2. Traducción clínica trazable
3. Seguimiento de órdenes
4. Revisión entre pares
5. Vista paciente + accesibilidad

## Datos

Todos los pacientes, profesionales, órdenes y resultados usados en la demo
son ficticios, generados para este proyecto.

## Licencia

Apache License 2.0 — ver [`LICENSE`](LICENSE).
