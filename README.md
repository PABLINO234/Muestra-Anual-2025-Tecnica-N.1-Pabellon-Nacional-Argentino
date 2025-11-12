Muestra Institucional — README
=================================

Resumen de cambios realizados
----------------------------
Este proyecto fue actualizado para mejorar la presentación y la interacción del "Cronograma de Actividades".

Principales cambios implementados
- Transformación del horario a una grilla (CSS Grid) con apariencia tipo cronograma.
- Animaciones más visibles y entrada escalonada (stagger) de filas y elementos.
- Colores y tipografías mejoradas (se agregó Google Fonts en `index.html`).
- Interactividad:
  - Filtros por categoría (solo dos categorías: Informática y Automotor).
  - Contador de actividades visibles.
  - Persistencia de filtros en `localStorage` para recordar la selección entre recargas.
- Export:
  - Si la API de imágenes (Google Charts) no puede entregar el QR, se muestra un fallback con
    el JSON del cronograma visible y se permite descargar ese JSON.
- Accesibilidad y usabilidad: roles ARIA básicos, `prefers-reduced-motion` respetado, modal que cierra con Esc o clic fuera.

Archivos importantes
-------------------
- `index.html` — estructura de la página y contenedores principales (`#filters`, `#schedule`).
- `style.css` — estilos, layout responsive y animaciones (mobile-first, media query para desktop).
- `schedule.js` — lógica del cronograma: datos, render, filtros, persistencia y generación de QR.

Cómo editar los datos del cronograma
-----------------------------------
Los datos están embebidos en `schedule.js` (const `schedule`). Cada entrada sigue la forma:

{ time: '9:00 hs', activity: 'Descripción', type: 'informatica' }

Los `type` admitidos son (por ahora):
- `informatica`
- `automotores`
- `general`
- `other`
- `receso` (muestra una fila especial de receso)

Edita las cadenas `time` y `activity` según necesites y guarda el archivo.

Cómo probar localmente
----------------------
Recomendado: servir la carpeta con un servidor local (evita problemas de CORS o fetch al usar file://):

PowerShell (desde la carpeta que contiene `index.html`):

```powershell
python -m http.server 8000
# Abrir en el navegador: http://localhost:8000
```

Qué probar manualmente
- Abrir la página y comprobar que el cronograma aparece.
- Activar/desactivar filtros "Informática" y "Automotor" — la selección debe persistir tras recargar la página.

Notas técnicas y recomendaciones
--------------------------------
- Actualmente el QR se genera usando la API pública de Google Charts (imagen). Si necesitas que la generación
  sea 100% offline (sin llamadas externas), puedo integrar una librería JS pequeña para generar QR en el cliente.
- Si quieres mover los datos a un `schedule.json` externo o a un CMS, puedo adaptar `schedule.js` para hacer `fetch()`.
- Si vas a publicar la página en un servidor con políticas CSP estrictas, confirma que el dominio `chart.googleapis.com`
  esté permitido para imágenes o cambia a un generador local.

Cambios en el código (alta nivel)
---------------------------------
- `schedule.js`:
  - Se añadió persistencia (`localStorage`) para filtros.
  - `renderSchedule()` ahora escribe los valores originales en `data-attributes` de cada fila, y `generateQR()` usa
    esos atributos para construir el payload JSON (evita concatenación de chips con el texto de la actividad).

Si quieres que haga alguno de estos pasos adicionales, dímelo y lo implemento:
- Generación de QR 100% offline (añadir librería local y reemplazar la llamada a Google Charts).
- Mover los datos a `schedule.json` y cargar con `fetch()` (actualmente los datos están embebidos).
- Añadir un pequeño script de test que verifique automáticamente que la renderización produjo filas.

Gracias — dime qué más quieres mejorar o si dejo el README con otro formato más corto.
