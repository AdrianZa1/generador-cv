# Asistente CV — servidor proxy GPT

Instrucciones rápidas:

- Copia tu clave OpenAI a un archivo `.env` en la raíz con `OPENAI_API_KEY=sk-...`
- Instala dependencias:

```bash
npm install
```

- Ejecuta el servidor:

```bash
npm start
```

El frontend hace `POST /api/gpt` con `{ prompt, max_tokens }`.

No subas tu `.env` al repositorio.
# generador-cv
