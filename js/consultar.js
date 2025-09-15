// js/consultar.js (versión sin checkboxes ni selección masiva)

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

  // Visitantes
  const searchVisitantesInput = document.getElementById('search-visitantes');
  const dateStartVisitantesInput = document.getElementById('date-start-visitantes');
  const dateEndVisitantesInput   = document.getElementById('date-end-visitantes');
  const exportVisitantesBtn      = document.getElementById('export-visitantes-btn');
  const tableVisitantesBody      = document.querySelector('#table-visitantes tbody');

  // Descartes
  const searchDescartesInput     = document.getElementById('search-descartes');
  const dateStartDescartesInput  = document.getElementById('date-start-descartes');
  const dateEndDescartesInput    = document.getElementById('date-end-descartes');
  const exportDescartesBtn       = document.getElementById('export-descartes-btn');
  const tableDescartesBody       = document.querySelector('#table-descartes tbody');

  // Modales
  const modalEditarVisitante     = document.getElementById('modal-editar-visitante');
  const formEditarVisitante      = document.getElementById('form-editar-visitante');
  const modalVerEquipos          = document.getElementById('modal-ver-equipos');
  const modalEquiposTitle        = document.getElementById('modal-equipos-title');
  const modalEquiposList         = document.querySelector('.modal-list-container');

  // Toast
  const toastEl                  = document.getElementById('toast-notification');
  const toastMessageEl           = document.getElementById('toast-message');

  // --- 2) Estado ---
  let currentVisitorData   = [];
  let currentDescartesData = [];
  let editingVisitorId     = null;
  let searchDebounceTimeout;
  let toastTimeout;

  // --- 3) Utilidades ---
  function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toastMessageEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    toastTimeout = setTimeout(() => {
      toastEl.className = toastEl.className.replace('show', '');
    }, 3000);
  }

  // dd-mm-aaaa sin depender del locale
  function formatDate(isoString) {
    if (!isoString) return '-';
    const [y, m, d] = isoString.includes('T')
      ? (new Date(isoString).toISOString().slice(0,10).split('-'))
      : isoString.split('-'); // 'YYYY-MM-DD'
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

  // --- 4) Datos y render ---

  // Visitantes
  async function fetchVisitantes() {
    const searchTerm = searchVisitantesInput.value.trim();
    const startDate  = dateStartVisitantesInput.value;
    const endDate    = dateEndVisitantesInput.value;

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
      return;
    }
    currentVisitorData = data || [];
    renderVisitantesTable(currentVisitorData);
  }

  function renderVisitantesTable(data) {
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
          <button class="btn-editar"  data-id="${visitor.id}">Editar</button>
          <button class="btn-eliminar" data-id="${visitor.id}">Eliminar</button>
        </td>
      `;
      tableVisitantesBody.appendChild(tr);
    });
  }

  // Descartes
  async function fetchDescartes() {
    const searchTerm = searchDescartesInput.value.trim();
    const startDate  = dateStartDescartesInput.value;
    const endDate    = dateEndDescartesInput.value;

    let query = supabaseClient
      .from('descartes_sesiones')
      .select(`*, equipos_descartados(count)`)
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
      return;
    }
    currentDescartesData = data || [];
    renderDescartesTable(currentDescartesData);
  }

  function renderDescartesTable(data) {
    tableDescartesBody.innerHTML = '';
    if (!data.length) {
      tableDescartesBody.innerHTML = '<tr><td colspan="6">No se encontraron sesiones.</td></tr>';
      return;
    }
    data.forEach(session => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${session.id}</td>
        <td>${session.unidad_administrativa}</td>
        <td>${formatDate(session.fecha)}</td>
        <td>${session.tecnico_encargado}</td>
        <td>${session.equipos_descartados?.[0]?.count ?? 0}</td>
        <td class="table-actions">
          <button class="btn-view-equipos"    data-id="${session.id}">Ver Equipos</button>
          <button class="btn-eliminar-sesion" data-id="${session.id}">Eliminar</button>
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

    if (tabId === 'visitantes') fetchVisitantes();
    if (tabId === 'descartes') fetchDescartes();
  });

  // Filtros visitantes
  searchVisitantesInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(fetchVisitantes, 300);
  });
  dateStartVisitantesInput.addEventListener('change', fetchVisitantes);
  dateEndVisitantesInput.addEventListener('change', fetchVisitantes);

  // Filtros descartes
  searchDescartesInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(fetchDescartes, 300);
  });
  dateStartDescartesInput.addEventListener('change', fetchDescartes);
  dateEndDescartesInput.addEventListener('change', fetchDescartes);

  // Acciones tabla visitantes
  tableVisitantesBody.addEventListener('click', async (e) => {
    const target = e.target;
    const visitorId = target.dataset.id;

    // Eliminar
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

    // Editar
    if (target.classList.contains('btn-editar')) {
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
    }
  });

  // Acciones tabla descartes
  tableDescartesBody.addEventListener('click', async (e) => {
    const target = e.target;
    const sessionId = target.dataset.id;

    // Ver equipos
    if (target.classList.contains('btn-view-equipos')) {
      const { data, error } = await supabaseClient
        .from('equipos_descartados')
        .select('*')
        .eq('sesion_id', sessionId);

      if (error) {
        showToast('Error al cargar los equipos.', 'error');
        return;
      }

      modalEquiposTitle.textContent = `Equipos de la Sesión #${sessionId}`;
      modalEquiposList.innerHTML = data.length
        ? data.map(equipo => `
            <div class="equipo-item">
              <strong>${equipo.descripcion || 'Sin descripción'}</strong>
              <p>Marbete: ${equipo.marbete || '-'} | Serie: ${equipo.serie || '-'}</p>
            </div>
          `).join('')
        : '<p>No hay equipos registrados en esta sesión.</p>';

      modalVerEquipos.classList.add('visible');
    }

    // Eliminar sesión
    if (target.classList.contains('btn-eliminar-sesion')) {
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

  // Guardar cambios (modal editar visitante)
  formEditarVisitante.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedData = {
      nombre:  document.getElementById('edit-nombre').value,
      apellido:document.getElementById('edit-apellido').value,
      cedula:  document.getElementById('edit-cedula').value,
      sexo:    document.getElementById('edit-sexo').value,
      motivo:  document.getElementById('edit-motivo').value
    };

    const { error } = await supabaseClient.from('visitantes').update(updatedData).eq('id', editingVisitorId);
    if (error) {
      showToast('Error al guardar los cambios.', 'error');
    } else {
      showToast('Visitante actualizado con éxito.', 'success');
      modalEditarVisitante.classList.remove('visible');
      fetchVisitantes();
    }
    editingVisitorId = null;
  });

  // Cerrar modales (click fuera / X / cancelar)
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (
        e.target.classList.contains('modal-overlay') ||
        e.target.classList.contains('modal-close-btn') ||
        e.target.classList.contains('modal-cancel-btn')
      ) {
        modal.classList.remove('visible');
      }
    });
  });

  // --- 6) Exportar a Excel ---

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
    XLSX.utils.book_append_sheet(wb, ws, "Visitantes");
    XLSX.writeFile(wb, `Reporte_Visitantes_${new Date().toISOString().split('T')[0]}.xlsx`);
  });

  exportDescartesBtn.addEventListener('click', async () => {
    showToast('Generando reporte, esto puede tardar...', 'success');

    const sessionIds = currentDescartesData.map(s => s.id);
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

  // --- 7) Inicialización ---
  await fetchVisitantes(); // pestaña inicial
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
});
