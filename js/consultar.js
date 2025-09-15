document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. PROTECCIÓN DE RUTA Y CARGA INICIAL ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- 1. ELEMENTOS DEL DOM ---
    const tabsNav = document.querySelector('.tabs-nav');
    const tabContents = document.querySelectorAll('.tab-content');

    // Visitantes
    const searchVisitantesInput = document.getElementById('search-visitantes');
    const dateStartVisitantesInput = document.getElementById('date-start-visitantes');
    const dateEndVisitantesInput = document.getElementById('date-end-visitantes');
    const exportVisitantesBtn = document.getElementById('export-visitantes-btn');
    const tableVisitantes = document.getElementById('table-visitantes');
    const tableVisitantesBody = tableVisitantes.querySelector('tbody');
    const selectAllCheckbox = document.getElementById('select-all-visitantes');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    // Descartes
    const searchDescartesInput = document.getElementById('search-descartes');
    const dateStartDescartesInput = document.getElementById('date-start-descartes');
    const dateEndDescartesInput = document.getElementById('date-end-descartes');
    const exportDescartesBtn = document.getElementById('export-descartes-btn');
    const tableDescartesBody = document.querySelector('#table-descartes tbody');

    // Modales
    const modalEditarVisitante = document.getElementById('modal-editar-visitante');
    const formEditarVisitante = document.getElementById('form-editar-visitante');
    const modalVerEquipos = document.getElementById('modal-ver-equipos');
    const modalEquiposTitle = document.getElementById('modal-equipos-title');
    const modalEquiposList = document.querySelector('.modal-list-container');

    // Toast
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 2. ESTADO ---
    let currentVisitorData = [];
    let currentDescartesData = [];
    let selectedVisitorIds = new Set();   // ids seleccionados (sólo los visibles/filtrados)
    let editingVisitorId = null;
    let searchDebounceTimeout;

    // --- 3. UTILIDADES ---
    function showToast(message, type = 'success') {
        clearTimeout(searchDebounceTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        setTimeout(() => { toastEl.className = toastEl.className.replace('show', ''); }, 3000);
    }

    // dd-mm-aaaa
    function formatDate(isoString) {
        if (!isoString) return '-';
        const [y, m, d] = isoString.includes('T')
            ? (new Date(isoString).toISOString().slice(0,10).split('-'))
            : isoString.split('-');
        return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
    }

    // hh:mm AM/PM
    function formatTime(isoString) {
        if (!isoString) return '-';
        const timePart = isoString.split('T')[1] ? isoString : `1970-01-01T${isoString}`;
        const date = new Date(timePart);
        return new Intl.DateTimeFormat('es-PA', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
    }

    function updateBulkUI() {
        // select all checked si todo lo visible está seleccionado
        const total = currentVisitorData.length;
        const selected = selectedVisitorIds.size;
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = total > 0 && selected === total;
            selectAllCheckbox.indeterminate = selected > 0 && selected < total;
            selectAllCheckbox.disabled = total === 0;
        }
        // botón eliminar masivo: aparece sólo si hay >1 seleccionado
        if (bulkDeleteBtn) {
            if (selected > 1) {
                bulkDeleteBtn.style.display = 'inline-flex';
                bulkDeleteBtn.textContent = `Eliminar (${selected})`;
            } else {
                bulkDeleteBtn.style.display = 'none';
            }
        }
        // sincroniza checks visibles
        tableVisitantesBody.querySelectorAll('input.row-check').forEach(cb => {
            const id = Number(cb.dataset.id);
            cb.checked = selectedVisitorIds.has(id);
        });
    }

    function clearSelection() {
        selectedVisitorIds.clear();
        updateBulkUI();
    }

    // --- 4. FETCH & RENDER ---
    async function fetchVisitantes() {
        const searchTerm = searchVisitantesInput.value.trim();
        const startDate = dateStartVisitantesInput.value;
        const endDate = dateEndVisitantesInput.value;

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
        currentVisitorData = data || [];
        renderVisitantesTable(currentVisitorData);
        clearSelection(); // resetea selección al cambiar el set visible
    }

    function renderVisitantesTable(data) {
        tableVisitantesBody.innerHTML = '';
        const colCount = tableVisitantes.querySelectorAll('thead th').length || 8;

        if (!data || data.length === 0) {
            tableVisitantesBody.innerHTML = `<tr><td colspan="${colCount}">No se encontraron registros.</td></tr>`;
            return;
        }

        data.forEach(visitor => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="row-select-cell">
                  <input type="checkbox" class="row-check" data-id="${visitor.id}">
                </td>
                <td>${visitor.nombre}</td>
                <td>${visitor.apellido}</td>
                <td>${visitor.cedula}</td>
                <td>${visitor.motivo}</td>
                <td>${formatDate(visitor.fecha)}</td>
                <td>${formatTime(visitor.hora)}</td>
                <td class="table-actions">
                    <button class="btn-editar" data-id="${visitor.id}">Editar</button>
                    <button class="btn-eliminar" data-id="${visitor.id}">Eliminar</button>
                </td>
            `;
            tableVisitantesBody.appendChild(tr);
        });
        updateBulkUI();
    }

    async function fetchDescartes() {
        const searchTerm = searchDescartesInput.value.trim();
        const startDate = dateStartDescartesInput.value;
        const endDate = dateEndDescartesInput.value;

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
        currentDescartesData = data || [];
        renderDescartesTable(currentDescartesData);
    }

    function renderDescartesTable(data) {
        tableDescartesBody.innerHTML = '';
        if (!data || data.length === 0) {
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
                <td>${session.equipos_descartados[0].count}</td>
                <td class="table-actions">
                    <button class="btn-view-equipos" data-id="${session.id}">Ver Equipos</button>
                    <button class="btn-eliminar-sesion" data-id="${session.id}">Eliminar</button>
                </td>
            `;
            tableDescartesBody.appendChild(tr);
        });
    }

    // --- 5. EVENTOS ---

    // Pestañas
    tabsNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            const tabId = e.target.dataset.tab;
            tabsNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${tabId}-content`);
            });

            if (tabId === 'visitantes') fetchVisitantes();
            else if (tabId === 'descartes') fetchDescartes();
        }
    });

    // Filtros
    searchVisitantesInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(fetchVisitantes, 300);
    });
    dateStartVisitantesInput.addEventListener('change', fetchVisitantes);
    dateEndVisitantesInput.addEventListener('change', fetchVisitantes);

    searchDescartesInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(fetchDescartes, 300);
    });
    dateStartDescartesInput.addEventListener('change', fetchDescartes);
    dateEndDescartesInput.addEventListener('change', fetchDescartes);

    // Select all visitantes
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            selectedVisitorIds.clear();
            if (selectAllCheckbox.checked) {
                currentVisitorData.forEach(v => selectedVisitorIds.add(Number(v.id)));
            }
            updateBulkUI();
        });
    }

    // Check individual filas (delegación)
    tableVisitantesBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-check')) {
            const id = Number(e.target.dataset.id);
            if (e.target.checked) selectedVisitorIds.add(id);
            else selectedVisitorIds.delete(id);
            updateBulkUI();
        }
    });

    // Eliminar masivo
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedVisitorIds);
            if (ids.length < 2) return; // sólo si hay >1
            const confirmed = await window.showConfirmationModal(
                'Eliminar seleccionados',
                `Se eliminarán ${ids.length} visitantes seleccionados. ¿Continuar?`
            );
            if (!confirmed) return;

            const { error } = await supabaseClient.from('visitantes').delete().in('id', ids);
            if (error) {
                showToast('Error al eliminar seleccionados.', 'error');
                return;
            }
            showToast('Registros eliminados.', 'success');
            await fetchVisitantes();
        });
    }

    // Acciones en la tabla de Visitantes (editar/eliminar individual)
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
                if (error) showToast('Error al eliminar el registro.', 'error');
                else {
                    showToast('Registro eliminado con éxito.', 'success');
                    await fetchVisitantes();
                }
            }
        }

        if (target.classList.contains('btn-editar')) {
            const { data, error } = await supabaseClient.from('visitantes').select('*').eq('id', visitorId).single();
            if (error) {
                showToast('No se pudieron cargar los datos del visitante.', 'error');
                return;
            }
            editingVisitorId = data.id;
            document.getElementById('edit-nombre').value = data.nombre;
            document.getElementById('edit-apellido').value = data.apellido;
            document.getElementById('edit-cedula').value = data.cedula;
            document.getElementById('edit-sexo').value = data.sexo;
            document.getElementById('edit-motivo').value = data.motivo;
            modalEditarVisitante.classList.add('visible');
        }
    });

    // Acciones en la tabla de Descartes
    tableDescartesBody.addEventListener('click', async (e) => {
        const target = e.target;
        const sessionId = target.dataset.id;

        if (target.classList.contains('btn-view-equipos')) {
            const { data, error } = await supabaseClient.from('equipos_descartados').select('*').eq('sesion_id', sessionId);
            if (error) {
                showToast('Error al cargar los equipos.', 'error');
                return;
            }
            modalEquiposTitle.textContent = `Equipos de la Sesión #${sessionId}`;
            modalEquiposList.innerHTML = (data && data.length)
                ? data.map(eq => `
                    <div class="equipo-item">
                        <strong>${eq.descripcion || 'Sin descripción'}</strong>
                        <p>Marbete: ${eq.marbete || '-'} | Serie: ${eq.serie || '-'}</p>
                    </div>
                `).join('')
                : '<p>No hay equipos registrados en esta sesión.</p>';
            modalVerEquipos.classList.add('visible');
        }

        if (target.classList.contains('btn-eliminar-sesion')) {
            const confirmed = await window.showConfirmationModal(
                'Eliminar Sesión',
                'Esto eliminará la sesión Y TODOS los equipos asociados. ¿Estás seguro?'
            );
            if (confirmed) {
                const { error } = await supabaseClient.from('descartes_sesiones').delete().eq('id', sessionId);
                if (error) showToast('Error al eliminar la sesión.', 'error');
                else {
                    showToast('Sesión eliminada con éxito.', 'success');
                    await fetchDescartes();
                }
            }
        }
    });

    // Guardar cambios del modal de edición de visitante
    formEditarVisitante.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedData = {
            nombre: document.getElementById('edit-nombre').value,
            apellido: document.getElementById('edit-apellido').value,
            cedula: document.getElementById('edit-cedula').value,
            sexo: document.getElementById('edit-sexo').value,
            motivo: document.getElementById('edit-motivo').value
        };
        const { error } = await supabaseClient.from('visitantes').update(updatedData).eq('id', editingVisitorId);
        if (error) showToast('Error al guardar los cambios.', 'error');
        else {
            showToast('Visitante actualizado con éxito.', 'success');
            modalEditarVisitante.classList.remove('visible');
            await fetchVisitantes();
        }
        editingVisitorId = null;
    });

    // Cerrar modales globales
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target.classList.contains('modal-overlay') ||
                e.target.classList.contains('modal-close-btn') ||
                e.target.classList.contains('modal-cancel-btn')) {
                modal.classList.remove('visible');
            }
        });
    });

    // --- 6. EXPORTAR ---
    exportVisitantesBtn.addEventListener('click', () => {
        const ws = XLSX.utils.json_to_sheet(currentVisitorData.map(v => ({
            Nombre: v.nombre,
            Apellido: v.apellido,
            Cedula: v.cedula,
            Sexo: v.sexo,
            Motivo: v.motivo,
            Fecha: formatDate(v.fecha),
            Hora: formatTime(v.hora)
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
            "Código SIACE": e.descartes_sesiones.codigo_siace,
            "Descripción": e.descripcion,
            "Marca": e.marca,
            "Modelo": e.modelo,
            "Serie": e.serie,
            "Marbete": e.marbete,
            "Estado del Equipo": e.estado_equipo,
            "Motivo del Descarte": e.motivo_descarte,
            "Técnico": e.descartes_sesiones.tecnico_encargado,
            "Fecha": formatDate(e.descartes_sesiones.fecha)
        }));

        const ws = XLSX.utils.json_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Equipos Descartados");
        XLSX.writeFile(wb, `Reporte_Descartes_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // --- 7. INIT ---
    await fetchVisitantes();
    document.getElementById('loader').style.display = 'none';
    document.getElementById('main-content').style.display = 'flex';
});
