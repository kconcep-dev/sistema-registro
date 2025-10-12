// js/consultar.js — vista sesiones + detalle sesiones (equipos) + visitantes

document.addEventListener('DOMContentLoaded', async () => {
  // --- 0) Protección de ruta y carga inicial ---
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // --- 1) Elementos del DOM ---
  const tabsNav = document.querySelector('.tabs-nav');
  const tabContents = document.querySelectorAll('.tab-content');
  const controlAreas = Array.from(document.querySelectorAll('.controls-area[data-controls]'));

  // Visitantes
  const searchVisitantesInput    = document.getElementById('search-visitantes');
  const dateStartVisitantesInput = document.getElementById('date-start-visitantes');
  const dateEndVisitantesInput   = document.getElementById('date-end-visitantes');
  const exportVisitantesBtn      = document.getElementById('export-visitantes-btn');
  const tableVisitantesBody      = document.querySelector('#table-visitantes tbody');

  // Sesiones (lista)
  const searchDescartesInput     = document.getElementById('search-descartes');
  const dateStartDescartesInput  = document.getElementById('date-start-descartes');
  const dateEndDescartesInput    = document.getElementById('date-end-descartes');
  const clearVisitantesBtn       = document.getElementById('clear-visitantes-filters');
  const clearDescartesBtn        = document.getElementById('clear-descartes-filters');
  const tableDescartesBody       = document.querySelector('#table-descartes tbody');

  // Vista detalle de sesión
  const sesionesListaSection     = document.getElementById('sesiones-lista');
  const sesionDetalleSection     = document.getElementById('sesion-detalle');
  const btnVolverSesiones        = document.getElementById('btn-volver-sesiones');
  const detalleTitulo            = document.getElementById('detalle-titulo');
  const detalleUnidad            = document.getElementById('detalle-unidad');
  const detalleSiace             = document.getElementById('detalle-siace');
  const detalleFecha             = document.getElementById('detalle-fecha');
  const detalleTecnico           = document.getElementById('detalle-tecnico');
  const detalleObservacion       = document.getElementById('detalle-observacion');
  const btnToggleDetalles       = document.getElementById('btn-toggle-detalles');
  const detalleExtra            = document.getElementById('detalle-extra');
  const searchEquiposInput       = document.getElementById('search-equipos');
  const tableEquiposSesionBody   = document.querySelector('#table-equipos-sesion tbody');
  const exportSesionDescartesBtn = document.getElementById('export-sesion-descartes-btn');

  // Modales visitantes
  const modalEditarVisitante     = document.getElementById('modal-editar-visitante');
  const formEditarVisitante      = document.getElementById('form-editar-visitante');

  // Modal editar equipo (ids `editq-*`)
  const modalEditarEquipo        = document.getElementById('modal-editar-equipo');
  const formEditarEquipo         = document.getElementById('form-editar-equipo');
  const btnCerrarModalEditarEq   = document.getElementById('btn-cerrar-modal-editar-equipo');
  const btnCancelarEditarEq      = document.getElementById('btn-editar-equipo-cancelar');

  // --- NUEVO: Modal agregar equipo ---
  const btnAgregarEquipo         = document.getElementById('btn-agregar-equipo');
  const modalAgregarEquipo       = document.getElementById('modal-agregar-equipo');
  const formAgregarEquipo        = document.getElementById('form-agregar-equipo');
  const btnCerrarModalAgregarEq  = document.getElementById('btn-cerrar-modal-agregar-equipo');
  const btnCancelarAgregarEq     = document.getElementById('btn-agregar-equipo-cancelar');

  // Contadores
  const visitantesTotalEl        = document.getElementById('visitantes-total');
  const sesionesTotalEl          = document.getElementById('sesiones-total');
  const equiposTotalEl           = document.getElementById('equipos-total');

  // Modal editar sesión
  const modalEditarSesion        = document.getElementById('modal-editar-sesion');
  const formEditarSesion         = document.getElementById('form-editar-sesion');
  const btnCerrarModalEditarSes  = document.getElementById('btn-cerrar-modal-editar-sesion');
  const btnCancelarEditarSesion  = document.getElementById('btn-editar-sesion-cancelar');
  const editSesionUnidadInput    = document.getElementById('edit-sesion-unidad');
  const editSesionSiaceInput     = document.getElementById('edit-sesion-siace');
  const editSesionFechaInput     = document.getElementById('edit-sesion-fecha');
  const editSesionTecnicoInput   = document.getElementById('edit-sesion-tecnico');
  const editSesionObservacionInput = document.getElementById('edit-sesion-observacion');

  // Toast
  const toastEl        = document.getElementById('toast-notification');
  const toastMessageEl = document.getElementById('toast-message');

  // --- 2) Estado ---
  let currentVisitorData    = [];
  let currentDescartesData  = [];
  let currentEquiposData    = [];
  let editingVisitorId      = null;
  let editingEquipoId       = null;
  let editingSessionId      = null;
  let currentSessionId      = null;
  let currentSessionEquiposTotal = 0;
  let currentSessionData         = null;
  let scanbotInstance;
  let activeBarcodeScanner;
  let searchDebounceTimeout;
  let toastTimeout;

  function collapseSearchArea(area) {
    if (!area || !area.classList.contains('search-expanded')) return;
    area.classList.remove('search-expanded');
    const toggle = area.querySelector('.search-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  function expandSearchArea(area) {
    if (!area || area.classList.contains('search-expanded')) return;
    area.classList.add('search-expanded');
    const toggle = area.querySelector('.search-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    const input = area.querySelector('.search-field input[type="search"]');
    if (input) {
      requestAnimationFrame(() => input.focus());
    }
  }

  function toggleSearchArea(area) {
    if (!area) return;
    if (area.classList.contains('search-expanded')) {
      collapseSearchArea(area);
      return;
    }
    controlAreas.forEach(other => {
      if (other !== area) {
        collapseSearchArea(other);
      }
    });
    expandSearchArea(area);
  }

  function collapseAllSearchAreas() {
    controlAreas.forEach(collapseSearchArea);
  }

  function setupResponsiveControls() {
    if (!controlAreas.length) return;

    controlAreas.forEach(area => {
      const toggle = area.querySelector('.search-toggle');
      const input = area.querySelector('.search-field input[type="search"]');
      if (!toggle || !input) return;

      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleSearchArea(area);
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          collapseSearchArea(area);
          input.blur();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (controlAreas.some(area => area.contains(event.target))) {
        return;
      }
      collapseAllSearchAreas();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        collapseAllSearchAreas();
      }
    });
  }

  // --- 3) Utilidades ---
  function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toastMessageEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    toastTimeout = setTimeout(() => {
      toastEl.className = toastEl.className.replace('show', '');
    }, 3000);
  }

  // Cache del logo para exportación
  let cachedLogoMeducaBase64;
  let cachedLogoMeducaDimensions;

  async function getLogoMeducaBase64() {
    if (cachedLogoMeducaBase64 !== undefined) {
      return cachedLogoMeducaBase64;
    }

    try {
      const response = await fetch('assets/images/logo_meduca.png');
      if (!response.ok) {
        throw new Error(`Respuesta ${response.status}`);
      }

      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Resultado inesperado al leer la imagen.'));
            return;
          }
          const [, data = ''] = result.split(',');
          resolve(data);
        };
        reader.onerror = () => reject(new Error('No se pudo convertir la imagen a base64.'));
        reader.readAsDataURL(blob);
      });

      cachedLogoMeducaBase64 = base64;
    } catch (error) {
      console.error('No se pudo cargar el logo del MEDUCA.', error);
      cachedLogoMeducaBase64 = null;
    }

    return cachedLogoMeducaBase64;
  }

  async function getLogoMeducaDimensions() {
    if (cachedLogoMeducaDimensions !== undefined) {
      return cachedLogoMeducaDimensions;
    }

    const base64 = await getLogoMeducaBase64();
    if (!base64) {
      cachedLogoMeducaDimensions = null;
      return cachedLogoMeducaDimensions;
    }

    try {
      cachedLogoMeducaDimensions = await getImageDimensionsFromBase64(base64);
    } catch (error) {
      console.error('No se pudieron obtener las dimensiones del logo del MEDUCA.', error);
      cachedLogoMeducaDimensions = null;
    }

    return cachedLogoMeducaDimensions;
  }

  function getImageDimensionsFromBase64(base64) {
    return new Promise((resolve, reject) => {
      if (!base64) {
        reject(new Error('No hay datos base64 para la imagen.'));
        return;
      }

      if (typeof Image === 'undefined') {
        reject(new Error('La API Image no está disponible en este entorno.'));
        return;
      }

      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) {
          reject(new Error('Dimensiones inválidas para la imagen.'));
          return;
        }
        resolve({ width, height });
      };
      image.onerror = () => {
        reject(new Error('Error al cargar la imagen base64.'));
      };
      image.src = `data:image/png;base64,${base64}`;
    });
  }

  function columnWidthToPixels(width) {
    if (typeof width !== 'number' || Number.isNaN(width)) {
      return 0;
    }

    if (width <= 0) {
      return 0;
    }

    const pixels = Math.floor(((256 * width + Math.floor(128 / 7)) / 256) * 7);
    return pixels > 0 ? pixels : 0;
  }

  function rowHeightToPixels(height) {
    const points = (typeof height === 'number' && !Number.isNaN(height) && height > 0) ? height : 15;
    return Math.floor(points * (96 / 72));
  }

  function getWorksheetColumnWidthPixels(worksheet, columnNumber) {
    const column = worksheet.getColumn(columnNumber);
    const width = (column && typeof column.width === 'number' && !Number.isNaN(column.width)) ? column.width : 8.43;
    return columnWidthToPixels(width);
  }

  function getWorksheetRowHeightPixels(worksheet, rowNumber) {
    const row = worksheet.getRow(rowNumber);
    const height = (row && typeof row.height === 'number' && !Number.isNaN(row.height)) ? row.height : 15;
    return rowHeightToPixels(height);
  }

  function getAvailableSpaceWithinBounds(worksheet, bounds) {
    if (!bounds) return null;
    const { startCol, endCol, startRow, endRow } = bounds;

    let availableWidth = 0;
    for (let columnNumber = startCol; columnNumber <= endCol; columnNumber++) {
      availableWidth += getWorksheetColumnWidthPixels(worksheet, columnNumber);
    }

    let availableHeight = 0;
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
      availableHeight += getWorksheetRowHeightPixels(worksheet, rowNumber);
    }

    if (!availableWidth || !availableHeight) {
      return null;
    }

    return { width: availableWidth, height: availableHeight };
  }

  function calculateImageSizeWithinBounds(worksheet, bounds, imageSize) {
    if (!imageSize?.width || !imageSize?.height) {
      return null;
    }

    const availableSpace = getAvailableSpaceWithinBounds(worksheet, bounds);
    if (!availableSpace) {
      return null;
    }

    const widthRatio = availableSpace.width / imageSize.width;
    const heightRatio = availableSpace.height / imageSize.height;
    const scale = Math.min(widthRatio, heightRatio, 1);

    return {
      width: Math.max(1, Math.floor(imageSize.width * scale)),
      height: Math.max(1, Math.floor(imageSize.height * scale))
    };
  }

  function calculateOffsetCoordinate(getSizeFn, startIndex, endIndex, pixelOffset) {
    let remaining = Math.max(0, pixelOffset);
    let currentIndex = startIndex;

    while (currentIndex <= endIndex) {
      const size = getSizeFn(currentIndex);
      const safeSize = size > 0 ? size : 1;

      if (remaining <= 0) {
        return currentIndex - 1;
      }

      if (remaining < safeSize) {
        return (currentIndex - 1) + (remaining / safeSize);
      }

      remaining -= safeSize;
      currentIndex++;
    }

    return endIndex - 1;
  }

  function calculateImagePlacementWithinBounds(worksheet, bounds, imageSize) {
    if (!imageSize?.width || !imageSize?.height) {
      return null;
    }

    const availableSpace = getAvailableSpaceWithinBounds(worksheet, bounds);
    if (!availableSpace) {
      return null;
    }

    // Alinear el logo con el borde derecho del rango disponible
    const horizontalOffset = Math.max(0, availableSpace.width - imageSize.width);
    const verticalOffset = Math.max(0, (availableSpace.height - imageSize.height) / 2);

    const columnCoordinate = calculateOffsetCoordinate(
      (columnNumber) => getWorksheetColumnWidthPixels(worksheet, columnNumber),
      bounds.startCol,
      bounds.endCol,
      horizontalOffset
    );

    const rowCoordinate = calculateOffsetCoordinate(
      (rowNumber) => getWorksheetRowHeightPixels(worksheet, rowNumber),
      bounds.startRow,
      bounds.endRow,
      verticalOffset
    );

    if (!Number.isFinite(columnCoordinate) || !Number.isFinite(rowCoordinate)) {
      return null;
    }

    return {
      tl: { col: columnCoordinate, row: rowCoordinate },
      ext: imageSize
    };
  }

  // dd-mm-aaaa
  function formatDate(isoString) {
    if (!isoString) return '-';
    const [y, m, d] = isoString.includes('T')
      ? (new Date(isoString).toISOString().slice(0,10).split('-'))
      : isoString.split('-');
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  }

  // hora 12h AM/PM
  function formatTime(isoString) {
    if (!isoString) return '-';
    const timePart = isoString.split('T')[1] ? isoString : `1970-01-01T${isoString}`;
    const date = new Date(timePart);
    return new Intl.DateTimeFormat('es-PA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  function sanitizeForFilename(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-_. ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      || 'Sesion';
  }

  function updateMobileDetailsToggle(isOpen = false) {
    if (!btnToggleDetalles || !detalleExtra) return;
    detalleExtra.classList.toggle('open', isOpen);
    btnToggleDetalles.dataset.expanded = isOpen ? 'true' : 'false';
    btnToggleDetalles.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    const iconSpan = btnToggleDetalles.querySelector('.icon');
    const labelSpan = btnToggleDetalles.querySelector('.button-label');

    if (iconSpan) {
      iconSpan.classList.toggle('icon-arrow-down', !isOpen);
      iconSpan.classList.toggle('icon-arrow-up', isOpen);
    }

    if (labelSpan) {
      labelSpan.textContent = isOpen ? 'Ocultar detalles' : 'Ver más detalles';
    }
  }

  function pluralize(count, singular, plural = `${singular}s`) {
    const label = count === 1 ? singular : plural;
    return `${count} ${label}`;
  }

  function updateVisitantesTotal(count) {
    if (!visitantesTotalEl) return;
    visitantesTotalEl.textContent = pluralize(count, 'registro');
  }

  function updateSesionesTotal(count) {
    if (!sesionesTotalEl) return;
    sesionesTotalEl.textContent = pluralize(count, 'sesión', 'sesiones');
  }

  function updateEquiposTotalBadge(visibleCount = currentEquiposData.length) {
    if (!equiposTotalEl) return;

    if (!currentSessionId) {
      const base = currentSessionEquiposTotal || visibleCount || 0;
      equiposTotalEl.textContent = pluralize(base, 'equipo');
      return;
    }

    const total = typeof currentSessionEquiposTotal === 'number'
      ? currentSessionEquiposTotal
      : visibleCount;

    if (!total && !visibleCount) {
      equiposTotalEl.textContent = '0 equipos';
      return;
    }

    if (total && total !== visibleCount) {
      const totalLabel = pluralize(total, 'equipo');
      equiposTotalEl.textContent = `${visibleCount} de ${totalLabel}`;
    } else {
      const base = total || visibleCount || 0;
      equiposTotalEl.textContent = pluralize(base, 'equipo');
    }
  }

  function formatDateForFilter(value) {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  function updateDateFieldVisual(input) {
    if (!input) return;
    const wrapper = input.closest('.date-field');
    if (!wrapper) return;
    const displayTextEl = wrapper.querySelector('.date-display__text');
    const hasValue = Boolean(input.value);
    wrapper.dataset.empty = hasValue ? 'false' : 'true';
    if (displayTextEl) {
      displayTextEl.textContent = hasValue ? formatDateForFilter(input.value) : '';
    }
  }

  function setupDateFilterGroup({ startInput, endInput, clearButton, onChange }) {
    const inputs = [startInput, endInput].filter(Boolean);
    if (!inputs.length && !clearButton) return;

    const updateState = () => {
      inputs.forEach(updateDateFieldVisual);
      if (clearButton) {
        const hasAnyValue = inputs.some(input => Boolean(input.value));
        clearButton.hidden = !hasAnyValue;
      }
    };

    const handleChange = () => {
      updateState();
      if (typeof onChange === 'function') onChange();
    };

    inputs.forEach(input => {
      input.addEventListener('input', updateState);
      input.addEventListener('change', handleChange);
      updateDateFieldVisual(input);
    });

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        inputs.forEach(input => {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        updateState();
        if (typeof onChange === 'function') onChange();
        clearButton.blur();
      });
    }

    updateState();
  }

  function removeActiveScanner() {
    if (activeBarcodeScanner) {
      try {
        activeBarcodeScanner.dispose();
      } catch (error) {
        console.error('Error al detener el escáner:', error);
      }
      activeBarcodeScanner = null;
    }
    const container = document.getElementById('scanner-container');
    if (container) {
      container.remove();
    }
  }

  async function ensureScanbotInstance() {
    if (scanbotInstance) return scanbotInstance;
    if (typeof ScanbotSDK === 'undefined') {
      showToast('El módulo de escáner no está disponible.', 'error');
      return null;
    }
    try {
      scanbotInstance = await ScanbotSDK.initialize({
        licenseKey: '',
        enginePath: 'js/scanbot/'
      });
      return scanbotInstance;
    } catch (error) {
      console.error('Error al inicializar Scanbot SDK:', error);
      showToast('No se pudo iniciar el escáner.', 'error');
      scanbotInstance = null;
      return null;
    }
  }

  function setupScannerButtons() {
    const scannerButtons = document.querySelectorAll('.btn-scan');
    if (!scannerButtons.length) return;

    scannerButtons.forEach(button => {
      if (button.dataset.scannerBound === 'true') return;
      button.dataset.scannerBound = 'true';

      button.addEventListener('click', async () => {
        if (activeBarcodeScanner) return;

        const targetId = button.dataset.targetInput;
        const targetInput = targetId ? document.getElementById(targetId) : null;
        if (!targetInput) {
          showToast('No se encontró el campo para escanear.', 'error');
          return;
        }

        showToast('Iniciando cámara...', 'success');

        try {
          const sdk = await ensureScanbotInstance();
          if (!sdk) return;

          const barcodeScannerConfig = {
            containerId: 'scanner-container',
            onBarcodesDetected: (result) => {
              if (!result.barcodes?.length) return;
              const scannedValue = result.barcodes[0].text;
              targetInput.value = scannedValue;
              targetInput.dispatchEvent(new Event('input', { bubbles: true }));
              targetInput.dispatchEvent(new Event('change', { bubbles: true }));
              removeActiveScanner();
              showToast('Código escaneado con éxito.', 'success');
            },
            onError: (error) => {
              console.error('Error del escáner:', error);
              showToast('Error al escanear.', 'error');
              removeActiveScanner();
            },
            text: {
              scanningHint: 'Apunte al código de barras del equipo'
            }
          };

          let scannerContainer = document.getElementById('scanner-container');
          if (!scannerContainer) {
            scannerContainer = document.createElement('div');
            scannerContainer.id = 'scanner-container';
            scannerContainer.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; z-index:1000;';
            document.body.appendChild(scannerContainer);
          }

          activeBarcodeScanner = await sdk.createBarcodeScanner(barcodeScannerConfig);
        } catch (error) {
          console.error('Error al inicializar el escáner:', error);
          showToast('No se pudo iniciar el escáner.', 'error');
          removeActiveScanner();
        }
      });
    });
  }

  // --- 4) Datos y render ---

  // Visitantes
  async function fetchVisitantes() {
    const searchTerm = searchVisitantesInput?.value.trim() || '';
    const startDate  = dateStartVisitantesInput?.value || '';
    const endDate    = dateEndVisitantesInput?.value || '';

    let query = supabaseClient
      .from('visitantes')
      .select('*')
      .order('id', { ascending: false });

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%`);
    }
    if (startDate) query = query.gte('fecha', startDate);
    if (endDate)   query = query.lte('fecha', endDate);

    const { data, error } = await query;
    if (error) {
      showToast('Error al cargar los visitantes.', 'error');
      console.error(error);
      updateVisitantesTotal(0);
      return;
    }
    currentVisitorData = data || [];
    renderVisitantesTable(currentVisitorData);
  }

  function renderVisitantesTable(data) {
    if (!tableVisitantesBody) return;
    updateVisitantesTotal(data.length);
    tableVisitantesBody.innerHTML = '';
    if (!data.length) {
      tableVisitantesBody.innerHTML = '<tr><td colspan="7">No se encontraron registros.</td></tr>';
      return;
    }
    data.forEach(visitor => {
      const tr = document.createElement('tr');
      tr.dataset.id = visitor.id;
      tr.innerHTML = `
        <td>${visitor.nombre}</td>
        <td>${visitor.apellido}</td>
        <td>${visitor.cedula}</td>
        <td>${visitor.motivo}</td>
        <td>${formatDate(visitor.fecha)}</td>
        <td>${formatTime(visitor.hora)}</td>
        <td class="table-actions">
          <button class="btn-editar button-with-icon" data-id="${visitor.id}" aria-label="Editar visitante" title="Editar visitante">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar button-with-icon" data-id="${visitor.id}" aria-label="Eliminar visitante" title="Eliminar visitante">
            <span class="icon icon--sm icon-trash" aria-hidden="true"></span>
            <span class="button-label">Eliminar</span>
          </button>
        </td>
      `;
      tableVisitantesBody.appendChild(tr);
    });
  }

  // Sesiones (lista)
  async function fetchDescartes() {
    const searchTerm = searchDescartesInput?.value.trim() || '';
    const startDate  = dateStartDescartesInput?.value || '';
    const endDate    = dateEndDescartesInput?.value || '';

    let query = supabaseClient
      .from('descartes_sesiones')
      .select(`id, user_id, unidad_administrativa, fecha, tecnico_encargado, observacion, codigo_siace, equipos_descartados(count)`)
      .order('id', { ascending: false });

    if (searchTerm) {
      query = query.or(`unidad_administrativa.ilike.%${searchTerm}%,codigo_siace.ilike.%${searchTerm}%`);
    }
    if (startDate) query = query.gte('fecha', startDate);
    if (endDate)   query = query.lte('fecha', endDate);

    const { data, error } = await query;
    if (error) {
      showToast('Error al cargar las sesiones de descarte.', 'error');
      console.error(error);
      updateSesionesTotal(0);
      return;
    }
    currentDescartesData = data || [];
    renderDescartesTable(currentDescartesData);
  }

  function renderDescartesTable(data) {
    if (!tableDescartesBody) return;
    updateSesionesTotal(data.length);
    tableDescartesBody.innerHTML = '';
    if (!data.length) {
      tableDescartesBody.innerHTML = '<tr><td colspan="7">No se encontraron sesiones.</td></tr>';
      return;
    }
    data.forEach(session => {
      const count = session.equipos_descartados?.[0]?.count ?? 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${session.unidad_administrativa || '-'}</td>
        <td>${session.codigo_siace || '-'}</td>
        <td>${formatDate(session.fecha)}</td>
        <td>${session.tecnico_encargado || '-'}</td>
        <td>${session.observacion || '-'}</td>
        <td>${count}</td>
        <td class="table-actions">
          <button class="btn-view-equipos button-with-icon" data-id="${session.id}" aria-label="Abrir sesión" title="Abrir sesión">
            <span class="icon icon--sm icon-open" aria-hidden="true"></span>
            <span class="button-label">Abrir</span>
          </button>
          <button class="btn-editar btn-editar-sesion button-with-icon" data-id="${session.id}" aria-label="Editar sesión" title="Editar sesión">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar-sesion button-with-icon" data-id="${session.id}" aria-label="Eliminar sesión" title="Eliminar sesión">
            <span class="icon icon--sm icon-trash" aria-hidden="true"></span>
            <span class="button-label">Eliminar</span>
          </button>
        </td>
      `;
      tableDescartesBody.appendChild(tr);
    });
  }

  // Equipos por sesión
  async function fetchEquiposBySession(sessionId, searchTerm = '') {
    let query = supabaseClient
      .from('equipos_descartados')
      .select('*')
      .eq('sesion_id', sessionId)
      .order('created_at', { ascending: true });

    if (searchTerm) {
      const t = searchTerm;
      query = query.or(
        [
          `descripcion.ilike.%${t}%`,
          `marbete.ilike.%${t}%`,
          `serie.ilike.%${t}%`,
          `marca.ilike.%${t}%`,
          `modelo.ilike.%${t}%`,
          `estado_equipo.ilike.%${t}%`,
          `motivo_descarte.ilike.%${t}%`
        ].join(',')
      );
    }

    const { data, error } = await query;
    if (error) {
      showToast('Error al cargar equipos de la sesión.', 'error');
      console.error(error);
      return [];
    }
    return data || [];
  }

  async function refreshSessionEquiposTotal(sessionId) {
    if (!sessionId) {
      currentSessionEquiposTotal = 0;
      return;
    }

    const { count, error } = await supabaseClient
      .from('equipos_descartados')
      .select('*', { count: 'exact', head: true })
      .eq('sesion_id', sessionId);

    if (error) {
      console.error('No se pudo obtener el total de equipos de la sesión.', error);
      return;
    }

    currentSessionEquiposTotal = count || 0;
  }

  function renderEquiposTable(equipos) {
    if (!tableEquiposSesionBody) return;
    tableEquiposSesionBody.innerHTML = '';
    if (!equipos.length) {
      tableEquiposSesionBody.innerHTML = '<tr><td colspan="9">No hay equipos en esta sesión.</td></tr>';
      updateEquiposTotalBadge(0);
      return;
    }
    equipos.forEach((eq, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${eq.descripcion || '-'}</td>
        <td>${eq.marbete || '-'}</td>
        <td>${eq.serie || '-'}</td>
        <td>${eq.marca || '-'}</td>
        <td>${eq.modelo || '-'}</td>
        <td>${eq.estado_equipo || '-'}</td>
        <td>${eq.motivo_descarte || '-'}</td>
        <td class="table-actions">
          <button class="btn-editar button-with-icon" data-id="${eq.id}" aria-label="Editar equipo" title="Editar equipo">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar button-with-icon" data-id="${eq.id}" aria-label="Eliminar equipo" title="Eliminar equipo">
            <span class="icon icon--sm icon-trash" aria-hidden="true"></span>
            <span class="button-label">Eliminar</span>
          </button>
        </td>
      `;
      tableEquiposSesionBody.appendChild(tr);
    });
    updateEquiposTotalBadge(equipos.length);
  }

  async function openSessionDetail(sessionId) {
    const parsedId = Number(sessionId);
    const sessionKey = Number.isNaN(parsedId) ? sessionId : parsedId;
    currentSessionId = sessionKey;

    const { data: sesion, error } = await supabaseClient
      .from('descartes_sesiones')
      .select('id, unidad_administrativa, codigo_siace, fecha, tecnico_encargado, observacion')
      .eq('id', sessionKey)
      .single();

    if (error || !sesion) {
      showToast('No se pudo abrir la sesión.', 'error');
      return;
    }

    currentSessionData = sesion;

    if (detalleTitulo)      detalleTitulo.textContent      = `Sesión #${sesion.id}`;
    if (detalleUnidad)      detalleUnidad.textContent      = sesion.unidad_administrativa || '-';
    if (detalleSiace)       detalleSiace.textContent       = sesion.codigo_siace || '-';
    if (detalleFecha)       detalleFecha.textContent       = formatDate(sesion.fecha);
    if (detalleTecnico)     detalleTecnico.textContent     = sesion.tecnico_encargado || '-';
    if (detalleObservacion) detalleObservacion.textContent = sesion.observacion || '—';

    if (sesionesListaSection) sesionesListaSection.style.display = 'none';
    if (sesionDetalleSection) sesionDetalleSection.style.display = 'block';
    collapseAllSearchAreas();
    if (tabsNav) tabsNav.classList.add('is-hidden-mobile');

    updateMobileDetailsToggle(false);

    await refreshSessionEquiposTotal(sessionKey);
    const term = searchEquiposInput?.value.trim() || '';
    currentEquiposData = await fetchEquiposBySession(sessionKey, term);
    renderEquiposTable(currentEquiposData);
  }

  function closeSessionDetail() {
    currentSessionId   = null;
    currentEquiposData = [];
    currentSessionEquiposTotal = 0;
    currentSessionData = null;
    if (searchEquiposInput) searchEquiposInput.value = '';
    if (sesionDetalleSection) sesionDetalleSection.style.display = 'none';
    if (sesionesListaSection) sesionesListaSection.style.display = 'block';
    updateEquiposTotalBadge(0);
    updateMobileDetailsToggle(false);
    collapseAllSearchAreas();
    if (tabsNav) tabsNav.classList.remove('is-hidden-mobile');
  }

  updateVisitantesTotal(0);
  updateSesionesTotal(0);
  updateEquiposTotalBadge(0);
  setupResponsiveControls();
  setupDateFilterGroup({
    startInput: dateStartVisitantesInput,
    endInput: dateEndVisitantesInput,
    clearButton: clearVisitantesBtn,
    onChange: fetchVisitantes
  });

  setupDateFilterGroup({
    startInput: dateStartDescartesInput,
    endInput: dateEndDescartesInput,
    clearButton: clearDescartesBtn,
    onChange: fetchDescartes
  });

  setupScannerButtons();
  window.addEventListener('beforeunload', removeActiveScanner);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.modal-close-btn, [data-close-modal], [data-close-confirm], .modal-cancel-btn')) {
      removeActiveScanner();
    }
  });

  // --- 5) Eventos ---

  // Tabs
  if (tabsNav) {
    tabsNav.addEventListener('click', (e) => {
      const button = e.target.closest('.tab-btn');
      if (!button) return;
      const tabId = button.dataset.tab;

      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      button.classList.add('active');

      tabContents.forEach(c => c.classList.toggle('active', c.id === `${tabId}-content`));

      closeSessionDetail();
      collapseAllSearchAreas();

      if (tabId === 'visitantes') fetchVisitantes();
      if (tabId === 'descartes') fetchDescartes();
    });
  }

  // Filtros visitantes
  if (searchVisitantesInput) {
    searchVisitantesInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(fetchVisitantes, 300);
    });
  }
  // Filtros sesiones
  if (searchDescartesInput) {
    searchDescartesInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(fetchDescartes, 300);
    });
  }

  // Acciones tabla visitantes
  if (tableVisitantesBody) {
    tableVisitantesBody.addEventListener('click', async (e) => {
      const target = e.target;
      const visitorId = target.dataset.id;

      if (target.classList.contains('btn-eliminar')) {
        const confirmed = await window.showConfirmationModal(
          'Eliminar Visitante',
          '¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.'
        );
        if (confirmed) {
          const { error } = await supabaseClient.from('visitantes').delete().eq('id', visitorId);
          if (error) {
            showToast('Error al eliminar el registro.', 'error');
          } else {
            showToast('Registro eliminado con éxito.', 'success');
            fetchVisitantes();
          }
        }
      }

      if (target.classList.contains('btn-editar')) {
        const { data, error } = await supabaseClient
          .from('visitantes')
          .select('*')
          .eq('id', visitorId)
          .single();

        if (error || !data) {
          showToast('No se pudieron cargar los datos del visitante.', 'error');
          return;
        }
        editingVisitorId = data.id;
        document.getElementById('edit-nombre').value   = data.nombre || '';
        document.getElementById('edit-apellido').value = data.apellido || '';
        document.getElementById('edit-cedula').value   = data.cedula || '';
        document.getElementById('edit-sexo').value     = data.sexo || '';
        document.getElementById('edit-motivo').value   = data.motivo || '';
        modalEditarVisitante?.classList.add('visible');
      }
    });
  }

  if (formEditarVisitante) {
    formEditarVisitante.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        nombre:   document.getElementById('edit-nombre').value,
        apellido: document.getElementById('edit-apellido').value,
        cedula:   document.getElementById('edit-cedula').value,
        sexo:     document.getElementById('edit-sexo').value,
        motivo:   document.getElementById('edit-motivo').value
      };

      const { error } = await supabaseClient
        .from('visitantes')
        .update(updatedData)
        .eq('id', editingVisitorId);

      if (error) {
        showToast('Error al guardar los cambios.', 'error');
      } else {
        showToast('Visitante actualizado con éxito.', 'success');
        modalEditarVisitante?.classList.remove('visible');
        fetchVisitantes();
      }
      editingVisitorId = null;
    });
  }

  if (formEditarSesion) {
    formEditarSesion.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editingSessionId) {
        showToast('No hay sesión seleccionada.', 'error');
        return;
      }

      const unidad = editSesionUnidadInput?.value.trim() || '';
      const siace = editSesionSiaceInput?.value.trim() || '';
      const fecha = editSesionFechaInput?.value || '';
      const tecnico = editSesionTecnicoInput?.value.trim() || '';
      const observacion = editSesionObservacionInput?.value.trim() || '';

      if (!unidad || !fecha) {
        showToast('Completa los campos de Unidad y Fecha.', 'error');
        return;
      }

      const payload = {
        unidad_administrativa: unidad,
        codigo_siace: siace || null,
        fecha,
        tecnico_encargado: tecnico || null,
        observacion: observacion || null,
      };

      const { error } = await supabaseClient
        .from('descartes_sesiones')
        .update(payload)
        .eq('id', editingSessionId);

      if (error) {
        console.error(error);
        showToast('No se pudo actualizar la sesión.', 'error');
        return;
      }

      showToast('Sesión actualizada con éxito.', 'success');
      modalEditarSesion?.classList.remove('visible');

      await fetchDescartes();

      if (currentSessionId && Number(currentSessionId) === editingSessionId) {
        await openSessionDetail(currentSessionId);
      }

      editingSessionId = null;
    });
  }

  // Acciones tabla sesiones
  if (tableDescartesBody) {
    tableDescartesBody.addEventListener('click', async (e) => {
      const btnOpen = e.target.closest('.btn-view-equipos');
      const btnDel  = e.target.closest('.btn-eliminar-sesion');
      const btnEdit = e.target.closest('.btn-editar-sesion');

      if (btnOpen) {
        const sessionId = btnOpen.dataset.id;
        await openSessionDetail(sessionId);
        return;
      }

      if (btnEdit) {
        const sessionId = Number(btnEdit.dataset.id);
        let sessionData = currentDescartesData.find(s => s.id === sessionId);

        if (!sessionData) {
          const { data, error } = await supabaseClient
            .from('descartes_sesiones')
            .select('id, unidad_administrativa, codigo_siace, fecha, tecnico_encargado, observacion')
            .eq('id', sessionId)
            .single();

          if (error || !data) {
            showToast('No se pudieron cargar los datos de la sesión.', 'error');
            return;
          }
          sessionData = data;
        }

        if (!modalEditarSesion || !formEditarSesion) {
          showToast('El formulario de edición de sesión no está disponible.', 'error');
          return;
        }

        editingSessionId = sessionId;
        if (editSesionUnidadInput)    editSesionUnidadInput.value    = sessionData.unidad_administrativa || '';
        if (editSesionSiaceInput)     editSesionSiaceInput.value     = sessionData.codigo_siace || '';
        if (editSesionFechaInput)     editSesionFechaInput.value     = sessionData.fecha || '';
        if (editSesionTecnicoInput)   editSesionTecnicoInput.value   = sessionData.tecnico_encargado || '';
        if (editSesionObservacionInput) editSesionObservacionInput.value = sessionData.observacion || '';

        modalEditarSesion.classList.add('visible');
        return;
      }

      if (btnDel) {
        const sessionId = btnDel.dataset.id;
        const confirmed = await window.showConfirmationModal(
          'Eliminar Sesión',
          'Esto eliminará la sesión Y TODOS los equipos asociados. ¿Estás seguro?'
        );
        if (confirmed) {
          const { error } = await supabaseClient.from('descartes_sesiones').delete().eq('id', sessionId);
          if (error) {
            showToast('Error al eliminar la sesión.', 'error');
          } else {
            showToast('Sesión eliminada con éxito.', 'success');
            fetchDescartes();
          }
        }
      }
    });
  }

  // Buscar en equipos de la sesión
  if (searchEquiposInput) {
    searchEquiposInput.addEventListener('input', async () => {
      if (!currentSessionId) return;
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(async () => {
        const term = searchEquiposInput.value.trim();
        currentEquiposData = await fetchEquiposBySession(currentSessionId, term);
        renderEquiposTable(currentEquiposData);
      }, 250);
    });
  }

  // Acciones en equipos
  if (tableEquiposSesionBody) {
    tableEquiposSesionBody.addEventListener('click', async (e) => {
      const btnEdit = e.target.closest('.btn-editar');
      const btnDel  = e.target.closest('.btn-eliminar');

      if (btnDel) {
        const equipoId = btnDel.dataset.id;
        const confirmed = await window.showConfirmationModal(
          'Eliminar Equipo',
          '¿Deseas eliminar este equipo del descarte?'
        );
        if (confirmed) {
          const { error } = await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
          if (error) {
            showToast('No se pudo eliminar el equipo.', 'error');
          } else {
            showToast('Equipo eliminado.', 'success');
            const term = searchEquiposInput?.value.trim() || '';
            if (currentSessionId) {
              await refreshSessionEquiposTotal(currentSessionId);
            }
            currentEquiposData = await fetchEquiposBySession(currentSessionId, term);
            renderEquiposTable(currentEquiposData);
          }
        }
      }

      if (btnEdit) {
        const equipoId = btnEdit.dataset.id;
        const { data, error } = await supabaseClient
          .from('equipos_descartados')
          .select('*')
          .eq('id', equipoId)
          .single();

        if (error || !data) {
          showToast('No se pudieron cargar los datos del equipo.', 'error');
          return;
        }

        editingEquipoId = data.id;

        if (!modalEditarEquipo || !formEditarEquipo) {
          showToast('El modal de edición de equipo no está disponible en este HTML.', 'error');
          return;
        }

        document.getElementById('editq-descripcion').value   = data.descripcion || '';
        document.getElementById('editq-marbete').value       = data.marbete || '';
        document.getElementById('editq-serie').value         = data.serie || '';
        document.getElementById('editq-marca').value         = data.marca || '';
        document.getElementById('editq-modelo').value        = data.modelo || '';
        document.getElementById('editq-estado').value        = data.estado_equipo || '';
        document.getElementById('editq-motivo').value        = data.motivo_descarte || '';

        modalEditarEquipo.classList.add('visible');
      }
    });
  }

  if (formEditarEquipo) {
    formEditarEquipo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        descripcion:     document.getElementById('editq-descripcion').value.trim(),
        marbete:         document.getElementById('editq-marbete').value.trim(),
        serie:           document.getElementById('editq-serie').value.trim(),
        marca:           document.getElementById('editq-marca').value.trim(),
        modelo:          document.getElementById('editq-modelo').value.trim(),
        estado_equipo:   document.getElementById('editq-estado').value.trim(),
        motivo_descarte: document.getElementById('editq-motivo').value.trim(),
      };

      const { error } = await supabaseClient
        .from('equipos_descartados')
        .update(payload)
        .eq('id', editingEquipoId);

      if (error) {
        showToast('No se pudo actualizar el equipo.', 'error');
      } else {
        showToast('Equipo actualizado.', 'success');
        modalEditarEquipo?.classList.remove('visible');
        const term = searchEquiposInput?.value.trim() || '';
        currentEquiposData = await fetchEquiposBySession(currentSessionId, term);
        renderEquiposTable(currentEquiposData);
      }
      editingEquipoId = null;
    });
  }

  if (btnCerrarModalEditarEq) {
    btnCerrarModalEditarEq.addEventListener('click', () => modalEditarEquipo?.classList.remove('visible'));
  }
  if (btnCancelarEditarEq) {
    btnCancelarEditarEq.addEventListener('click', () => modalEditarEquipo?.classList.remove('visible'));
  }
  if (btnCerrarModalEditarSes) {
    btnCerrarModalEditarSes.addEventListener('click', () => {
      modalEditarSesion?.classList.remove('visible');
      editingSessionId = null;
    });
  }
  if (btnCancelarEditarSesion) {
    btnCancelarEditarSesion.addEventListener('click', () => {
      modalEditarSesion?.classList.remove('visible');
      editingSessionId = null;
    });
  }
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (
        e.target.classList.contains('modal-overlay') ||
        e.target.classList.contains('modal-close-btn') ||
        e.target.classList.contains('modal-cancel-btn')
      ) {
        modal.classList.remove('visible');
        if (modal === modalEditarSesion) {
          editingSessionId = null;
        }
      }
    });
  });

  if (btnVolverSesiones) {
    btnVolverSesiones.addEventListener('click', () => {
      closeSessionDetail();
    });
  }

    // Toggle de detalles extra (solo móvil)
  if (btnToggleDetalles && detalleExtra) {
    btnToggleDetalles.setAttribute('aria-controls', 'detalle-extra');
    updateMobileDetailsToggle(false);
    btnToggleDetalles.addEventListener('click', () => {
      const shouldOpen = !detalleExtra.classList.contains('open');
      updateMobileDetailsToggle(shouldOpen);
    });
  }

  // --- NUEVO: Lógica para agregar equipo ---
  if (btnAgregarEquipo && modalAgregarEquipo) {
    btnAgregarEquipo.addEventListener('click', () => {
      if (!currentSessionId) {
        showToast("Primero abre una sesión.", "error");
        return;
      }
      formAgregarEquipo.reset();
      modalAgregarEquipo.classList.add('visible');
    });
  }

  if (formAgregarEquipo) {
    formAgregarEquipo.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentSessionId) {
        showToast("No hay sesión activa.", "error");
        return;
      }

      const payload = {
        sesion_id:       currentSessionId,
        descripcion:     document.getElementById('add-descripcion').value.trim(),
        marbete:         document.getElementById('add-marbete').value.trim(),
        serie:           document.getElementById('add-serie').value.trim(),
        marca:           document.getElementById('add-marca').value.trim(),
        modelo:          document.getElementById('add-modelo').value.trim(),
        estado_equipo:   document.getElementById('add-estado').value.trim(),
        motivo_descarte: document.getElementById('add-motivo').value.trim(),
      };

      const { error } = await supabaseClient.from('equipos_descartados').insert([payload]);

      if (error) {
        console.error(error);
        showToast("No se pudo agregar el equipo.", "error");
      } else {
        showToast("Equipo agregado con éxito.", "success");
        modalAgregarEquipo.classList.remove('visible');
        const term = searchEquiposInput?.value.trim() || '';
        if (currentSessionId) {
          await refreshSessionEquiposTotal(currentSessionId);
        }
        currentEquiposData = await fetchEquiposBySession(currentSessionId, term);
        renderEquiposTable(currentEquiposData);
      }
  });
}

  if (btnCerrarModalAgregarEq) {
    btnCerrarModalAgregarEq.addEventListener('click', () => modalAgregarEquipo?.classList.remove('visible'));
  }
  if (btnCancelarAgregarEq) {
    btnCancelarAgregarEq.addEventListener('click', () => modalAgregarEquipo?.classList.remove('visible'));
  }

  // --- 6) Exportar a Excel ---
  function getVisibleVisitorData() {
    if (!tableVisitantesBody) return currentVisitorData;

    const rows = Array.from(tableVisitantesBody.querySelectorAll('tr'));
    if (!rows.length) return [];

    const dataRows = rows.filter(row => row.dataset.id);
    if (!dataRows.length) {
      return currentVisitorData.length ? currentVisitorData : [];
    }

    const visitorMap = new Map((currentVisitorData || []).map(visitor => [String(visitor.id), visitor]));
    const mappedRows = dataRows
      .map(row => visitorMap.get(row.dataset.id))
      .filter(Boolean);

    if (mappedRows.length === dataRows.length) {
      return mappedRows;
    }

    return currentVisitorData.length ? currentVisitorData : mappedRows;
  }

  if (exportVisitantesBtn) {
    exportVisitantesBtn.addEventListener('click', async () => {
      if (typeof ExcelJS === 'undefined') {
        showToast('La librería ExcelJS no está disponible.', 'error');
        return;
      }

      const exportData = getVisibleVisitorData();
      if (!exportData.length) {
        showToast("No hay registros para exportar.", "error");
        return;
      }

      const headers = ["Nombre", "Apellido", "Cédula", "Sexo", "Motivo", "Fecha", "Hora"];
      const dataRows = exportData.map(v => [
        v.nombre,
        v.apellido,
        v.cedula,
        v.sexo,
        v.motivo,
        formatDate(v.fecha),
        formatTime(v.hora)
      ]);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Visitantes');
      const borderAll = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } }
      };

      worksheet.mergeCells(1, 1, 1, headers.length);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = 'Reporte de Visitantes';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      titleCell.border = borderAll;

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(headers);

      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      headerRow.eachCell(cell => {
        cell.border = borderAll;
      });

      dataRows.forEach(rowValues => {
        const row = worksheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber >= 6 ? 'center' : 'left',
            vertical: 'top',
            wrapText: true
          };
          cell.border = borderAll;
        });
      });

      const columnWidths = headers.map((header, columnIndex) => {
        const maxCellLength = Math.max(
          header.length,
          ...dataRows.map(row => (row[columnIndex] ? row[columnIndex].toString().length : 0))
        );

        return Math.min(Math.max(maxCellLength + 2, 12), 40);
      });

      columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });

      const today = new Date();
      const fileDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
      ].join('-');

      try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reporte_Visitantes_${fileDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        showToast('No se pudo generar el archivo de Excel.', 'error');
      }
    });
  }

  async function exportCurrentSessionToExcel() {
    if (typeof ExcelJS === 'undefined') {
      showToast('La librería ExcelJS no está disponible.', 'error');
      return;
    }

    if (!currentSessionId || !currentSessionData) {
      showToast('Primero debes abrir una sesión para exportar.', 'error');
      return;
    }

    const equipos = await fetchEquiposBySession(currentSessionId);
    if (!equipos.length) {
      showToast('No hay equipos registrados en esta sesión.', 'error');
      return;
    }

    showToast('Generando formulario de descarte...', 'success');

    const logoBase64 = await getLogoMeducaBase64();
    const logoDimensions = await getLogoMeducaDimensions();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Registro';
    workbook.created = new Date();

    const borderAll = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } }
    };

    const boldRows = new Set([1, 2, 3, 5, 6, 8, 26, 29, 30, 31, 32]);
    const rowsPerSheet = 17;
    const totalSheets = Math.max(1, Math.ceil(equipos.length / rowsPerSheet));

    let logoImageId = null;
    if (logoBase64) {
      try {
        logoImageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      } catch (error) {
        console.error('No se pudo agregar el logo del MEDUCA al archivo de Excel.', error);
      }
    }

    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
      const sheetNumber = sheetIndex + 1;
      const worksheet = workbook.addWorksheet(`Hoja ${sheetNumber}`);

      const descripcionHeader = 'DESCRIPCIÓN';
      const unidadAdministrativaLabel = 'UNIDAD ADMINISTRATIVA:';
      const formularioTitulo = 'FORMULARIO DE DESCARTE';
      const columnAWidth = 6;
      const combinedHeaderWidth = Math.max(unidadAdministrativaLabel.length, formularioTitulo.length);
      const columnBWidth = Math.max(
        descripcionHeader.length,
        Math.max(combinedHeaderWidth - columnAWidth + 4, 0)
      );
      const columnWidths = [columnAWidth, columnBWidth, 28, 28, 18, 18, 20, 20, 20, 34];
      columnWidths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
      });

      worksheet.mergeCells('A1:J1');
      const row1 = worksheet.getCell('A1');
      row1.value = 'MINISTERIO DE EDUCACIÓN';
      row1.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A2:J2');
      const row2 = worksheet.getCell('A2');
      row2.value = 'DIRECCIÓN NACIONAL DE INFORMÁTICA';
      row2.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A3:J3');
      const row3 = worksheet.getCell('A3');
      row3.value = 'DEPARTAMENTO DE SOPORTE TÉCNICO';
      row3.alignment = { horizontal: 'center', vertical: 'middle' };

      if (logoImageId !== null) {
        const bounds = { startCol: 7, endCol: 10, startRow: 1, endRow: 5 };
        const imageSize = calculateImageSizeWithinBounds(
          worksheet,
          bounds,
          logoDimensions
        );

        const placement = imageSize
          ? calculateImagePlacementWithinBounds(worksheet, bounds, imageSize)
          : null;

        if (placement) {
          worksheet.addImage(logoImageId, placement);
        } else {
          worksheet.addImage(logoImageId, 'G1:J5');
        }
      }

      worksheet.mergeCells('A5:B5');
      const titleRow = worksheet.getCell('A5');
      titleRow.value = 'FORMULARIO DE DESCARTE';
      titleRow.alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.getCell('D5').value = 'TÉCNICO ENCARGADO:';
      worksheet.mergeCells('E5:F5');
      worksheet.getCell('E5').value = currentSessionData.tecnico_encargado || '';
      worksheet.getCell('E5').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      worksheet.getCell('H5').value = 'CUADRO N°:';
      worksheet.getCell('I5').value = sheetNumber;
      worksheet.getCell('I5').alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.mergeCells('A6:B6');
      worksheet.getCell('A6').value = unidadAdministrativaLabel;
      worksheet.getCell('A6').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      worksheet.getCell('C6').value = currentSessionData.unidad_administrativa || '';
      worksheet.getCell('C6').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      worksheet.getCell('D6').value = 'FECHA:';
      worksheet.getCell('E6').value = formatDate(currentSessionData.fecha);
      
      worksheet.getCell('A8').value = 'N°';
      worksheet.getCell('B8').value = 'DESCRIPCIÓN';
      worksheet.getCell('C8').value = 'MARBETE';
      worksheet.getCell('D8').value = 'SERIE';
      worksheet.getCell('E8').value = 'MARCA';
      worksheet.getCell('F8').value = 'MODELO';
      worksheet.mergeCells('G8:I8');
      worksheet.getCell('G8').value = 'ESTADO DEL EQUIPO';
      worksheet.getCell('J8').value = 'MOTIVO DE DESCARTE';

      const startIndex = sheetIndex * rowsPerSheet;
      for (let rowOffset = 0; rowOffset < rowsPerSheet; rowOffset++) {
        const excelRow = 9 + rowOffset;
        const dataIndex = startIndex + rowOffset;
        const equipo = equipos[dataIndex];
        const consecutiveNumber = sheetIndex * rowsPerSheet + rowOffset + 1;

        worksheet.mergeCells(excelRow, 7, excelRow, 9);

        worksheet.getCell(excelRow, 1).value = consecutiveNumber;

        if (equipo) {
          worksheet.getCell(excelRow, 2).value = equipo.descripcion || '';
          worksheet.getCell(excelRow, 3).value = equipo.marbete || '';
          worksheet.getCell(excelRow, 4).value = equipo.serie || '';
          worksheet.getCell(excelRow, 5).value = equipo.marca || '';
          worksheet.getCell(excelRow, 6).value = equipo.modelo || '';
          worksheet.getCell(excelRow, 7).value = equipo.estado_equipo || '';
          worksheet.getCell(excelRow, 10).value = equipo.motivo_descarte || '';
        } else {
          worksheet.getCell(excelRow, 2).value = '';
          worksheet.getCell(excelRow, 3).value = '';
          worksheet.getCell(excelRow, 4).value = '';
          worksheet.getCell(excelRow, 5).value = '';
          worksheet.getCell(excelRow, 6).value = '';
          worksheet.getCell(excelRow, 7).value = '';
          worksheet.getCell(excelRow, 10).value = '';
        }

        worksheet.getCell(excelRow, 1).alignment  = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(excelRow, 2).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 3).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 4).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 5).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 6).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 7).alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell(excelRow, 10).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }

      worksheet.mergeCells('A26:J26');
      worksheet.getCell('A26').value = `OBSERVACIÓN: ${currentSessionData.observacion || ''}`;
      worksheet.getCell('A26').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      worksheet.mergeCells('C28:D28');
      worksheet.getCell('C28').value = '______________________';
      worksheet.mergeCells('F28:G28');
      worksheet.getCell('F28').value = '______________________';
      worksheet.getCell('J28').value = '______________________';

      worksheet.mergeCells('C29:D29');
      worksheet.getCell('C29').value = 'FIRMA';
      worksheet.mergeCells('F29:G29');
      worksheet.getCell('F29').value = 'FIRMA';
      worksheet.getCell('J29').value = 'FIRMA';

      worksheet.mergeCells('C30:D30');
      worksheet.getCell('C30').value = 'ADALBERTO FERNÁNDEZ C.';
      worksheet.mergeCells('F30:G30');
      worksheet.getCell('F30').value = 'RONNIE DÍAZ';
      worksheet.getCell('J30').value = 'RAFAEL ZAMBRANO';

      worksheet.mergeCells('C31:D31');
      worksheet.getCell('C31').value = 'NOMBRE DEL FUNCIONARIO';
      worksheet.mergeCells('F31:G31');
      worksheet.getCell('F31').value = 'NOMBRE DEL FUNCIONARIO';
      worksheet.getCell('J31').value = 'NOMBRE DEL FUNCIONARIO';

      worksheet.mergeCells('C32:D32');
      worksheet.getCell('C32').value = 'Técnico Encargado de Informática';
      worksheet.mergeCells('F32:G32');
      worksheet.getCell('F32').value = 'Jefe o Encargado del Departamento';
      worksheet.getCell('J32').value = 'Jefe o Encargado de Bienes Patrimoniales';

      for (let rowNumber = 8; rowNumber <= 25; rowNumber++) {
        for (let colNumber = 1; colNumber <= 10; colNumber++) {
          worksheet.getCell(rowNumber, colNumber).border = borderAll;
        }
      }

      const fontSizeByRow = {};
      [1, 2, 3].forEach(rowNumber => {
        fontSizeByRow[rowNumber] = 12;
      });
      [5, 6].forEach(rowNumber => {
        fontSizeByRow[rowNumber] = 11;
      });
      fontSizeByRow[8] = 10;
      for (let rowNumber = 9; rowNumber <= 25; rowNumber++) {
        fontSizeByRow[rowNumber] = 11;
      }
      fontSizeByRow[26] = 11;
      fontSizeByRow[29] = 8;
      fontSizeByRow[30] = 10;
      fontSizeByRow[31] = 8;
      fontSizeByRow[32] = 8;

      Object.entries(fontSizeByRow).forEach(([rowNumber, size]) => {
        const numericRow = Number(rowNumber);
        const fontConfig = { size };
        if (boldRows.has(numericRow)) {
          fontConfig.bold = true;
        }
        worksheet.getRow(numericRow).font = fontConfig;
      });

      worksheet.getRow(8).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      worksheet.getRow(28).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(29).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(30).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(31).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      worksheet.getRow(32).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      worksheet.getCell('H5').alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.getCell('D5').alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.getCell('D6').alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.getCell('E6').alignment = { horizontal: 'left', vertical: 'middle' };
    }

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const unit = sanitizeForFilename(currentSessionData.unidad_administrativa || 'Sesion');
      const date = formatDate(currentSessionData.fecha).replace(/-/g, '');
      link.download = `Formulario_Descartes_${unit}_${date}.xlsx`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showToast('No se pudo generar el archivo de Excel.', 'error');
    }
  }

  if (exportSesionDescartesBtn) {
    exportSesionDescartesBtn.addEventListener('click', exportCurrentSessionToExcel);
  }

  // --- 7) Inicialización ---
  await fetchVisitantes();
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';

  // --- 8) Datepicker UX ---
  const dateInputs = [
    dateStartVisitantesInput,
    dateEndVisitantesInput,
    dateStartDescartesInput,
    dateEndDescartesInput,
  ].filter(Boolean);

  function updateDateFieldState(input) {
    const wrapper = input?.parentElement;
    if (!wrapper || !wrapper.classList.contains('date-field')) return;
    wrapper.dataset.empty = input.value ? 'false' : 'true';
  }

  function attachDateFieldHandlers(input) {
    const wrapper = input.parentElement;
    if (!wrapper) return;

    updateDateFieldState(input);

    const openPicker = () => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
      try { input.focus({ preventScroll: true }); }
      catch(_) {
        try { input.focus(); } catch(_) {}
      }
      try { input.click(); } catch(_) {}
    };

    wrapper.addEventListener('click', (event) => {
      if (typeof input.showPicker === 'function') {
        event.preventDefault();
      }
      openPicker();
    });

    if (!wrapper.hasAttribute('tabindex')) {
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute('aria-label', input.title || 'Abrir selector de fecha');
      wrapper.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openPicker();
        }
      });
    }

    input.addEventListener('input',  () => updateDateFieldState(input));
    input.addEventListener('change', () => updateDateFieldState(input));
  }

  dateInputs.forEach(attachDateFieldHandlers);
});
