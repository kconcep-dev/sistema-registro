// js/inventario.js

document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  const mainContent = document.getElementById('main-content');

  const searchInput = document.getElementById('filter-search');
  const estadoSelect = document.getElementById('filter-estado');
  const departamentoSelect = document.getElementById('filter-departamento');
  const actualizarBtn = document.getElementById('btn-actualizar');
  const exportarBtn = document.getElementById('btn-exportar');
  const nuevaIpBtn = document.getElementById('btn-nueva-ip');

  const tablaBody = document.querySelector('#tabla-inventario tbody');
  const tableHeaders = document.querySelectorAll('#tabla-inventario thead th[data-sort]');
  const emptyState = document.getElementById('empty-state');

  const statTotal = document.getElementById('stat-total');
  const statLibres = document.getElementById('stat-libres');
  const statAsignadas = document.getElementById('stat-asignadas');
  const statRevision = document.getElementById('stat-revision');

  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  const modalOverlay = document.getElementById('modal-ip');
  const modalTitle = document.getElementById('modal-ip-title');
  const modalCloseBtns = modalOverlay?.querySelectorAll('[data-close-modal]');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  const formIp = document.getElementById('form-ip');

  const dispositivoInput = document.getElementById('input-dispositivo');
  const tipoSelect = document.getElementById('input-tipo');
  const departamentoInput = document.getElementById('input-departamento');
  const ipOctetoInput = document.getElementById('input-ip-octeto');
  const mascaraInput = document.getElementById('input-mascara');
  const gatewayInput = document.getElementById('input-gateway');
  const dns1Input = document.getElementById('input-dns1');
  const dns2Input = document.getElementById('input-dns2');
  const notasInput = document.getElementById('input-notas');
  const estadoInput = document.getElementById('input-estado');
  const availableIpList = document.getElementById('available-ip-list');

  const confirmModal = document.getElementById('modal-confirmacion');
  const confirmCloseBtn = confirmModal?.querySelector('[data-close-confirm]');
  const confirmCancelBtn = document.getElementById('btn-confirmar-cancelar');

  const IP_PREFIX = '10.106.113.';
  const LAST_OCTET_MIN = 0;
  const LAST_OCTET_MAX = 254;

  let sessionUserId = null;
  let allRecords = [];
  let filteredRecords = [];
  let currentSort = { column: 'ip', direction: 'asc' };
  let isModalOpen = false;
  let isEditing = false;
  let editingId = null;
  let selectedFreeRecordId = null;
  let isSubmitting = false;
  let toastTimeout;

  const STATE_LABELS = {
    libre: 'Libre',
    asignada: 'Asignada',
    en_revision: 'En revisión'
  };

  const DEFAULTS = {
    mascara: '255.255.255.0',
    gateway: '10.106.113.1',
    dns1: '10.106.2.3',
    dns2: '10.106.2.4'
  };

  async function ensureSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Error obteniendo la sesión', error);
      return null;
    }
    return data?.session ?? null;
  }

  function showToast(message, type = 'success', duration = 3200) {
    clearTimeout(toastTimeout);
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;
    toastTimeout = setTimeout(() => {
      toast.className = toast.className.replace('show', '');
    }, duration);
  }

  function hideToast() {
    if (!toast) return;
    toast.className = toast.className.replace('show', '');
  }

  function toggleLoader(show) {
    if (!loader || !mainContent) return;
    loader.style.display = show ? 'flex' : 'none';
    mainContent.style.display = show ? 'none' : 'block';
  }

  function resetModalState() {
    isEditing = false;
    editingId = null;
    selectedFreeRecordId = null;
    isModalOpen = false;
    isSubmitting = false;
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('visible');
    document.body.classList.remove('modal-open');
    resetModalState();
    formIp?.reset();
    hideAvailableIpList();
  }

  function openModal({ mode = 'create', record = null } = {}) {
    if (!modalOverlay) return;
    isModalOpen = true;
    modalOverlay.classList.add('visible');
    document.body.classList.add('modal-open');

    selectedFreeRecordId = null;
    ipOctetoInput.disabled = mode === 'edit';
    availableIpList.hidden = mode === 'edit';

    if (mode === 'edit' && record) {
      isEditing = true;
      editingId = record.id;
      modalTitle.textContent = 'Editar IP';

      dispositivoInput.value = record.dispositivo ?? '';
      tipoSelect.value = record.tipo ?? 'pc';
      departamentoInput.value = record.departamento ?? '';
      estadoInput.value = record.estado ?? 'libre';
      notasInput.value = record.notas ?? '';
      mascaraInput.value = record.mascara ?? DEFAULTS.mascara;
      gatewayInput.value = record.gateway ?? DEFAULTS.gateway;
      dns1Input.value = record.dns1 ?? DEFAULTS.dns1;
      dns2Input.value = record.dns2 ?? DEFAULTS.dns2;

      const lastOctet = extractLastOctet(record.ip);
      ipOctetoInput.value = Number.isFinite(lastOctet) ? lastOctet : '';
    } else {
      isEditing = false;
      editingId = null;
      modalTitle.textContent = 'Nueva IP';
      formIp.reset();
      tipoSelect.value = 'pc';
      estadoInput.value = 'libre';
      mascaraInput.value = DEFAULTS.mascara;
      gatewayInput.value = DEFAULTS.gateway;
      dns1Input.value = DEFAULTS.dns1;
      dns2Input.value = DEFAULTS.dns2;
      ipOctetoInput.value = '';
      notasInput.value = '';
      dispositivoInput.value = '';
      departamentoInput.value = '';
      hideAvailableIpList();
    }

    updateDepartmentRequirement();
  }

  function extractLastOctet(ip = '') {
    if (!ip) return null;
    const parts = ip.split('.');
    const last = Number(parts[parts.length - 1]);
    return Number.isFinite(last) ? last : null;
  }

  function populateAvailableIpList() {
    if (!availableIpList) return;
    const libres = allRecords.filter((record) => record.estado === 'libre');
    availableIpList.innerHTML = '';

    if (!libres.length) {
      availableIpList.appendChild(createElement('div', 'available-ip-empty', 'No hay IPs libres registradas.'));
    } else {
      libres.forEach((record) => {
        const lastOctet = extractLastOctet(record.ip);
        const button = createElement('button', 'available-ip-item');
        button.type = 'button';
        button.dataset.id = record.id;
        button.dataset.octet = lastOctet ?? '';

        const ipLabel = createElement('span', null, record.ip || '');
        const deptLabel = createElement('span', null, record.departamento || 'Sin depto.');
        button.append(ipLabel, deptLabel);
        button.addEventListener('click', () => {
          ipOctetoInput.value = button.dataset.octet ?? '';
          estadoInput.value = 'asignada';
          selectedFreeRecordId = record.id;
          showToast(`IP ${record.ip} seleccionada para asignación.`, 'success', 2400);
          hideAvailableIpList();
        });
        availableIpList.appendChild(button);
      });
    }

    availableIpList.hidden = false;
  }

  function hideAvailableIpList() {
    if (!availableIpList) return;
    availableIpList.hidden = true;
  }

  function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof textContent === 'string') el.textContent = textContent;
    return el;
  }

  function updateDepartmentRequirement() {
    if (!estadoInput || !departamentoInput) return;
    const isLibre = estadoInput.value === 'libre';
    if (isLibre) {
      departamentoInput.removeAttribute('required');
    } else {
      departamentoInput.setAttribute('required', 'true');
    }
  }

  function applyRowStateClass(row, estado) {
    row.classList.remove('row-estado-libre', 'row-estado-asignada', 'row-estado-en_revision');
    if (estado === 'libre') row.classList.add('row-estado-libre');
    else if (estado === 'asignada') row.classList.add('row-estado-asignada');
    else if (estado === 'en_revision') row.classList.add('row-estado-en_revision');
  }

  function applyFilters() {
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const estadoValue = estadoSelect?.value || '';
    const departamentoValue = departamentoSelect?.value || '';

    filteredRecords = allRecords.filter((record) => {
      const matchesSearch = !searchTerm
        || (record.dispositivo || '').toLowerCase().includes(searchTerm)
        || (record.departamento || '').toLowerCase().includes(searchTerm)
        || (record.ip || '').toLowerCase().includes(searchTerm);

      const matchesEstado = !estadoValue || record.estado === estadoValue;
      const matchesDepartamento = !departamentoValue || (record.departamento || '') === departamentoValue;

      return matchesSearch && matchesEstado && matchesDepartamento;
    });

    filteredRecords = sortRecords(filteredRecords);
    renderTable(filteredRecords);
    updateCounters();
  }

  function sortRecords(records) {
    const { column, direction } = currentSort;
    const dir = direction === 'asc' ? 1 : -1;
    return [...records].sort((a, b) => {
      const valueA = getComparableValue(a, column);
      const valueB = getComparableValue(b, column);

      if (valueA < valueB) return -1 * dir;
      if (valueA > valueB) return 1 * dir;
      return 0;
    });
  }

  function getComparableValue(record, column) {
    const value = record?.[column];
    if (column === 'ip') {
      return value ? value.split('.').map(Number).reduce((acc, part) => acc * 256 + part, 0) : -1;
    }
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (typeof value === 'number') {
      return value;
    }
    return value ?? '';
  }

  function renderTable(records) {
    if (!tablaBody) return;
    tablaBody.innerHTML = '';

    if (!records.length) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    records.forEach((record) => {
      const estadoValue = record.estado || 'libre';
      const tr = document.createElement('tr');
      tr.dataset.id = record.id;
      applyRowStateClass(tr, estadoValue);

      const dispositivoTd = createElement('td', null, record.dispositivo || '—');
      const tipoTd = createElement('td', null, (record.tipo || 'pc').toUpperCase());
      const departamentoTd = createElement('td', null, record.departamento || '—');
      const ipTd = createElement('td', null, record.ip || '—');
      const mascaraTd = createElement('td', null, record.mascara || '—');
      const gatewayTd = createElement('td', null, record.gateway || '—');
      const dns1Td = createElement('td', null, record.dns1 || '—');
      const dns2Td = createElement('td', null, record.dns2 || '—');

      const estadoTd = document.createElement('td');
      const estadoPill = createElement('span', `estado-pill estado-pill--${estadoValue}`);
      estadoPill.textContent = STATE_LABELS[estadoValue] || estadoValue;
      estadoTd.appendChild(estadoPill);

      const accionesTd = document.createElement('td');
      accionesTd.classList.add('acciones-cell');
      const actionWrapper = createElement('div', 'action-buttons');

      const editarBtn = createElement('button', 'btn-action', 'Editar');
      editarBtn.type = 'button';
      editarBtn.dataset.action = 'edit';
      editarBtn.dataset.id = record.id;
      editarBtn.title = 'Editar';

      const eliminarBtn = createElement('button', 'btn-action btn-danger', 'Eliminar');
      eliminarBtn.type = 'button';
      eliminarBtn.dataset.action = 'delete';
      eliminarBtn.dataset.id = record.id;
      eliminarBtn.title = 'Eliminar';

      const estadoSelectQuick = document.createElement('select');
      estadoSelectQuick.className = 'estado-quick-select';
      estadoSelectQuick.dataset.id = record.id;
      estadoSelectQuick.title = 'Estado';
      ['libre', 'asignada', 'en_revision'].forEach((estado) => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = STATE_LABELS[estado];
        if (estado === estadoValue) option.selected = true;
        estadoSelectQuick.appendChild(option);
      });

      actionWrapper.append(editarBtn, eliminarBtn, estadoSelectQuick);
      accionesTd.appendChild(actionWrapper);

      tr.append(
        dispositivoTd,
        tipoTd,
        departamentoTd,
        ipTd,
        mascaraTd,
        gatewayTd,
        dns1Td,
        dns2Td,
        estadoTd,
        accionesTd
      );

      tablaBody.appendChild(tr);
    });

    updateSortIndicators();
  }

  function updateCounters() {
    const total = allRecords.length;
    const libres = allRecords.filter((r) => r.estado === 'libre').length;
    const asignadas = allRecords.filter((r) => r.estado === 'asignada').length;
    const revision = allRecords.filter((r) => r.estado === 'en_revision').length;

    statTotal.textContent = total;
    statLibres.textContent = libres;
    statAsignadas.textContent = asignadas;
    statRevision.textContent = revision;
  }

  function updateSortIndicators() {
    tableHeaders.forEach((th) => {
      const sortKey = th.dataset.sort;
      if (sortKey === currentSort.column) {
        th.setAttribute('data-direction', currentSort.direction);
      } else {
        th.removeAttribute('data-direction');
      }
    });
  }

  function populateDepartmentOptions() {
    if (!departamentoSelect) return;
    const selected = departamentoSelect.value;
    const uniqueDepartments = Array.from(
      new Set(
        allRecords
          .map((record) => record.departamento)
          .filter((dept) => typeof dept === 'string' && dept.trim() !== '')
      )
    ).sort((a, b) => a.localeCompare(b));

    departamentoSelect.innerHTML = '<option value="">Todos los departamentos</option>';
    uniqueDepartments.forEach((dept) => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      departamentoSelect.appendChild(option);
    });

    if (selected && uniqueDepartments.includes(selected)) {
      departamentoSelect.value = selected;
    }
  }

  async function fetchRecords({ showLoader = false } = {}) {
    if (showLoader) toggleLoader(true);
    try {
      const { data, error } = await supabaseClient
        .from('inventario_ip')
        .select('*')
        .order('ip', { ascending: true });

      if (error) throw error;

      allRecords = Array.isArray(data) ? data : [];
      populateDepartmentOptions();
      applyFilters();
    } catch (error) {
      console.error('Error al obtener inventario', error);
      showToast('Error al cargar el inventario de IPs.', 'error');
    } finally {
      if (showLoader) toggleLoader(false);
    }
  }

  function validateIp(octetValue) {
    if (octetValue === '' || octetValue === null || octetValue === undefined) {
      return { valid: false, message: 'Debes indicar el último octeto de la IP.' };
    }
    const octet = Number(octetValue);
    if (!Number.isInteger(octet) || octet < LAST_OCTET_MIN || octet > LAST_OCTET_MAX) {
      return { valid: false, message: 'El último octeto debe estar entre 0 y 254.' };
    }
    return { valid: true, value: `${IP_PREFIX}${octet}` };
  }

  function buildPayloadFromForm() {
    const dispositivo = dispositivoInput.value.trim();
    const tipo = tipoSelect.value;
    const departamento = departamentoInput.value.trim();
    const estado = estadoInput.value;
    const notas = notasInput.value.trim();

    const mascara = mascaraInput.value.trim() || DEFAULTS.mascara;
    const gateway = gatewayInput.value.trim() || DEFAULTS.gateway;
    const dns1 = dns1Input.value.trim() || DEFAULTS.dns1;
    const dns2 = dns2Input.value.trim() || DEFAULTS.dns2;

    const octetValidation = validateIp(ipOctetoInput.value);
    if (!octetValidation.valid) {
      throw new Error(octetValidation.message);
    }
    const ip = octetValidation.value;

    if (estado === 'asignada') {
      if (!dispositivo) throw new Error('Para asignar una IP debes indicar el dispositivo.');
      if (!departamento) throw new Error('Para asignar una IP debes indicar el departamento.');
    }

    return {
      ip,
      dispositivo: dispositivo || null,
      tipo: tipo || 'pc',
      departamento: departamento || null,
      estado,
      notas: notas || null,
      mascara,
      gateway,
      dns1,
      dns2
    };
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      const payload = buildPayloadFromForm();
      isSubmitting = true;
      modalSubmitBtn.disabled = true;
      modalCancelBtn.disabled = true;

      if (isEditing && editingId) {
        await updateRecord(editingId, payload);
        showToast('Registro actualizado correctamente.');
      } else if (selectedFreeRecordId) {
        await updateRecord(selectedFreeRecordId, { ...payload, estado: 'asignada' });
        showToast('IP libre asignada correctamente.');
      } else {
        await createRecord(payload);
        showToast('IP creada correctamente.');
      }

      closeModal();
      await fetchRecords();
    } catch (error) {
      const message = error?.message || 'No se pudo guardar el registro.';
      showToast(message, 'error', 4200);
      console.error('Error guardando IP', error);
    } finally {
      isSubmitting = false;
      modalSubmitBtn.disabled = false;
      modalCancelBtn.disabled = false;
    }
  }

  async function createRecord(payload) {
    const insertPayload = {
      ...payload,
      asignado_por: sessionUserId
    };

    const { error } = await supabaseClient
      .from('inventario_ip')
      .insert([insertPayload]);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Esa IP ya está registrada.');
      }
      throw error;
    }
  }

  async function updateRecord(id, payload) {
    const { error } = await supabaseClient
      .from('inventario_ip')
      .update(payload)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Esa IP ya está registrada.');
      }
      throw error;
    }
  }

  async function deleteRecord(id) {
    const { error } = await supabaseClient
      .from('inventario_ip')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '42501') {
        throw new Error('No tienes permisos para eliminar esta IP.');
      }
      throw error;
    }
  }

  async function handleDelete(id) {
    const record = allRecords.find((item) => item.id === id);
    if (!record) return;

    const confirmed = await window.showConfirmationModal(
      'Eliminar IP',
      `¿Deseas eliminar la IP ${record.ip}?`
    );

    if (!confirmed) return;

    try {
      await deleteRecord(id);
      showToast('IP eliminada correctamente.');
      await fetchRecords();
    } catch (error) {
      const message = error?.message || 'No se pudo eliminar la IP.';
      showToast(message, 'error', 4200);
      console.error('Error eliminando IP', error);
    }
  }

  async function handleQuickEstadoChange(selectEl) {
    const id = selectEl.dataset.id;
    const newEstado = selectEl.value;
    const record = allRecords.find((item) => item.id === id);
    if (!record) return;

    try {
      selectEl.disabled = true;

      if (newEstado === 'libre') {
        await updateRecord(id, {
          dispositivo: null,
          tipo: 'pc',
          departamento: null,
          notas: null,
          estado: 'libre'
        });
        showToast(`La IP ${record.ip} ahora está libre.`);
      } else if (newEstado === 'asignada') {
        if (!record.dispositivo || !record.departamento) {
          showToast('Completa los datos obligatorios antes de asignar esta IP.', 'error', 4200);
          selectEl.value = record.estado;
          openModal({ mode: 'edit', record });
          return;
        }
        await updateRecord(id, { estado: 'asignada' });
        showToast(`La IP ${record.ip} fue marcada como asignada.`);
      } else if (newEstado === 'en_revision') {
        await updateRecord(id, { estado: 'en_revision' });
        showToast(`La IP ${record.ip} se marcó en revisión.`);
      }

      await fetchRecords();
    } catch (error) {
      showToast('No se pudo actualizar el estado.', 'error', 4200);
      console.error('Error cambiando estado', error);
      selectEl.value = record.estado;
    } finally {
      selectEl.disabled = false;
    }
  }

  function exportToExcel() {
    if (!filteredRecords.length) {
      showToast('No hay registros para exportar.', 'error', 3200);
      return;
    }

    const exportRows = filteredRecords.map((record) => ({
      'Dispositivo': record.dispositivo || '',
      'Tipo': (record.tipo || 'pc').toUpperCase(),
      'Departamento': record.departamento || '',
      'Dirección IP': record.ip || '',
      'Máscara': record.mascara || '',
      'Gateway': record.gateway || '',
      'DNS 1': record.dns1 || '',
      'DNS 2': record.dns2 || '',
      'Estado': STATE_LABELS[record.estado] || record.estado
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows, {
      header: [
        'Dispositivo',
        'Tipo',
        'Departamento',
        'Dirección IP',
        'Máscara',
        'Gateway',
        'DNS 1',
        'DNS 2',
        'Estado'
      ]
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario IPs');
    const fileName = `Inventario_IPs_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('Exportación completada.');
  }

  function attachEventListeners() {
    searchInput?.addEventListener('input', () => applyFilters());
    estadoSelect?.addEventListener('change', () => applyFilters());
    departamentoSelect?.addEventListener('change', () => applyFilters());
    actualizarBtn?.addEventListener('click', () => fetchRecords());
    exportarBtn?.addEventListener('click', exportToExcel);
    nuevaIpBtn?.addEventListener('click', () => openModal({ mode: 'create' }));

    modalCloseBtns?.forEach((btn) => btn.addEventListener('click', closeModal));
    modalCancelBtn?.addEventListener('click', closeModal);
    formIp?.addEventListener('submit', handleFormSubmit);
    estadoInput?.addEventListener('change', updateDepartmentRequirement);

    ipOctetoInput?.addEventListener('focus', () => {
      if (!isEditing) {
        populateAvailableIpList();
      }
    });

    ipOctetoInput?.addEventListener('input', () => {
      selectedFreeRecordId = null;
      if (Number(ipOctetoInput.value) > LAST_OCTET_MAX) {
        ipOctetoInput.value = LAST_OCTET_MAX;
      }
    });

    document.addEventListener('click', (event) => {
      if (!availableIpList || availableIpList.hidden) return;
      const isInside = availableIpList.contains(event.target) || event.target === ipOctetoInput;
      if (!isInside) {
        hideAvailableIpList();
      }
    });

    tablaBody?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (!action) return;

      const id = target.dataset.id;
      const record = allRecords.find((item) => item.id === id);
      if (!record) return;

      if (action === 'edit') {
        openModal({ mode: 'edit', record });
      } else if (action === 'delete') {
        handleDelete(id);
      }
    });

    tablaBody?.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (target.matches('.estado-quick-select')) {
        handleQuickEstadoChange(target);
      }
    });

    tableHeaders.forEach((th) => {
      th.addEventListener('click', () => {
        const column = th.dataset.sort;
        if (!column) return;
        if (currentSort.column === column) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = column;
          currentSort.direction = 'asc';
        }
        applyFilters();
      });
    });

    confirmCloseBtn?.addEventListener('click', () => {
      confirmCancelBtn?.click();
    });

    modalOverlay?.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });
  }

  const session = await ensureSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  sessionUserId = session.user?.id || null;
  toggleLoader(true);
  attachEventListeners();
  await fetchRecords({ showLoader: false });
  toggleLoader(false);
});
