// js/consultar.js

document.addEventListener('DOMContentLoaded', async () => {
  // --- 0) Protección de ruta ---
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // --- 1) DOM ---
  const tabsNav = document.querySelector('.tabs-nav');
  const tabContents = document.querySelectorAll('.tab-content');

  // Visitantes
  const searchVisitantesInput = document.getElementById('search-visitantes');
  const dateStartVisitantesInput = document.getElementById('date-start-visitantes');
  const dateEndVisitantesInput   = document.getElementById('date-end-visitantes');
  const exportVisitantesBtn      = document.getElementById('export-visitantes-btn');
  const tableVisitantesBody      = document.querySelector('#table-visitantes tbody');

  // Controles masivos visitantes
  const selectAllCheckbox = document.getElementById('select-all-visitantes');
  const bulkDeleteBtn     = document.getElementById('bulk-delete-btn');

  // Descartes
  const searchDescartesInput = document.getElementById('search-descartes');
  const dateStartDescartesInput = document.getElementById('date-start-descartes');
  const dateEndDescartesInput   = document.getElementById('date-end-descartes');
  const exportDescartesBtn      = document.getElementById('export-descartes-btn');
  const tableDescartesBody      = document.querySelector('#table-descartes tbody');

  // Modales
  const modalEditarVisitante = document.getElementById('modal-editar-visitante');
  const formEditarVisitante  = document.getElementById('form-editar-visitante');
  const modalVerEquipos      = document.getElementById('modal-ver-equipos');
  const modalEquiposTitle    = document.getElementById('modal-equipos-title');
  const modalEquiposList     = document.querySelector('.modal-list-container');

  // Toast
  const toastEl       = document.getElementById('toast-notification');
  const toastMsgEl    = document.getElementById('toast-message');

  // --- 2) Estado ---
  let currentVisitorData   = [];
  let currentDescartesData = [];
  let editingVisitorId     = null;
  let searchDebounceTimeout;
  const selectedVisitorIds = new Set(); // ids seleccionados (visibles)

  // --- 3) Utilidades ---
  function showToast(message, type = 'success') {
    clearTimeout(searchDebounceTimeout);
    toastMsgEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => { toastEl.className = toastEl.className.replace('show', ''); }, 3000);
  }

  // dd-mm-aaaa (independiente del locale)
  function formatDate(isoString) {
    if (!isoString) return '-';
    const [y, m, d] = isoString.includes('T')
      ? (new Date(isoString).toISOString().slice(0,10).split('-'))
      : isoString.split('-');
    return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
  }

  // 12h AM/PM
  function formatTime(isoString) {
    if (!isoString) return '-';
    const timePart = isoString.split('T')[1] ? isoString : `1970-01-01T${isoString}`;
    const date = new Date(timePart);
    return new Intl.DateTimeFormat('es-PA', { hour:'numeric', minute:'2-digit', hour12:true }).format(date);
  }

  function clearSelection() {
    selectedVisitorIds.clear();
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    }
    updateBulkDeleteUI();
  }

  function updateBulkDeleteUI() {
    const count = selectedVisitorIds.size;
    if (!bulkDeleteBtn) return;
    if (count > 1) {
      bulkDeleteBtn.style.display = 'inline-flex';
      bulkDeleteBtn.textContent = `Eliminar (${count})`;
    } else {
      bulkDeleteBtn.style.display = 'none';
    }
  }

  function updateSelectAllStateFromDOM() {
    if (!selectAllCheckbox) return;
    const cbs = tableVisitantesBody.querySelectorAll('.row-select');
    const total = cbs.length;
    const checked = [...cbs].filter(cb => cb.checked).length;
    selectAllCheckbox.checked = (total > 0 && checked === total);
    selectAllCheckbox.indeterminate = (checked > 0 && checked < total);
    updateBulkDeleteUI();
  }

  // --- 4) Fetch + render ---
  // Visitantes
  async function fetchVisitantes() {
    const searchTerm = searchVisitantesInput.value.trim();
    const startDate = dateStartVisitantesInput.value;
    const endDate   = dateEndVisitantesInput.value;

    let query = supabaseClient.from('visitantes').select('*').order('id', { ascending: false });

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%`);
    }
    if (startDate) query = query.gte('fecha', startDate);
    if (endDate)   query = query.lte('fecha', endDate);

    const { data, error } = await query;
    if (error) {
      showToast('Error al cargar los visitantes.', 'error');
      console.error(error);
      return;
    }
    currentVisitorData = data;
    renderVisitantesTable(data);
    clearSelection(); // selección solo para filas visibles/filtradas
  }

  function renderVisitantesTable(data) {
    tableVisitantesBody.innerHTML = '';
    if (!data || data.length === 0) {
      tableVisitantesBody.innerHTML = '<tr><td colspan="8">No se encontraron registros.</td></tr>';
      return;
    }

    data.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="select-col">
          <input type="checkbox" class="row-select" data-id="${v.id}">
        </td>
        <td>${v.nombre}</td>
        <td>${v.apellido}</td>
        <td>${v.cedula}</td>
        <td>${v.motivo}</td>
        <td>${formatDate(v.fecha)}</td>
        <td>${formatTime(v.hora)}</td>
        <td class="table-actions">
          <button class="btn-editar" data-id="${v.id}">Editar</button>
          <button class="btn-eliminar" data-id="${v.id}">Eliminar</button>
        </td>
      `;
      tableVisitantesBody.appendChild(tr);
    });
  }

  // Descartes
  async function fetchDescartes() {
    const searchTerm = searchDescartesInput.value.trim();
    const startDate = dateStartDescartesInput.value;
    const endDate   = dateEndDescartesInput.value;

    let query = supabaseClient
      .from('descartes_sesiones')
      .select(`*, equipos_descartados(count)`)
      .order('id', { ascending: false });

    if (searchTerm) query = query.or(`unidad_administrativa.ilike.%${searchTerm}%,codigo_siace.ilike.%${searchTerm}%`);
    if (startDate)  query = query.gte('fecha', startDate);
    if (endDate)    query = query.lte('fecha', endDate);

    const { data, error } = await query;
    if (error) {
      showToast('Error al cargar las sesiones de descarte.', 'error');
      console.error(error);
      return;
    }
    currentDescartesData = data;
    renderDescartesTable(data);
  }

  function renderDescartesTable(data) {
    tableDescartesBody.innerHTML = '';
    if (!data || data.length === 0) {
      tableDescartesBody.innerHTML = '<tr><td colspan="6">No se encontraron sesiones.</td></tr>';
      return;
    }
    data.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${s.unidad_administrativa}</td>
        <td>${formatDate(s.fecha)}</td>
        <td>${s.tecnico_encargado}</td>
        <td>${s.equipos_descartados[0].count}</td>
        <td class="table-actions">
          <button class="btn-view-equipos" data-id="${s.id}">Ver Equipos</button>
          <button class="btn-eliminar-sesion" data-id="${s.id}">Eliminar</button>
        </td>
      `;
      tableDescartesBody.appendChild(tr);
    });
  }

  // --- 5) Eventos ---
  // Tabs
  tabsNav.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-btn')) return;
    const tabId = e.target.dataset.tab;

    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    tabContents.forEach(c => {
      c.classList.toggle('active', c.id === `${tabId}-content`);
    });

    if (tabId === 'visitantes') {
      fetchVisitantes();
    } else if (tabId === 'descartes') {
      fetchDescartes();
    }
  });

  // Filtros visitantes
  const triggerFetchVisitantes = () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(fetchVisitantes, 250);
  };
  searchVisitantesInput.addEventListener('input', triggerFetchVisitantes);
  dateStartVisitantesInput.addEventListener('change', triggerFetchVisitantes);
  dateEndVisitantesInput.addEventListener('change', triggerFetchVisitantes);

  // Filtros descartes
  const triggerFetchDescartes = () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(fetchDescartes, 250);
  };
  searchDescartesInput.addEventListener('input', triggerFetchDescartes);
  dateStartDescartesInput.addEventListener('change', triggerFetchDescartes);
  dateEndDescartesInput.addEventListener('change', triggerFetchDescartes);

  // Selección masiva - “Seleccionar todo”
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const checked = selectAllCheckbox.checked;
      const cbs = tableVisitantesBody.querySelectorAll('.row-select');
      cbs.forEach(cb => {
        cb.checked = checked;
        const id = Number(cb.dataset.id);
        if (checked) selectedVisitorIds.add(id);
        else selectedVisitorIds.delete(id);
      });
      selectAllCheckbox.indeterminate = false;
      updateBulkDeleteUI();
    });
  }

  // Clicks en tabla de visitantes (selección + acciones)
  tableVisitantesBody.addEventListener('click', async (e) => {
    const el = e.target;

    // Toggle selección individual
    if (el.classList.contains('row-select')) {
      const id = Number(el.dataset.id);
      if (el.checked) selectedVisitorIds.add(id);
      else selectedVisitorIds.delete(id);
      updateSelectAllStateFromDOM();
      return;
    }

    // Eliminar individual
    if (el.classList.contains('btn-eliminar')) {
      const visitorId = el.dataset.id;
      const confirmed = await window.showConfirmationModal(
        'Eliminar Visitante',
        '¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.'
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from('visitantes').delete().eq('id', visitorId);
      if (error) {
        showToast('Error al eliminar el registro.', 'error');
      } else {
        // si estaba seleccionado, quítalo del set
        selectedVisitorIds.delete(Number(visitorId));
        showToast('Registro eliminado con éxito.', 'success');
        fetchVisitantes();
      }
      return;
    }

    // Editar
    if (el.classList.contains('btn-editar')) {
      const visitorId = el.dataset.id;
      const { data, error } = await supabaseClient.from('visitantes').select('*').eq('id', visitorId).single();
      if (error) {
        showToast('No se pudieron cargar los datos del visitante.', 'error');
        return;
      }
      editingVisitorId = data.id;
      document.getElementById('edit-nombre').value   = data.nombre;
      document.getElementById('edit-apellido').value = data.apellido;
      document.getElementById('edit-cedula').value   = data.cedula;
      document.getElementById('edit-sexo').value     = data.sexo;
      document.getElementById('edit-motivo').value   = data.motivo;
      modalEditarVisitante.classList.add('visible');
      return;
    }
  });

  // Botón eliminar masivo
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const ids = [...selectedVisitorIds];
      if (ids.length < 2) return; // solo aparece si >1, pero por si acaso
      const confirmed = await window.showConfirmationModal(
        'Eliminar Registros',
        `Vas a eliminar ${ids.length} visitantes seleccionados. ¿Deseas continuar?`
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from('visitantes').delete().in('id', ids);
      if (error) {
        showToast('Error al eliminar los registros.', 'error');
        return;
      }
      showToast('Registros eliminados con éxito.', 'success');
      clearSelection();
      fetchVisitantes();
    });
  }

  // Tabla de descartes (ver equipos / eliminar sesión)
  tableDescartesBody.addEventListener('click', async (e) => {
    const el = e.target;
    const sessionId = el.dataset.id;

    if (el.classList.contains('btn-view-equipos')) {
      const { data, error } = await supabaseClient.from('equipos_descartados').select('*').eq('sesion_id', sessionId);
      if (error) { showToast('Error al cargar los equipos.', 'error'); return; }

      modalEquiposTitle.textContent = `Equipos de la Sesión #${sessionId}`;
      modalEquiposList.innerHTML = data.length
        ? data.map(eq => `
            <div class="equipo-item">
              <strong>${eq.descripcion || 'Sin descripción'}</strong>
              <p>Marbete: ${eq.marbete || '-'} | Serie: ${eq.serie || '-'}</p>
            </div>
          `).join('')
        : '<p>No hay equipos registrados en esta sesión.</p>';
      modalVerEquipos.classList.add('visible');
      return;
    }

    if (el.classList.contains('btn-eliminar-sesion')) {
      const confirmed = await window.showConfirmationModal(
        'Eliminar Sesión',
        'Esto eliminará la sesión Y TODOS los equipos asociados. ¿Estás seguro?'
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from('descartes_sesiones').delete().eq('id', sessionId);
      if (error) showToast('Error al eliminar la sesión.', 'error');
      else {
        showToast('Sesión eliminada con éxito.', 'success');
        fetchDescartes();
      }
      return;
    }
  });

  // Guardar edición visitante
  formEditarVisitante.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      nombre:   document.getElementById('edit-nombre').value,
      apellido: document.getElementById('edit-apellido').value,
      cedula:   document.getElementById('edit-cedula').value,
      sexo:     document.getElementById('edit-sexo').value,
      motivo:   document.getElementById('edit-motivo').value
    };
    const { error } = await supabaseClient.from('visitantes').update(updated).eq('id', editingVisitorId);
    if (error) {
      showToast('Error al guardar los cambios.', 'error');
    } else {
      showToast('Visitante actualizado con éxito.', 'success');
      modalEditarVisitante.classList.remove('visible');
      fetchVisitantes();
    }
    editingVisitorId = null;
  });

  // Cerrar modales genérico
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (
        e.target.classList.contains('modal-overlay') ||
        e.target.classList.contains('modal-close-btn') ||
        e.target.classList.contains('modal-cancel-btn')
      ) {
        modal.classList.remove('visible');
      }
    });
  });

  // --- 6) Exportar ---
  exportVisitantesBtn.addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet(currentVisitorData.map(v => ({
      Nombre: v.nombre,
      Apellido: v.apellido,
      Cedula: v.cedula,
      Sexo: v.sexo,
      Motivo: v.motivo,
      Fecha: formatDate(v.fecha),
      Hora:  formatTime(v.hora)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitantes');
    XLSX.writeFile(wb, `Reporte_Visitantes_${new Date().toISOString().split('T')[0]}.xlsx`);
  });

  exportDescartesBtn.addEventListener('click', async () => {
    showToast('Generando reporte, esto puede tardar...', 'success');

    const sessionIds = currentDescartesData.map(s => s.id);
    if (sessionIds.length === 0) {
      showToast('No hay sesiones filtradas para exportar.', 'error');
      return;
    }

    const { data: equipos, error } = await supabaseClient
      .from('equipos_descartados')
      .select('*, descartes_sesiones(unidad_administrativa, codigo_siace, tecnico_encargado, fecha)')
      .in('sesion_id', sessionIds);

    if (error) { showToast('Error al obtener datos para el reporte.', 'error'); return; }

    const formatted = equipos.map(e => ({
      "Unidad Administrativa": e.descartes_sesiones.unidad_administrativa,
      "Código SIACE":         e.descartes_sesiones.codigo_siace,
      "Descripción":          e.descripcion,
      "Marca":                e.marca,
      "Modelo":               e.modelo,
      "Serie":                e.serie,
      "Marbete":              e.marbete,
      "Estado del Equipo":    e.estado_equipo,
      "Motivo del Descarte":  e.motivo_descarte,
      "Técnico":              e.descartes_sesiones.tecnico_encargado,
      "Fecha":                formatDate(e.descartes_sesiones.fecha)
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos Descartados');
    XLSX.writeFile(wb, `Reporte_Descartes_${new Date().toISOString().split('T')[0]}.xlsx`);
  });

  // --- 7) Init ---
  await fetchVisitantes(); // pestaña por defecto
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
});
