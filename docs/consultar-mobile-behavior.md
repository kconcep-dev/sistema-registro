# Comportamiento de los botones en la vista móvil de Consultar

Durante la investigación del comportamiento de la barra de búsqueda en la vista móvil se identificó que el problema proviene de las reglas responsivas definidas en `css/consultar.css`.

1. En el `@media (max-width: 768px)` todos los botones con la clase `.btn-export` y `.btn-clear-filters` reciben un tamaño fijo de 42px por 42px, quedando sólo el ícono visible en modo compacto.【F:css/consultar.css†L420-L437】
2. Cuando el área de búsqueda se expande (`.controls-area.search-expanded`) el mismo bloque responsivo les establece `width: auto` sin restablecer el `padding` ni volver a mostrar el texto (`.button-label` sigue oculto).【F:css/consultar.css†L438-L456】
3. Debido a que el texto permanece oculto (`display: none`) y no existe `padding`, la anchura «auto» se contrae al ancho del ícono, por lo que los botones de Exportar y Limpiar se ven recortados mientras la barra de búsqueda está visible.【F:css/consultar.css†L420-L456】

En resumen, los botones se encogen al abrir la búsqueda porque el estado `search-expanded` elimina el ancho fijo pero mantiene ocultas las etiquetas, dejando al ícono sin espacio lateral. Para corregirlo habría que restaurar el `padding` y/o mostrar la etiqueta del botón cuando se encuentra expandida la búsqueda en móvil.
