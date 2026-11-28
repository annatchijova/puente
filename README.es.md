<!-- title -->

# PUENTE

**[English](README.md) · [Español](README.es.md) · [Technical README](TECHNICAL.md)**

## El problema

Un médico escribe:

> *«Hemoglobina 10,2 g/dL. VCM 72 fL. Se solicita perfil férrico para
> ampliar estudio».*

La paciente no tiene idea de qué significa eso, y en tres semanas se va a
sentar frente a otro profesional que nunca vio esta nota — porque llevarla
ahí era su trabajo, y los papeles se pierden. Un resumidor de PDF puede
parafrasear la frase. No puede decirle a la paciente si esa paráfrasis
realmente está respaldada por el documento, ni puede avisarle al próximo
médico que esta orden existió.

## Qué es PUENTE

PUENTE es un expediente clínico compartido para un hospital, con un
traductor integrado. Cada orden, resultado e informe queda atado a la
paciente y visible para quien la está tratando — nadie tiene que llevarlo
entre consultorios. Cada frase que genera el traductor está vinculada a la
parte exacta del documento que la justifica. Si nada en el documento
justifica una afirmación, PUENTE lo señala en vez de inventarla.

## Verlo funcionar

**Entrada** (una nota médica real):

```
Hemoglobina 10,2 g/dL. VCM 72 fL. Se solicita perfil férrico para ampliar estudio.
```

**Salida** (traducción para la paciente, cada frase enlazada a su fragmento fuente):

```
El análisis muestra una cantidad de hemoglobina inferior al valor de
referencia, y glóbulos rojos más pequeños de lo habitual.        [→ fuente: "Hemoglobina 10,2 g/dL. VCM 72 fL."]

El profesional solicitó estudios adicionales para investigar la causa.  [→ fuente: "Se solicita perfil férrico para ampliar estudio."]
```

Si una frase generada no tiene un fragmento que la respalde, PUENTE la
marca como **no justificada** en vez de mostrarla como un hecho — abstenerse
es una salida válida, no una falla.

La dirección inversa también funciona: una paciente que describe sus
síntomas con palabras cotidianas obtiene una nota estructurada para que el
profesional la revise. Nunca se convierte automáticamente en diagnóstico ni
en hallazgo confirmado.

## Por qué no alcanza con resumir el PDF

| Resumidor de PDF / chatbot típico | PUENTE |
|---|---|
| Explica un documento aislado | Relaciona órdenes, resultados, informes y revisiones de distintos profesionales de la misma paciente |
| Puede afirmar algo que la fuente no dice | Cada frase generada cita un fragmento fuente; lo no justificado se señala, no se produce |
| La paciente lleva los papeles entre médicos | El expediente sigue a la paciente — ningún profesional depende de que ella lo transmita |
| Una sola dirección: documento → explicación | Bidireccional — también estructura los síntomas relatados por la paciente en una nota para revisión |
| No queda registro de quién revisó qué | Una segunda opinión se adjunta con su propia autoría y fecha, conservada junto a la original |

## Cómo funciona, en resumen

- **Firebase AI Logic hybrid inference** genera la traducción: Gemini Nano
  corriendo on-device en Chrome cuando está disponible, con fallback a
  la Gemini Developer API en la nube cuando no — la misma función por los dos caminos,
  para demostrar ambos y no solo el de la nube.
- Cada documento se sella al escribirse (hash, autoría, timestamp) en
  **Firestore**, así una frase generada siempre puede rastrearse hasta él.
- El acceso por rol determina que un profesional tratante vea el expediente
  compartido; la paciente puede leer el suyo.

La arquitectura completa, la decisión de lenguaje, y el plan de
construcción por niveles están en el **[Technical README](TECHNICAL.md)**
(en inglés).

## Alcance de esta construcción

Un solo hospital, con pacientes y profesionales ficticios para la demo —
no una red inter-institucional. Ver
[`docs/levels.md`](docs/levels.md) para lo que agrega cada nivel.

## Repositorio

```
puente/
├── web/           # app Next.js: expediente compartido, traducción, Firebase AI Logic
├── docs/          # decisión de lenguaje y plan de niveles
├── TECHNICAL.md   # arquitectura, modelo de datos, límites de autoridad, limitaciones
└── LICENSE        # Apache 2.0
```

## Estado

Los niveles 1 a 6 están construidos y verificados de punta a punta:
expediente compartido con proveniencia, traducción trazable, seguimiento de
órdenes, segunda opinión entre pares, vista del paciente con accesibilidad,
y observabilidad clínica (marcado de contradicciones documentales, un panel
de explicabilidad/proveniencia, y un registro de auditoría a prueba de
manipulación). Ver [`docs/levels.md`](docs/levels.md) para el detalle de
cada nivel. Los datos usados en este repositorio son ficticios.

## Probarlo

```bash
cd web
npm install
cp .env.local.example .env.local   # completar con tu propio proyecto de Firebase
npm run dev
```

## Licencia

Apache License 2.0 — ver [`LICENSE`](LICENSE).
