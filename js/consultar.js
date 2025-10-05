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
  const exportDescartesBtn       = document.getElementById('export-descartes-btn');
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

  function initActionsColumnToggle(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const container = table.closest('.table-container');
    if (!container) return;

    const mobileMedia = window.matchMedia('(max-width: 768px)');
    let toggleBtn = null;
    let userExpanded = false;
    let autoExpanded = false;

    const ensureCollapsedState = (shouldCollapse) => {
      table.classList.toggle('actions-collapsed', shouldCollapse);
      table.classList.add('actions-collapsible');
      container.classList.toggle('actions-open', !shouldCollapse);
    };

    const updateToggleVisualState = () => {
      if (!toggleBtn) return;
      toggleBtn.setAttribute('aria-pressed', userExpanded ? 'true' : 'false');
      toggleBtn.setAttribute('aria-label', userExpanded ? 'Ocultar columna de acciones' : 'Mostrar columna de acciones');
      toggleBtn.title = userExpanded ? 'Ocultar columna de acciones' : 'Mostrar columna de acciones';
      toggleBtn.dataset.state = userExpanded ? 'open' : 'closed';
    };

    const handleToggleClick = () => {
      userExpanded = !userExpanded;
      autoExpanded = false;
      ensureCollapsedState(!userExpanded);
      updateToggleVisualState();
      if (toggleBtn) {
        toggleBtn.classList.remove('is-hidden');
      }
    };

    const handleScroll = () => {
      if (!toggleBtn) return;
      const { scrollLeft, clientWidth, scrollWidth } = container;
      const atEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 1;

      if (atEnd) {
        if (!autoExpanded) {
          autoExpanded = true;
          ensureCollapsedState(false);
          toggleBtn.classList.add('is-hidden');
        }
        return;
      }

      if (autoExpanded) {
        autoExpanded = false;
        ensureCollapsedState(!userExpanded);
      }
      toggleBtn.classList.remove('is-hidden');
    };

    const handleResize = () => {
      if (!toggleBtn) return;
      handleScroll();
    };

    const enableMobileBehaviour = () => {
      if (toggleBtn) return;

      toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'actions-toggle';
      toggleBtn.innerHTML = '<span class="actions-toggle__icon" aria-hidden="true">↔</span><span class="actions-toggle__label">Acciones</span>';
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.setAttribute('aria-label', 'Mostrar columna de acciones');
      toggleBtn.title = 'Mostrar columna de acciones';

      container.appendChild(toggleBtn);
      container.classList.add('has-actions-toggle');
      userExpanded = false;
      autoExpanded = false;
      ensureCollapsedState(true);
      updateToggleVisualState();

      toggleBtn.addEventListener('click', handleToggleClick);
      container.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize);
      handleScroll();
    };

    const disableMobileBehaviour = () => {
      if (!toggleBtn) return;

      toggleBtn.removeEventListener('click', handleToggleClick);
      toggleBtn.remove();
      toggleBtn = null;

      container.classList.remove('has-actions-toggle', 'actions-open');
      table.classList.remove('actions-collapsed', 'actions-collapsible');
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      userExpanded = false;
      autoExpanded = false;
    };

    const handleMediaChange = (event) => {
      if (event.matches) {
        enableMobileBehaviour();
      } else {
        disableMobileBehaviour();
      }
    };

    handleMediaChange(mobileMedia);
    mobileMedia.addEventListener('change', handleMediaChange);
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
      tr.innerHTML = `
        <td>${visitor.nombre}</td>
        <td>${visitor.apellido}</td>
        <td>${visitor.cedula}</td>
        <td>${visitor.motivo}</td>
        <td>${formatDate(visitor.fecha)}</td>
        <td>${formatTime(visitor.hora)}</td>
        <td class="table-actions">
          <button class="btn-editar button-with-icon" data-id="${visitor.id}" aria-label="Editar visitante">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar button-with-icon" data-id="${visitor.id}" aria-label="Eliminar visitante">
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
          <button class="btn-view-equipos button-with-icon" data-id="${session.id}" aria-label="Abrir sesión">
            <span class="icon icon--sm icon-open" aria-hidden="true"></span>
            <span class="button-label">Abrir</span>
          </button>
          <button class="btn-editar btn-editar-sesion button-with-icon" data-id="${session.id}" aria-label="Editar sesión">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar-sesion button-with-icon" data-id="${session.id}" aria-label="Eliminar sesión">
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
          <button class="btn-editar button-with-icon" data-id="${eq.id}" aria-label="Editar equipo">
            <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
            <span class="button-label">Editar</span>
          </button>
          <button class="btn-eliminar button-with-icon" data-id="${eq.id}" aria-label="Eliminar equipo">
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
  ['table-visitantes', 'table-descartes', 'table-equipos-sesion'].forEach(initActionsColumnToggle);

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
  if (dateStartVisitantesInput) dateStartVisitantesInput.addEventListener('change', fetchVisitantes);
  if (dateEndVisitantesInput)   dateEndVisitantesInput.addEventListener('change', fetchVisitantes);

  // Filtros sesiones
  if (searchDescartesInput) {
    searchDescartesInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(fetchDescartes, 300);
    });
  }
  if (dateStartDescartesInput) dateStartDescartesInput.addEventListener('change', fetchDescartes);
  if (dateEndDescartesInput)   dateEndDescartesInput.addEventListener('change', fetchDescartes);

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
  if (exportVisitantesBtn) {
    exportVisitantesBtn.addEventListener('click', () => {
      if (!currentVisitorData.length) {
        showToast("No hay registros para exportar.", "error");
        return;
      }

      const title = [["Reporte de Visitantes"]];
      const headers = [["Nombre", "Apellido", "Cédula", "Sexo", "Motivo", "Fecha", "Hora"]];
      const rows = currentVisitorData.map(v => [
        v.nombre,
        v.apellido,
        v.cedula,
        v.sexo,
        v.motivo,
        formatDate(v.fecha),
        formatTime(v.hora)
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([...title, [], ...headers, ...rows]);

      worksheet['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 }
      ];

      worksheet['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } };
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r:0, c:0 }, e: { r:0, c:6 } });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Visitantes");

      XLSX.writeFile(workbook, `Reporte_Visitantes_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  }

  if (exportDescartesBtn) {
    exportDescartesBtn.addEventListener('click', async () => {
      showToast('Generando reporte, esto puede tardar...', 'success');

      const sessionIds = currentDescartesData.map(s => s.id);
      if (!sessionIds.length) {
        showToast('No hay sesiones para exportar.', 'error');
        return;
      }

      const { data: equipos, error } = await supabaseClient
        .from('equipos_descartados')
        .select('*, descartes_sesiones(unidad_administrativa, codigo_siace, tecnico_encargado, fecha)')
        .in('sesion_id', sessionIds);

      if (error) {
        showToast('Error al obtener los datos para el reporte.', 'error');
        return;
      }

      const formattedData = (equipos || []).map(e => ({
        "Unidad Administrativa": e.descartes_sesiones.unidad_administrativa,
        "Código SIACE":          e.descartes_sesiones.codigo_siace,
        "Descripción":           e.descripcion,
        "Marca":                 e.marca,
        "Modelo":                e.modelo,
        "Serie":                 e.serie,
        "Marbete":               e.marbete,
        "Estado del Equipo":     e.estado_equipo,
        "Motivo del Descarte":   e.motivo_descarte,
        "Técnico":               e.descartes_sesiones.tecnico_encargado,
        "Fecha":                 formatDate(e.descartes_sesiones.fecha)
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Equipos Descartados");
      XLSX.writeFile(wb, `Reporte_Descartes_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
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
      try { input.focus(); } catch(_) {}
      try { input.click(); } catch(_) {}
    };

    wrapper.addEventListener('click', (e) => {
      if (e.target === input) return;
      e.preventDefault();
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