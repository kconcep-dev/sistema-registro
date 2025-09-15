// js/consultar.js — compatible con/ sin vista de detalle y sin modal editar equipo

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
  const searchVisitantesInput   = document.getElementById('search-visitantes');
  const dateStartVisitantesInput= document.getElementById('date-start-visitantes');
  const dateEndVisitantesInput  = document.getElementById('date-end-visitantes');
  const exportVisitantesBtn     = document.getElementById('export-visitantes-btn');
  const tableVisitantesBody     = document.querySelector('#table-visitantes tbody');

  // Sesiones (lista)
  const searchDescartesInput    = document.getElementById('search-descartes');
  const dateStartDescartesInput = document.getElementById('date-start-descartes');
  const dateEndDescartesInput   = document.getElementById('date-end-descartes');
  const exportDescartesBtn      = document.getElementById('export-descartes-btn');
  const tableDescartesBody      = document.querySelector('#table-descartes tbody');

  // Vista detalle de sesión (puede no existir aún en tu HTML)
  const detalleSection          = document.getElementById('detalle-sesion-content');
  const btnVolverSesiones       = document.getElementById('btn-volver-sesiones');
  const detalleUnidad           = document.getElementById('detalle-unidad');
  const detalleSiace            = document.getElementById('detalle-siace');
  const detalleFecha            = document.getElementById('detalle-fecha');
  const detalleTecnico          = document.getElementById('detalle-tecnico');
  const detalleObservacion      = document.getElementById('detalle-observacion');
  const searchEquiposInput      = document.getElementById('search-equipos-sesion');
  const tableEquiposBody        = document.querySelector('#table-equipos-sesion tbody');

  // Modales
  const modalEditarVisitante    = document.getElementById('modal-editar-visitante');
  const formEditarVisitante     = document.getElementById('form-editar-visitante');

  // Modal editar equipo (puede no existir aún)
  const modalEditarEquipo       = document.getElementById('modal-editar-equipo');
  const formEditarEquipo        = document.getElementById('form-editar-equipo');

  // Toast
  const toastEl        = document.getElementById('toast-notification');
  const toastMessageEl = document.getElementById('toast-message');

  // --- 2) Estado ---
  let currentVisitorData    = [];
  let currentDescartesData  = [];
  let currentEquiposData    = [];
  let editingVisitorId      = null;
  let editingEquipoId       = null;
  let currentSessionId      = null;
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

  function showSection(sectionIdToShow) {
    tabContents.forEach(c => c.classList.remove('active'));
    const toShow = document.getElementById(sectionIdToShow);
    if (toShow) toShow.classList.add('active');
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
      return;
    }
    currentVisitorData = data || [];
    renderVisitantesTable(currentVisitorData);
  }

  function renderVisitantesTable(data) {
    if (!tableVisitantesBody) return; // si no existe la tabla, salimos
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

  // Sesiones
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
      return;
    }
    currentDescartesData = data || [];
    renderDescartesTable(currentDescartesData);
  }

  function renderDescartesTable(data) {
    if (!tableDescartesBody) return;
    tableDescartesBody.innerHTML = '';
    if (!data.length) {
      tableDescartesBody.innerHTML = '<tr><td colspan="6">No se encontraron sesiones.</td></tr>';
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
          <button class="btn-view-equipos"    data-id="${session.id}">Abrir</button>
          <button class="btn-eliminar-sesion" data-id="${session.id}">Eliminar</button>
        </td>
      `;
      tableDescartesBody.appendChild(tr);
    });
  }

  // Equipos por sesión (solo se usa si existe la vista detalle)
  async function fetchEquiposBySession(sessionId, searchTerm = '') {
    let query = supabaseClient
      .from('equipos_descartados')
      .select('*')
      .eq('sesion_id', sessionId)
      .order('created_at', { ascending: true });

    if (searchTerm) {
      const t = searchTerm;
      query = query.or(
        `descripcion.ilike.%${t}%,marbete.ilike.%${t}%,serie.ilike.%${t}%,marca.ilike.%${t}%,modelo.ilike.%${t}%,estado_equipo.ilike.%${t}%,motivo_descarte.ilike.%${t}%`
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

  function renderEquiposTable(equipos) {
    if (!tableEquiposBody) return;
    tableEquiposBody.innerHTML = '';
    if (!equipos.length) {
      tableEquiposBody.innerHTML = '<tr><td colspan="8">No hay equipos en esta sesión.</td></tr>';
      return;
    }
    equipos.forEach(eq => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${eq.descripcion || '-'}</td>
        <td>${eq.marbete || '-'}</td>
        <td>${eq.serie || '-'}</td>
        <td>${eq.marca || '-'}</td>
        <td>${eq.modelo || '-'}</td>
        <td>${eq.estado_equipo || '-'}</td>
        <td>${eq.motivo_descarte || '-'}</td>
        <td class="table-actions">
          <button class="btn-editar"  data-id="${eq.id}">Editar</button>
          <button class="btn-eliminar" data-id="${eq.id}">Eliminar</button>
        </td>
      `;
      tableEquiposBody.appendChild(tr);
    });
  }

  async function openSessionDetail(sessionId) {
    if (!detalleSection) return; // si no existe la vista detalle, no intentamos abrir
    currentSessionId = sessionId;

    const { data: sesion, error } = await supabaseClient
      .from('descartes_sesiones')
      .select('unidad_administrativa, codigo_siace, fecha, tecnico_encargado, observacion')
      .eq('id', sessionId)
      .single();

    if (error || !sesion) {
      showToast('No se pudo abrir la sesión.', 'error');
      return;
    }

    if (detalleUnidad)      detalleUnidad.textContent      = sesion.unidad_administrativa || '-';
    if (detalleSiace)       detalleSiace.textContent       = sesion.codigo_siace || '-';
    if (detalleFecha)       detalleFecha.textContent       = formatDate(sesion.fecha);
    if (detalleTecnico)     detalleTecnico.textContent     = sesion.tecnico_encargado || '-';
    if (detalleObservacion) detalleObservacion.textContent = sesion.observacion || '—';

    currentEquiposData = await fetchEquiposBySession(sessionId);
    renderEquiposTable(currentEquiposData);

    const listado = document.getElementById('descartes-content');
    if (listado) listado.classList.remove('active');
    detalleSection.classList.add('active');
  }

  function closeSessionDetail() {
    currentSessionId   = null;
    currentEquiposData = [];
    if (searchEquiposInput) searchEquiposInput.value = '';
    if (!detalleSection) return;
    detalleSection.classList.remove('active');
    const listado = document.getElementById('descartes-content');
    if (listado) listado.classList.add('active');
  }

  // --- 5) Eventos ---

  // Tabs
  if (tabsNav) {
    tabsNav.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-btn')) return;
      const tabId = e.target.dataset.tab;

      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      if (detalleSection?.classList.contains('active')) closeSessionDetail();

      tabContents.forEach(c => {
        c.classList.toggle('active', c.id === `${tabId}-content`);
      });

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
        document.getElementById('edit-nombre').value   = data.nombre || '';
        document.getElementById('edit-apellido').value = data.apellido || '';
        document.getElementById('edit-cedula').value   = data.cedula || '';
        document.getElementById('edit-sexo').value     = data.sexo || '';
        document.getElementById('edit-motivo').value   = data.motivo || '';
        modalEditarVisitante?.classList.add('visible');
      }
    });
  }

  // Guardar cambios (modal editar visitante)
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

      const { error } = await supabaseClient.from('visitantes').update(updatedData).eq('id', editingVisitorId);
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

  // Acciones tabla sesiones (abrir/eliminar)
  if (tableDescartesBody) {
    tableDescartesBody.addEventListener('click', async (e) => {
      const target = e.target;
      const sessionId = target.dataset.id;

      // Abrir detalle (solo si existe vista detalle en el HTML)
      if (target.classList.contains('btn-view-equipos')) {
        if (detalleSection) {
          await openSessionDetail(sessionId);
        } else {
          // Fallback: si no hay vista detalle aún, mostramos los equipos en consola o toast
          showToast('La vista de detalle no está disponible en este HTML.', 'error');
        }
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
  }

  // Buscar dentro de equipos de la sesión
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

  // Acciones en la tabla de equipos (editar/eliminar)
  if (tableEquiposBody) {
    tableEquiposBody.addEventListener('click', async (e) => {
      const target = e.target;
      const equipoId = target.dataset.id;

      // Eliminar equipo
      if (target.classList.contains('btn-eliminar')) {
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
            currentEquiposData = await fetchEquiposBySession(currentSessionId, term);
            renderEquiposTable(currentEquiposData);
          }
        }
      }

      // Editar equipo (solo si existe modal)
      if (target.classList.contains('btn-editar')) {
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

        // Si no hay modal en el HTML, avisamos y salimos
        if (!modalEditarEquipo || !formEditarEquipo) {
          showToast('El modal de edición de equipo no está disponible en este HTML.', 'error');
          return;
        }

        document.getElementById('edit-descripcion')?.setAttribute('value', data.descripcion || '');
        document.getElementById('edit-descripcion').value     = data.descripcion || '';
        document.getElementById('edit-marbete').value         = data.marbete || '';
        document.getElementById('edit-serie').value           = data.serie || '';
        document.getElementById('edit-marca').value           = data.marca || '';
        document.getElementById('edit-modelo').value          = data.modelo || '';
        document.getElementById('edit-estado_equipo').value   = data.estado_equipo || '';
        document.getElementById('edit-motivo_descarte').value = data.motivo_descarte || '';
        modalEditarEquipo.classList.add('visible');
      }
    });
  }

  // Guardar cambios (modal editar equipo) — solo si existe
  if (formEditarEquipo) {
    formEditarEquipo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        descripcion:     document.getElementById('edit-descripcion').value.trim(),
        marbete:         document.getElementById('edit-marbete').value.trim(),
        serie:           document.getElementById('edit-serie').value.trim(),
        marca:           document.getElementById('edit-marca').value.trim(),
        modelo:          document.getElementById('edit-modelo').value.trim(),
        estado_equipo:   document.getElementById('edit-estado_equipo').value.trim(),
        motivo_descarte: document.getElementById('edit-motivo_descarte').value.trim(),
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

  // Cerrar modales genéricos (click fuera / X / cancelar)
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

  // Volver desde detalle (si existe)
  if (btnVolverSesiones) {
    btnVolverSesiones.addEventListener('click', () => {
      closeSessionDetail();
    });
  }

  // --- 6) Exportar a Excel ---
  if (exportVisitantesBtn) {
    exportVisitantesBtn.addEventListener('click', () => {
      const ws = XLSX.utils.json_to_sheet(currentVisitorData.map(v => ({
        Nombre:  v.nombre,
        Apellido:v.apellido,
        Cedula:  v.cedula,
        Sexo:    v.sexo,
        Motivo:  v.motivo,
        Fecha:   formatDate(v.fecha),
        Hora:    formatTime(v.hora)
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Visitantes");
      XLSX.writeFile(wb, `Reporte_Visitantes_${new Date().toISOString().split('T')[0]}.xlsx`);
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
  await fetchVisitantes(); // pestaña inicial
  document.getElementById('loader').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
});
