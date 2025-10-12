// js/inventario.js

document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  const mainContent = document.getElementById('main-content');

  const searchInput = document.getElementById('filter-search');
  const estadoSelect = document.getElementById('filter-estado');
  const departamentoSelect = document.getElementById('filter-departamento');
  const actualizarBtn = document.getElementById('btn-actualizar');
  const exportarBtn = document.getElementById('btn-exportar');
  const nuevoBtn = document.getElementById('btn-nuevo');
  const totalsToggleBtn = document.getElementById('btn-toggle-totales');
  const inventoryContainerEl = document.querySelector('.inventory-container');
  const statsOverviewSection = document.querySelector('.stats-overview');
  const filtersBar = document.querySelector('.filters-bar');

  const tablaBody = document.querySelector('#tabla-inventario tbody');
  const tableHeaders = document.querySelectorAll('#tabla-inventario thead th[data-sort]');
  const emptyState = document.getElementById('empty-state');

  const statTotalGeneral = document.getElementById('stat-total-general');
  const statTotalIp = document.getElementById('stat-total-ip');
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
  const dispositivoFormGroup = dispositivoInput?.closest('.form-group') || null;
  const dispositivoFeedback = document.getElementById('input-dispositivo-feedback');
  const tipoSelect = document.getElementById('input-tipo');
  const tipoCustomInput = document.getElementById('input-tipo-custom');
  const departamentoInput = document.getElementById('input-departamento');
  const departamentoCustomInput = document.getElementById('input-departamento-custom');
  const departamentoFormGroup = departamentoInput?.closest('.form-group') || null;
  const departamentoFeedback = document.getElementById('input-departamento-feedback');
  const ipInput = document.getElementById('input-ip');
  const mascaraInput = document.getElementById('input-mascara');
  const gatewayInput = document.getElementById('input-gateway');
  const dns1Input = document.getElementById('input-dns1');
  const dns2Input = document.getElementById('input-dns2');
  const notasInput = document.getElementById('input-notas');
  const estadoInput = document.getElementById('input-estado');
  const propietarioInput = document.getElementById('input-propietario');
  const usuarioInput = document.getElementById('input-usuario');
  const tieneIpRadios = document.querySelectorAll('input[name="tiene_ip"]');
  const ipDetailsContainer = document.getElementById('ip-details-container');
  const estadoFieldGroup = document.getElementById('estado-field-group');
  const availableIpList = document.getElementById('available-ip-list');

  const confirmModal = document.getElementById('modal-confirmacion');
  const confirmCloseBtn = confirmModal?.querySelector('[data-close-confirm]');
  const confirmCancelBtn = document.getElementById('btn-confirmar-cancelar');

  const IP_PREFIX = '10.106.113.';
  const NO_IP_LABEL = 'Sin Dirección IP';
  const NO_IP_LABEL_LOWER = NO_IP_LABEL.toLowerCase();
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
  let lastTieneIpSelection = true;
  let lastKnownEstadoValue = null;
  let skipClearDeviceFieldsOnNextEstadoApply = false;

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

  const PREDEFINED_TIPO_OPTIONS = [
    { value: 'pc', label: 'PC' },
    { value: 'router', label: 'Router' },
    { value: 'impresora', label: 'Impresora' },
    { value: 'switch', label: 'Switch' }
  ];
  const PREDEFINED_TIPOS = PREDEFINED_TIPO_OPTIONS.map((option) => option.value);
  const PREDEFINED_DEPARTAMENTOS = [
    'Arte y Cultura',
    'Compras',
    'Contabilidad',
    'Dirección',
    'Estadística',
    'FECE',
    'Fondo Agropecuario',
    'Ingeniería',
    'Mantenimiento',
    'RR. HH.',
    'SIACE',
    'Soporte Técnico',
    'Subdirección',
    'Supervición'
  ];

  const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

  const SIMILAR_DEPARTMENT_DISTANCE_THRESHOLD = 1;

  const OTHER_DEPARTMENT_VALUE = '__other__';
  const OTHER_TIPO_VALUE = 'otro';

  let departmentOptionsMap = new Map();
  let departmentOptions = [...PREDEFINED_DEPARTAMENTOS];
  let tipoOptionsMap = new Map();
  let tipoOptions = [];

  const CLEAR_ON_FREE_DEFAULTS = {
    dispositivo: '',
    tipo: null,
    departamento: '',
    notas: '',
    propietario: '',
    usuario: '',
    asignado_por: null
  };

  const MESSAGE_LIBRE_WITH_DATA = 'Con estado Libre la IP no puede tener datos de equipo; limpia los campos o cámbiala a Asignada.';
  const MESSAGE_NO_IP_MISSING_FIELDS = 'Para registrar un equipo sin IP indica el dispositivo y al menos otro dato (tipo, departamento, propietario o usuario).';
  const MESSAGE_DUPLICATE_RECORD = 'Este registro ya existe en el inventario. Búscalo en la tabla y edítalo en lugar de duplicarlo.';
  const MESSAGE_DUPLICATE_DEVICE_INLINE = 'Este dispositivo ya existe en la base de datos. Edita el registro existente desde la tabla.';

  function hasIpValue(value) {
    if (!value) return false;
    return String(value).toLowerCase() !== NO_IP_LABEL_LOWER;
  }

  function formatTipoLabel(value, { fallback = '—' } = {}) {
    if (value === undefined || value === null) {
      return fallback;
    }

    const trimmed = normalizeTipo(value);
    if (!trimmed) {
      return fallback;
    }

    const key = createTipoKey(trimmed);
    if (key) {
      const option = tipoOptionsMap.get(key);
      if (option) {
        return option.label;
      }
    }

    const predefined = PREDEFINED_TIPO_OPTIONS.find((option) => option.value === trimmed.toLowerCase());
    if (predefined) {
      return predefined.label;
    }

    return trimmed;
  }

  function activateCustomTipoInput(value = '', { focus = false } = {}) {
    if (!tipoCustomInput) return;
    tipoCustomInput.hidden = false;
    tipoCustomInput.value = value;
    if (focus) {
      tipoCustomInput.focus();
      tipoCustomInput.select();
    }
  }

  function deactivateCustomTipoInput(clearValue = true) {
    if (!tipoCustomInput) return;
    if (clearValue) {
      tipoCustomInput.value = '';
    }
    tipoCustomInput.hidden = true;
  }

  function isCustomTipoInputActive() {
    return !!tipoCustomInput && !tipoCustomInput.hidden;
  }

  function setTipoSelectValue(value) {
    if (!tipoSelect) return;
    if (value === undefined || value === null || value === '') {
      tipoSelect.value = '';
      if (tipoSelect.value !== '') {
        tipoSelect.selectedIndex = -1;
      }
      deactivateCustomTipoInput();
      return;
    }

    const valueAsString = String(value);
    if (valueAsString.toLowerCase() === OTHER_TIPO_VALUE) {
      tipoSelect.value = '';
      if (tipoSelect.value !== '') {
        tipoSelect.selectedIndex = -1;
      }
      activateCustomTipoInput('', { focus: false });
      return;
    }

    const targetKey = createTipoKey(valueAsString);
    if (targetKey) {
      const matchingOption = Array.from(tipoSelect.options || []).find((option) => {
        if (option.value === OTHER_TIPO_VALUE) return false;
        return createTipoKey(option.value) === targetKey;
      });

      if (matchingOption) {
        tipoSelect.value = matchingOption.value;
        deactivateCustomTipoInput();
        return;
      }
    }

    tipoSelect.value = '';
    if (tipoSelect.value !== '') {
      tipoSelect.selectedIndex = -1;
    }
    const displayValue = typeof value === 'string' && valueAsString.toLowerCase() !== OTHER_TIPO_VALUE ? value : '';
    activateCustomTipoInput(displayValue, { focus: false });
  }

  function handleTipoSelectChange() {
    if (!tipoSelect) return;
    const { value } = tipoSelect;

    if (value === OTHER_TIPO_VALUE) {
      tipoSelect.value = '';
      if (tipoSelect.value !== '') {
        tipoSelect.selectedIndex = -1;
      }
      activateCustomTipoInput('', { focus: true });
      return;
    }

    if (!value) {
      deactivateCustomTipoInput();
      return;
    }

    deactivateCustomTipoInput();
  }

  function normalizeTipo(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  function createTipoKey(value) {
    const normalized = normalizeTipo(value);
    if (!normalized) return '';
    return normalized.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();
  }

  function scoreTipoLabel(label) {
    const normalized = normalizeTipo(label);
    if (!normalized) return 0;

    let score = 0;

    const normalizedNfd = normalized.normalize('NFD');
    if (/[\u0300-\u036f]/.test(normalizedNfd)) {
      score += 2;
    }

    if (normalized === normalized.toLocaleUpperCase('es')) {
      score += 3;
    }

    normalized.split(/\s+/).forEach((word) => {
      if (!word) return;
      const firstChar = word.charAt(0);
      if (firstChar === firstChar.toLocaleUpperCase('es')) {
        score += 1;
      }
    });

    return score + normalized.length / 100;
  }

  function chooseBetterTipoOption(existingOption, candidateOption) {
    if (!existingOption) return candidateOption;
    if (!candidateOption) return existingOption;

    const existingScore = scoreTipoLabel(existingOption.label);
    const candidateScore = scoreTipoLabel(candidateOption.label);

    if (candidateScore > existingScore) {
      return candidateOption;
    }

    if (candidateScore < existingScore) {
      return existingOption;
    }

    return candidateOption.label.localeCompare(existingOption.label, 'es', { sensitivity: 'accent' }) < 0
      ? candidateOption
      : existingOption;
  }

  const OTHER_TIPO_KEY = createTipoKey(OTHER_TIPO_VALUE);

  function normalizeDepartment(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  function createDepartmentKey(value) {
    const normalized = normalizeDepartment(value);
    if (!normalized) return '';
    return normalized.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();
  }

  function normalizeForSearch(value) {
    if (typeof value !== 'string') return '';
    return value
      .trim()
      .normalize('NFD')
      .replace(DIACRITICS_REGEX, '')
      .toLowerCase();
  }

  function normalizeDeviceValue(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  function createDeviceKey(value) {
    const normalized = normalizeDeviceValue(value);
    return normalized ? normalized.toLowerCase() : '';
  }

  function findDeviceDuplicate(value, { excludeId = null } = {}) {
    const key = createDeviceKey(value);
    if (!key) return null;

    return allRecords.find((record) => {
      if (!record?.dispositivo) return false;
      if (excludeId && record.id === excludeId) return false;
      return createDeviceKey(record.dispositivo) === key;
    }) || null;
  }

  function findIpDuplicate(value, { excludeId = null } = {}) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || !hasIpValue(normalized)) return null;

    return allRecords.find((record) => {
      if (!record?.ip || !hasIpValue(record.ip)) return false;
      if (excludeId && record.id === excludeId) return false;
      return String(record.ip).trim() === normalized;
    }) || null;
  }

  function formatDepartmentLabel(value) {
    const normalized = normalizeDepartment(value);
    if (!normalized) return '';

    const firstChar = normalized.charAt(0);
    const rest = normalized.slice(1);
    const upperFirstChar = firstChar.toLocaleUpperCase('es');

    return `${upperFirstChar}${rest}`;
  }

  function scoreDepartmentLabel(value) {
    const normalized = normalizeDepartment(value);
    if (!normalized) return 0;

    let score = 0;

    const normalizedNfd = normalized.normalize('NFD');
    if (/[\u0300-\u036f]/.test(normalizedNfd)) {
      score += 4;
    }

    const words = normalized.split(/\s+/);
    words.forEach((word) => {
      if (!word) return;
      const firstChar = word.charAt(0);
      if (firstChar === firstChar.toLocaleUpperCase('es')) {
        score += 1;
      }
      if (word === word.toLocaleUpperCase('es') && word.length > 1) {
        score += 2;
      }
    });

    return score + normalized.length / 100;
  }

  function chooseBetterDepartmentLabel(currentValue, candidateValue) {
    if (!currentValue) return candidateValue;
    if (!candidateValue) return currentValue;

    const currentScore = scoreDepartmentLabel(currentValue);
    const candidateScore = scoreDepartmentLabel(candidateValue);

    if (candidateScore > currentScore) {
      return candidateValue;
    }

    if (candidateScore < currentScore) {
      return currentValue;
    }

    return candidateValue.localeCompare(currentValue, 'es', { sensitivity: 'accent' }) < 0
      ? candidateValue
      : currentValue;
  }

  const DEPARTMENT_DICTIONARY = new Map(
    PREDEFINED_DEPARTAMENTOS.map((dept) => [createDepartmentKey(dept), formatDepartmentLabel(dept)])
  );

  function detectOrthographyIssue(value) {
    const normalized = normalizeDepartment(value);
    if (!normalized) return null;
    const words = normalized.split(/\s+/);
    let hasCorrection = false;

    const correctedWords = words.map((word) => {
      if (!word) return word;

      const isAcronym = word === word.toLocaleUpperCase('es');
      if (isAcronym) return word;

      const simplified = word.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();

      if (/(cion|sion|xion)\b/.test(simplified) && !/(ción|sión|xión)\b/i.test(word)) {
        hasCorrection = true;
        return word.replace(/(cion|sion|xion)\b/i, (match) => {
          const lowerMatch = match.toLowerCase();
          if (lowerMatch === 'cion') return 'ción';
          if (lowerMatch === 'sion') return 'sión';
          return 'xión';
        });
      }

      return word;
    });

    if (hasCorrection) {
      const suggestion = formatDepartmentLabel(correctedWords.join(' '));
      return {
        message: `Revisa la ortografía del departamento. Debe escribirse "${suggestion}".`,
        suggestion
      };
    }

    return null;
  }

  function getLevenshteinDistance(a, b) {
    if (a === b) return 0;
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    const matrix = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

    for (let i = 0; i <= lenA; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= lenB; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= lenA; i += 1) {
      for (let j = 1; j <= lenB; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[lenA][lenB];
  }

  function findSimilarDepartment(value, { excludeKey = '' } = {}) {
    const targetKey = createDepartmentKey(value);
    if (!targetKey) return null;

    let closest = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    departmentOptionsMap.forEach((existingValue, existingKey) => {
      if (!existingKey || existingKey === excludeKey) return;
      const distance = getLevenshteinDistance(targetKey, existingKey);
      if (distance > 0 && distance <= SIMILAR_DEPARTMENT_DISTANCE_THRESHOLD && distance < bestDistance) {
        bestDistance = distance;
        closest = existingValue;
      }
    });

    if (closest) {
      return { match: closest, distance: bestDistance };
    }

    return null;
  }

  function setDepartamentoFeedback(message = '') {
    if (!departamentoFeedback || !departamentoFormGroup) return;
    if (message) {
      departamentoFeedback.textContent = message;
      departamentoFeedback.hidden = false;
      departamentoFormGroup.classList.add('has-error');
      departamentoCustomInput?.setAttribute('aria-invalid', 'true');
    } else {
      departamentoFeedback.textContent = '';
      departamentoFeedback.hidden = true;
      departamentoFormGroup.classList.remove('has-error');
      departamentoCustomInput?.removeAttribute('aria-invalid');
    }
  }

  function clearDepartamentoFeedback() {
    setDepartamentoFeedback('');
  }

  function setDispositivoFeedback(message = '') {
    if (!dispositivoFeedback || !dispositivoFormGroup) return;
    if (message) {
      dispositivoFeedback.textContent = message;
      dispositivoFeedback.hidden = false;
      dispositivoFormGroup.classList.add('has-error');
      dispositivoInput?.setAttribute('aria-invalid', 'true');
    } else {
      dispositivoFeedback.textContent = '';
      dispositivoFeedback.hidden = true;
      dispositivoFormGroup.classList.remove('has-error');
      dispositivoInput?.removeAttribute('aria-invalid');
    }
  }

  function clearDispositivoFeedback() {
    setDispositivoFeedback('');
  }

  function validateCustomDepartmentInput(value, { allowExistingMatch = false } = {}) {
    const normalizedValue = normalizeDepartment(value);

    if (!normalizedValue) {
      return { valid: false, message: 'Debes escribir el nombre del departamento.' };
    }

    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(normalizedValue)) {
      return { valid: false, message: 'El nombre del departamento debe iniciar con una letra.' };
    }

    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,&()/+-]*$/.test(normalizedValue)) {
      return { valid: false, message: 'El nombre del departamento contiene caracteres no permitidos.' };
    }

    const firstChar = normalizedValue.charAt(0);
    const firstCharUpper = firstChar.toLocaleUpperCase('es');
    const firstCharLower = firstChar.toLocaleLowerCase('es');

    if (firstCharUpper === firstCharLower || firstChar !== firstCharUpper) {
      const isAllUppercase = normalizedValue === normalizedValue.toLocaleUpperCase('es');
      if (!isAllUppercase) {
        return { valid: false, message: 'La primera letra debe estar en mayúscula.' };
      }
    }

    const formatted = formatDepartmentLabel(normalizedValue);
    const key = createDepartmentKey(formatted);

    const dictionaryMatch = DEPARTMENT_DICTIONARY.get(key);
    if (dictionaryMatch && dictionaryMatch !== formatted) {
      return {
        valid: false,
        message: `Revisa la ortografía del departamento. Debe escribirse "${dictionaryMatch}".`,
        suggestion: dictionaryMatch
      };
    }

    const orthographyIssue = detectOrthographyIssue(normalizedValue);
    if (orthographyIssue) {
      return { valid: false, message: orthographyIssue.message, suggestion: orthographyIssue.suggestion };
    }

    const existingValue = departmentOptionsMap.get(key);

    if (existingValue && !allowExistingMatch) {
      if (existingValue === formatted) {
        return {
          valid: false,
          message: 'Ese departamento ya existe en la lista. Selecciónalo desde el menú desplegable.',
          duplicateValue: existingValue
        };
      }

      return {
        valid: true,
        formatted,
        normalized: normalizedValue,
        key,
        replacesExisting: true,
        shouldRegisterOption: true,
        previousValue: existingValue
      };
    }

    if (!existingValue) {
      const similar = findSimilarDepartment(formatted, { excludeKey: key });
      if (similar) {
        return {
          valid: false,
          message: `Revisa la ortografía del departamento. Ya existe "${similar.match}" en la lista.`,
          suggestion: similar.match
        };
      }
    }

    return {
      valid: true,
      formatted,
      normalized: normalizedValue,
      key,
      replacesExisting: false,
      shouldRegisterOption: !existingValue
    };
  }

  function isCustomDepartamentoInputActive() {
    return !!departamentoCustomInput && !departamentoCustomInput.hidden;
  }

  function activateCustomDepartamentoInput(value = '', { focus = false } = {}) {
    if (!departamentoCustomInput) return;
    if (departamentoInput) {
      departamentoInput.value = OTHER_DEPARTMENT_VALUE;
    }
    departamentoCustomInput.hidden = false;
    departamentoCustomInput.value = value;
    if (focus) {
      departamentoCustomInput.focus();
      departamentoCustomInput.select();
    }
    clearDepartamentoFeedback();
    updateDepartamentoRequiredState();
  }

  function deactivateCustomDepartamentoInput(clearValue = true) {
    if (!departamentoCustomInput) return;
    if (clearValue) {
      departamentoCustomInput.value = '';
    }
    departamentoCustomInput.hidden = true;
    clearDepartamentoFeedback();
    updateDepartamentoRequiredState();
  }

  function updateDepartamentoRequiredState() {
    if (!estadoInput || !departamentoInput) return;
    const isLibre = estadoInput.value === 'libre';

    if (isLibre) {
      departamentoInput.removeAttribute('required');
      departamentoCustomInput?.removeAttribute('required');
      return;
    }

    if (isCustomDepartamentoInputActive()) {
      departamentoInput.removeAttribute('required');
      departamentoCustomInput?.setAttribute('required', 'true');
    } else {
      departamentoInput.setAttribute('required', 'true');
      departamentoCustomInput?.removeAttribute('required');
    }
  }

  function findDepartmentMatch(value) {
    const key = createDepartmentKey(value);
    if (!key) return '';
    return departmentOptionsMap.get(key) || '';
  }

  function setDepartamentoSelectValue(selectEl, value) {
    if (!selectEl) return false;
    const targetKey = createDepartmentKey(value);
    if (!targetKey) {
      selectEl.value = '';
      return false;
    }

    const option = Array.from(selectEl.options || []).find(
      (opt) => createDepartmentKey(opt.value) === targetKey
    );

    if (option) {
      selectEl.value = option.value;
      return true;
    }

    return false;
  }

  function setDepartamentoFieldValue(value) {
    if (!departamentoInput) return;
    const normalizedValue = normalizeDepartment(value);
    const formattedValue = formatDepartmentLabel(normalizedValue);

    if (!normalizedValue) {
      departamentoInput.value = '';
      deactivateCustomDepartamentoInput();
      return;
    }

    const match = findDepartmentMatch(formattedValue || normalizedValue);
    if (match && setDepartamentoSelectValue(departamentoInput, match)) {
      deactivateCustomDepartamentoInput();
      return;
    }

    departamentoInput.value = OTHER_DEPARTMENT_VALUE;
    activateCustomDepartamentoInput(formattedValue || normalizedValue, { focus: false });
  }

  function resolveDepartamentoValue({ requireMatch = false } = {}) {
    const isCustomActive = isCustomDepartamentoInputActive();

    if (isCustomActive) {
      const value = normalizeDepartment(departamentoCustomInput?.value || '');
      if (requireMatch && !value) {
        throw new Error('Selecciona un departamento de la lista o usa "Otro" para añadir uno nuevo.');
      }
      return { value, isCustom: true, isFromList: false };
    }

    if (!departamentoInput) {
      return { value: '', isCustom: false, isFromList: false };
    }

    const selectedValue = departamentoInput.value;

    if (!selectedValue) {
      return { value: '', isCustom: false, isFromList: false };
    }

    if (selectedValue === OTHER_DEPARTMENT_VALUE) {
      const customValue = normalizeDepartment(departamentoCustomInput?.value || '');
      if (requireMatch && !customValue) {
        throw new Error('Selecciona un departamento de la lista o usa "Otro" para añadir uno nuevo.');
      }
      return { value: customValue, isCustom: true, isFromList: false };
    }

    const match = findDepartmentMatch(selectedValue);
    if (match) {
      return { value: match, isCustom: false, isFromList: true };
    }

    if (requireMatch) {
      throw new Error('Selecciona un departamento de la lista o usa "Otro" para añadir uno nuevo.');
    }

    return { value: normalizeDepartment(selectedValue), isCustom: false, isFromList: false };
  }

  function handleDepartamentoInputChange() {
    if (!departamentoInput) return;
    const { value } = departamentoInput;

    if (!value) {
      deactivateCustomDepartamentoInput(false);
      clearDepartamentoFeedback();
      return;
    }

    if (value === OTHER_DEPARTMENT_VALUE) {
      activateCustomDepartamentoInput('', { focus: true });
      return;
    }

    const match = findDepartmentMatch(value);
    if (match) {
      setDepartamentoSelectValue(departamentoInput, match);
    }

    clearDepartamentoFeedback();
    deactivateCustomDepartamentoInput(false);
  }

  function handleDepartamentoCustomInput() {
    if (!departamentoCustomInput) return;
    updateDepartamentoRequiredState();

    const value = departamentoCustomInput.value;
    if (!normalizeDepartment(value)) {
      clearDepartamentoFeedback();
      return;
    }

    const validation = validateCustomDepartmentInput(value);
    if (!validation.valid) {
      setDepartamentoFeedback(validation.message);
    } else {
      clearDepartamentoFeedback();
    }
  }

  function handleDispositivoInputValidation() {
    if (!dispositivoInput) return;
    const value = dispositivoInput.value;
    const currentId = isEditing ? editingId : selectedFreeRecordId;
    const duplicate = findDeviceDuplicate(value, { excludeId: currentId });
    if (duplicate) {
      setDispositivoFeedback(MESSAGE_DUPLICATE_DEVICE_INLINE);
    } else {
      clearDispositivoFeedback();
    }
  }

  function updateTipoFormOptions({ previousValue = '', previousCustomValue = '', customActive = false } = {}) {
    if (!tipoSelect) return;

    tipoSelect.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Selecciona un tipo';
    tipoSelect.appendChild(placeholderOption);

    tipoOptions.forEach((option) => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      tipoSelect.appendChild(optionEl);
    });

    const otherOption = document.createElement('option');
    otherOption.value = OTHER_TIPO_VALUE;
    otherOption.textContent = 'Otro';
    tipoSelect.appendChild(otherOption);

    if (customActive) {
      tipoSelect.value = '';
      activateCustomTipoInput(previousCustomValue, { focus: false });
      return;
    }

    if (previousValue && previousValue !== OTHER_TIPO_VALUE) {
      const previousKey = createTipoKey(previousValue);
      if (previousKey) {
        const matchingOption = Array.from(tipoSelect.options || []).find((option) => {
          if (option.value === OTHER_TIPO_VALUE) return false;
          return createTipoKey(option.value) === previousKey;
        });

        if (matchingOption) {
          tipoSelect.value = matchingOption.value;
          deactivateCustomTipoInput();
          return;
        }
      }
    }

    tipoSelect.value = '';
    deactivateCustomTipoInput();
  }

  function updateDepartamentoFormOptions(options = departmentOptions) {
    if (!departamentoInput) return;

    const previousValue = departamentoInput.value;
    const previousCustomValue = departamentoCustomInput?.value || '';

    departamentoInput.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Selecciona un departamento';
    departamentoInput.appendChild(placeholderOption);

    options.forEach((dept) => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      departamentoInput.appendChild(option);
    });

    const otherOption = document.createElement('option');
    otherOption.value = OTHER_DEPARTMENT_VALUE;
    otherOption.textContent = 'Otro';
    departamentoInput.appendChild(otherOption);

    if (previousValue === OTHER_DEPARTMENT_VALUE) {
      departamentoInput.value = OTHER_DEPARTMENT_VALUE;
      if (previousCustomValue) {
        activateCustomDepartamentoInput(previousCustomValue, { focus: false });
      }
      return;
    }

    if (previousValue) {
      if (!setDepartamentoSelectValue(departamentoInput, previousValue)) {
        departamentoInput.value = '';
      }
    }
  }

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

  function initializeStatsToggle() {
    if (!inventoryContainerEl || !statsOverviewSection || !totalsToggleBtn) return;

    const mobileMedia = window.matchMedia('(max-width: 768px)');

    const setExpanded = (expanded) => {
      inventoryContainerEl.dataset.stats = expanded ? 'open' : 'closed';
      totalsToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      totalsToggleBtn.classList.toggle('is-active', expanded);
    };

    const applyForViewport = (isMobile) => {
      if (isMobile) {
        setExpanded(false);
      } else {
        inventoryContainerEl.dataset.stats = 'open';
        totalsToggleBtn.setAttribute('aria-expanded', 'true');
        totalsToggleBtn.classList.remove('is-active');
      }
    };

    applyForViewport(mobileMedia.matches);

    mobileMedia.addEventListener('change', (event) => {
      applyForViewport(event.matches);
    });

    totalsToggleBtn.addEventListener('click', () => {
      if (!mobileMedia.matches) return;
      const isOpen = inventoryContainerEl.dataset.stats === 'open';
      setExpanded(!isOpen);
    });
  }

  function initializeFilterToolbar() {
    if (!filtersBar) return;

    const toolbarButtons = Array.from(filtersBar.querySelectorAll('[data-filter-target]'));
    if (!toolbarButtons.length) return;

    const mobileMedia = window.matchMedia('(max-width: 768px)');

    const openPanel = (panelName = '') => {
      filtersBar.dataset.activePanel = panelName || '';
      toolbarButtons.forEach(button => {
        const isActive = button.dataset.filterTarget === panelName;
        button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        button.classList.toggle('is-active', isActive);
      });

      if (panelName) {
        const activePanel = filtersBar.querySelector(`.filters-group[data-filter-panel="${panelName}"]`);
        const focusable = activePanel?.querySelector('input, select');
        if (focusable) {
          setTimeout(() => focusable.focus(), 150);
        }
      }
    };

    toolbarButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => {
        const target = button.dataset.filterTarget;
        if (!mobileMedia.matches) {
          const panel = filtersBar.querySelector(`.filters-group[data-filter-panel="${target}"]`);
          const focusable = panel?.querySelector('input, select');
          if (focusable) focusable.focus();
          return;
        }
        const current = filtersBar.dataset.activePanel === target ? '' : target;
        openPanel(current);
      });
    });

    document.addEventListener('click', (event) => {
      if (!mobileMedia.matches) return;
      if (!filtersBar.contains(event.target)) {
        openPanel('');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!mobileMedia.matches) return;
      if (event.key === 'Escape') {
        openPanel('');
      }
    });

    mobileMedia.addEventListener('change', (event) => {
      if (!event.matches) {
        openPanel('');
      }
    });
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
    lastKnownEstadoValue = null;
    skipClearDeviceFieldsOnNextEstadoApply = false;
    lastTieneIpSelection = getTieneIpSelection();
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('visible');
    document.body.classList.remove('modal-open');
    resetModalState();
    formIp?.reset();
    deactivateCustomTipoInput();
    deactivateCustomDepartamentoInput();
    hideAvailableIpList();
    clearDepartamentoFeedback();
    clearDispositivoFeedback();
    lastKnownEstadoValue = null;
    skipClearDeviceFieldsOnNextEstadoApply = false;
    setTieneIpState(true, { preserveValue: false });
  }

  function openModal({ mode = 'create', record = null } = {}) {
    if (!modalOverlay) return;
    isModalOpen = true;
    modalOverlay.classList.add('visible');
    document.body.classList.add('modal-open');

    selectedFreeRecordId = null;
    hideAvailableIpList();
    clearDepartamentoFeedback();
    clearDispositivoFeedback();

    if (mode === 'edit' && record) {
      isEditing = true;
      editingId = record.id;
      modalTitle.textContent = 'Editar registro';

      dispositivoInput.value = record.dispositivo ?? '';
      setTipoSelectValue(record.tipo ?? '');
      setDepartamentoFieldValue(record.departamento ?? '');
      estadoInput.value = record.estado ?? '';
      notasInput.value = record.notas ?? '';
      if (propietarioInput) propietarioInput.value = record.propietario ?? '';
      if (usuarioInput) usuarioInput.value = record.usuario ?? '';

      lastKnownEstadoValue = record.estado ?? null;
      const hasIp = hasIpValue(record.ip);
      tieneIpRadios.forEach((radio) => {
        radio.checked = hasIp ? radio.value === 'si' : radio.value === 'no';
      });

      if (hasIp) {
        ipInput.value = record.ip ?? IP_PREFIX;
        mascaraInput.value = record.mascara ?? DEFAULTS.mascara;
        gatewayInput.value = record.gateway ?? DEFAULTS.gateway;
        dns1Input.value = record.dns1 ?? DEFAULTS.dns1;
        dns2Input.value = record.dns2 ?? DEFAULTS.dns2;
      } else {
        ipInput.value = NO_IP_LABEL;
        mascaraInput.value = '';
        gatewayInput.value = '';
        dns1Input.value = '';
        dns2Input.value = '';
      }

      setTieneIpState(hasIp, { preserveValue: true });
    } else {
      isEditing = false;
      editingId = null;
      modalTitle.textContent = 'Nuevo registro';
      formIp.reset();
      setTipoSelectValue('pc');
      estadoInput.value = 'libre';
      mascaraInput.value = DEFAULTS.mascara;
      gatewayInput.value = DEFAULTS.gateway;
      dns1Input.value = DEFAULTS.dns1;
      dns2Input.value = DEFAULTS.dns2;
      notasInput.value = '';
      dispositivoInput.value = '';
      setDepartamentoFieldValue('');
      if (propietarioInput) propietarioInput.value = '';
      if (usuarioInput) usuarioInput.value = '';
      tieneIpRadios.forEach((radio) => {
        radio.checked = radio.value === 'si';
      });
      setTieneIpState(true, { preserveValue: false });
    }

    applyEstadoRules();
  }

  function populateAvailableIpList() {
    if (!availableIpList) return;
    if (!getTieneIpSelection()) {
      hideAvailableIpList();
      return;
    }

    const libres = allRecords.filter((record) => record.estado === 'libre' && hasIpValue(record.ip));
    availableIpList.innerHTML = '';

    if (!libres.length) {
      availableIpList.appendChild(createElement('div', 'available-ip-empty', 'No hay IPs libres registradas.'));
    } else {
      libres.forEach((record) => {
        const button = createElement('button', 'available-ip-item');
        button.type = 'button';
        button.dataset.id = record.id;
        button.dataset.ip = record.ip || '';

        const ipLabel = createElement('span', null, record.ip || '');
        const deptLabel = createElement('span', null, record.departamento || 'Sin depto.');
        button.append(ipLabel, deptLabel);
        button.addEventListener('click', () => {
          tieneIpRadios.forEach((radio) => {
            radio.checked = radio.value === 'si';
          });
          setTieneIpState(true, { preserveValue: true });
          ipInput.value = record.ip || IP_PREFIX;
          estadoInput.value = 'asignada';
          applyEstadoRules();
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

  function createIconButton(className, label, iconClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${className} button-with-icon`.trim();
    button.innerHTML = `
      <span class="icon icon--sm ${iconClass}" aria-hidden="true"></span>
      <span class="button-label">${label}</span>
    `;
    return button;
  }

  function clearDeviceFieldsForLibre() {
    if (!dispositivoInput || !tipoSelect || !departamentoInput || !notasInput) return;
    dispositivoInput.value = CLEAR_ON_FREE_DEFAULTS.dispositivo;
    setTipoSelectValue(CLEAR_ON_FREE_DEFAULTS.tipo);
    setDepartamentoFieldValue(CLEAR_ON_FREE_DEFAULTS.departamento);
    notasInput.value = CLEAR_ON_FREE_DEFAULTS.notas;
    if (propietarioInput) propietarioInput.value = CLEAR_ON_FREE_DEFAULTS.propietario;
    if (usuarioInput) usuarioInput.value = CLEAR_ON_FREE_DEFAULTS.usuario;
    selectedFreeRecordId = null;
    hideAvailableIpList();
    clearDispositivoFeedback();
  }

  function getTieneIpSelection() {
    const selected = Array.from(tieneIpRadios || []).find((radio) => radio.checked);
    return (selected?.value || 'si') === 'si';
  }

  function setTieneIpState(hasIp, { preserveValue = false } = {}) {
    if (!ipInput) return;

    if (hasIp) {
      ipInput.readOnly = false;
      if (!preserveValue) {
        const currentValue = ipInput.value?.trim();
        if (!currentValue || currentValue === NO_IP_LABEL) {
          ipInput.value = IP_PREFIX;
          requestAnimationFrame(() => {
            if (typeof ipInput.setSelectionRange === 'function') {
              const cursorPosition = ipInput.value.length;
              ipInput.setSelectionRange(cursorPosition, cursorPosition);
            }
          });
        }
      }

      if (mascaraInput && !mascaraInput.value) mascaraInput.value = DEFAULTS.mascara;
      if (gatewayInput && !gatewayInput.value) gatewayInput.value = DEFAULTS.gateway;
      if (dns1Input && !dns1Input.value) dns1Input.value = DEFAULTS.dns1;
      if (dns2Input && !dns2Input.value) dns2Input.value = DEFAULTS.dns2;

      ipDetailsContainer?.removeAttribute('hidden');
      estadoFieldGroup?.removeAttribute('hidden');
      if (estadoInput) {
        estadoInput.disabled = false;
        if (!estadoInput.value) {
          if (lastKnownEstadoValue) {
            estadoInput.value = lastKnownEstadoValue;
          } else {
            estadoInput.value = 'libre';
          }
        }
      }
    } else {
      ipInput.readOnly = true;
      ipInput.value = NO_IP_LABEL;
      ipDetailsContainer?.setAttribute('hidden', 'true');
      if (estadoFieldGroup) {
        estadoFieldGroup.setAttribute('hidden', 'true');
      }
      if (estadoInput) {
        if (estadoInput.value) {
          lastKnownEstadoValue = estadoInput.value;
        }
        estadoInput.value = '';
        estadoInput.disabled = true;
      }
      departamentoInput?.removeAttribute('required');
      departamentoCustomInput?.removeAttribute('required');
      if (mascaraInput) mascaraInput.value = '';
      if (gatewayInput) gatewayInput.value = '';
      if (dns1Input) dns1Input.value = '';
      if (dns2Input) dns2Input.value = '';
      selectedFreeRecordId = null;
      hideAvailableIpList();
    }

    lastTieneIpSelection = hasIp;
  }

  function applyEstadoRules() {
    if (!estadoInput || !departamentoInput) return;
    const hasIp = getTieneIpSelection();
    const currentEstado = estadoInput.value;
    const previousEstado = lastKnownEstadoValue;
    const transitionedFromAssignment = hasIp
      && currentEstado === 'libre'
      && previousEstado
      && previousEstado !== 'libre';

    if (!hasIp) {
      departamentoInput.removeAttribute('required');
      departamentoCustomInput?.removeAttribute('required');
      skipClearDeviceFieldsOnNextEstadoApply = false;
      return;
    }

    if (transitionedFromAssignment && !skipClearDeviceFieldsOnNextEstadoApply) {
      clearDeviceFieldsForLibre();
    }

    if (currentEstado === 'libre') {
      departamentoInput.removeAttribute('required');
      departamentoCustomInput?.removeAttribute('required');
    } else if (currentEstado === 'asignada') {
      updateDepartamentoRequiredState();
    } else {
      departamentoInput.removeAttribute('required');
      departamentoCustomInput?.removeAttribute('required');
    }

    skipClearDeviceFieldsOnNextEstadoApply = false;
    if (currentEstado) {
      lastKnownEstadoValue = currentEstado;
    }
  }

  function applyRowStateClass(row, estado) {
    if (!row) return;
    row.classList.remove('row-estado-libre', 'row-estado-asignada', 'row-estado-en_revision');
    if (!estado) return;
    if (estado === 'libre') row.classList.add('row-estado-libre');
    else if (estado === 'asignada') row.classList.add('row-estado-asignada');
    else if (estado === 'en_revision') row.classList.add('row-estado-en_revision');
  }

  function applyFilters() {
    const rawSearchTerm = (searchInput?.value || '').trim();
    const normalizedSearchTerm = normalizeForSearch(rawSearchTerm);
    const estadoValue = estadoSelect?.value || '';
    const departamentoValue = departamentoSelect?.value || '';
    const departamentoKey = createDepartmentKey(departamentoValue);

    filteredRecords = allRecords.filter((record) => {
      const matchesSearch = !normalizedSearchTerm
        || normalizeForSearch(record.dispositivo || '').includes(normalizedSearchTerm)
        || normalizeForSearch(record.departamento || '').includes(normalizedSearchTerm)
        || normalizeForSearch(record.propietario || '').includes(normalizedSearchTerm)
        || normalizeForSearch(record.usuario || '').includes(normalizedSearchTerm)
        || normalizeForSearch(record.ip || '').includes(normalizedSearchTerm);

      const matchesEstado = !estadoValue || record.estado === estadoValue;
      const matchesDepartamento = !departamentoKey
        || createDepartmentKey(record.departamento || '') === departamentoKey;

      return matchesSearch && matchesEstado && matchesDepartamento;
    });

    filteredRecords = sortRecords(filteredRecords);
    renderTable(filteredRecords);
    updateCounters(filteredRecords);
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
      if (!hasIpValue(value)) {
        return -1;
      }
      const parts = String(value).split('.');
      if (parts.length !== 4 || parts.some((part) => Number.isNaN(Number(part)))) {
        return Number.MAX_SAFE_INTEGER;
      }
      return parts.map(Number).reduce((acc, part) => acc * 256 + part, 0);
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
      const hasIp = hasIpValue(record.ip);
      const rawEstadoValue = record.estado ?? null;
      const estadoValue = hasIp ? rawEstadoValue : null;
      const mainRow = document.createElement('tr');
      mainRow.dataset.id = record.id;
      mainRow.classList.add('inventory-row');
      mainRow.tabIndex = -1;
      applyRowStateClass(mainRow, estadoValue);

      const dispositivoTd = createElement('td', 'cell-dispositivo', record.dispositivo || '—');
      const tipoTd = createElement('td', null, formatTipoLabel(record.tipo));
      const departamentoTd = createElement('td', null, record.departamento || '—');
      const propietarioTd = createElement('td', null, record.propietario || '—');
      const ipTd = createElement('td', null, hasIp ? record.ip : NO_IP_LABEL);

      const estadoTd = document.createElement('td');
      estadoTd.classList.add('estado-cell');
      if (estadoValue) {
        const estadoPill = createElement('span', `estado-pill estado-pill--${estadoValue}`);
        estadoPill.textContent = STATE_LABELS[estadoValue] || estadoValue;
        estadoTd.appendChild(estadoPill);
      }

      const accionesTd = document.createElement('td');
      accionesTd.classList.add('acciones-cell');
      const actionWrapper = createElement('div', 'action-buttons');

      const editarBtn = createIconButton('btn-action', 'Editar', 'icon-edit');
      editarBtn.dataset.action = 'edit';
      editarBtn.dataset.id = record.id;
      editarBtn.title = 'Editar';

      const eliminarBtn = createIconButton('btn-action btn-danger', 'Eliminar', 'icon-trash');
      eliminarBtn.dataset.action = 'delete';
      eliminarBtn.dataset.id = record.id;
      eliminarBtn.title = 'Eliminar';

      actionWrapper.append(editarBtn, eliminarBtn);
      accionesTd.appendChild(actionWrapper);

      mainRow.append(
        dispositivoTd,
        tipoTd,
        departamentoTd,
        propietarioTd,
        ipTd,
        estadoTd,
        accionesTd
      );

      const detailItems = [];

      detailItems.push({ label: 'Usuario', value: record.usuario || '—' });
      detailItems.push(
        { label: 'Máscara', value: hasIp ? record.mascara || '—' : '—' },
        { label: 'Gateway', value: hasIp ? record.gateway || '—' : '—' },
        { label: 'DNS 1', value: hasIp ? record.dns1 || '—' : '—' },
        { label: 'DNS 2', value: hasIp ? record.dns2 || '—' : '—' }
      );

      if (record.notas) {
        detailItems.push({ label: 'Notas', value: record.notas });
      }

      if (detailItems.length) {
        mainRow.setAttribute('data-expandable', 'true');
        mainRow.setAttribute('aria-expanded', 'false');
        mainRow.tabIndex = 0;

        const detailRow = document.createElement('tr');
        detailRow.dataset.id = record.id;
        detailRow.classList.add('inventory-row-details');
        applyRowStateClass(detailRow, estadoValue);
        detailRow.hidden = true;
        detailRow.setAttribute('aria-hidden', 'true');

        const detailTd = document.createElement('td');
        detailTd.colSpan = mainRow.children.length;
        const detailGrid = createElement('div', 'row-detail-grid');

        detailItems.forEach(({ label, value }) => {
          const item = createElement('div', 'row-detail-item');
          const itemLabel = createElement('span', 'row-detail-label', label);
          const itemValue = createElement('span', 'row-detail-value', value);
          item.append(itemLabel, itemValue);
          detailGrid.appendChild(item);
        });

        detailTd.appendChild(detailGrid);
        detailRow.appendChild(detailTd);
        tablaBody.append(mainRow, detailRow);
      } else {
        mainRow.removeAttribute('data-expandable');
        mainRow.removeAttribute('aria-expanded');
        mainRow.tabIndex = -1;
        tablaBody.appendChild(mainRow);
      }
    });

    updateSortIndicators();
  }

  function toggleRowDetails(row) {
    if (!row || !row.classList.contains('inventory-row')) return;
    if (row.dataset.expandable !== 'true') return;
    const detailsRow = row.nextElementSibling;
    if (!(detailsRow instanceof HTMLTableRowElement) || !detailsRow.classList.contains('inventory-row-details')) {
      return;
    }

    const isExpanded = row.classList.toggle('is-expanded');
    row.setAttribute('aria-expanded', String(isExpanded));
    detailsRow.classList.toggle('is-expanded', isExpanded);
    detailsRow.hidden = !isExpanded;
    detailsRow.setAttribute('aria-hidden', String(!isExpanded));

    if (isExpanded && tablaBody) {
      tablaBody.querySelectorAll('.inventory-row.is-expanded').forEach((expandedRow) => {
        if (expandedRow !== row) {
          toggleRowDetails(expandedRow);
        }
      });
    }
  }

  function updateCounters(records = filteredRecords) {
    const dataset = Array.isArray(records) ? records : [];

    const total = dataset.length;
    const totalConIp = dataset.filter((r) => hasIpValue(r.ip)).length;
    const libres = dataset.filter((r) => r.estado === 'libre').length;
    const asignadas = dataset.filter((r) => r.estado === 'asignada').length;
    const revision = dataset.filter((r) => r.estado === 'en_revision').length;

    if (statTotalGeneral) statTotalGeneral.textContent = total;
    if (statTotalIp) statTotalIp.textContent = totalConIp;
    if (statLibres) statLibres.textContent = libres;
    if (statAsignadas) statAsignadas.textContent = asignadas;
    if (statRevision) statRevision.textContent = revision;
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

  function populateTipoOptions() {
    const previousValue = tipoSelect?.value || '';
    const previousCustomValue = tipoCustomInput?.value || '';
    const customActive = isCustomTipoInputActive();

    const map = new Map();

    const registerOption = (value, label, { allowOverride = true } = {}) => {
      const normalizedValue = normalizeTipo(value);
      if (!normalizedValue) return;
      const key = createTipoKey(normalizedValue);
      if (!key || key === OTHER_TIPO_KEY) return;

      const candidate = {
        value: normalizedValue,
        label: label || normalizedValue
      };

      const existing = map.get(key);
      if (!existing) {
        map.set(key, candidate);
        return;
      }

      if (!allowOverride) {
        return;
      }

      const preferred = chooseBetterTipoOption(existing, candidate);
      if (preferred !== existing) {
        map.set(key, preferred);
      }
    };

    PREDEFINED_TIPO_OPTIONS.forEach((option) => {
      registerOption(option.value, option.label, { allowOverride: false });
    });

    allRecords.forEach((record) => {
      if (!record?.tipo) return;
      const rawValue = record.tipo;
      if (typeof rawValue !== 'string') return;
      const normalized = normalizeTipo(rawValue);
      if (!normalized) return;

      const lower = normalized.toLowerCase();
      if (PREDEFINED_TIPOS.includes(lower)) {
        const predefined = PREDEFINED_TIPO_OPTIONS.find((option) => option.value === lower);
        if (predefined) {
          registerOption(predefined.value, predefined.label, { allowOverride: false });
        }
        return;
      }

      registerOption(normalized, normalized);
    });

    tipoOptionsMap = map;

    const ordered = [];
    const addedKeys = new Set();

    PREDEFINED_TIPO_OPTIONS.forEach((option) => {
      const key = createTipoKey(option.value);
      if (!key) return;
      const stored = map.get(key);
      if (stored) {
        ordered.push({ value: stored.value, label: stored.label });
        addedKeys.add(key);
      }
    });

    Array.from(map.entries())
      .filter(([key]) => !addedKeys.has(key))
      .map(([, option]) => option)
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
      .forEach((option) => {
        ordered.push(option);
      });

    tipoOptions = ordered;

    updateTipoFormOptions({
      previousValue,
      previousCustomValue,
      customActive
    });
  }

  function populateDepartmentOptions() {
    const selectedFilter = departamentoSelect?.value || '';
    const map = new Map();

    const addOption = (value) => {
      const normalized = normalizeDepartment(value);
      if (!normalized) return;
      const formatted = formatDepartmentLabel(normalized);
      const key = createDepartmentKey(formatted);
      if (!key) return;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, formatted);
        return;
      }

      const preferred = chooseBetterDepartmentLabel(existing, formatted);
      if (preferred !== existing) {
        map.set(key, preferred);
      }
    };

    DEPARTMENT_DICTIONARY.forEach((dictionaryValue) => addOption(dictionaryValue));
    PREDEFINED_DEPARTAMENTOS.forEach(addOption);
    allRecords.forEach((record) => addOption(record?.departamento));

    departmentOptionsMap = map;
    departmentOptions = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    if (departamentoSelect) {
      departamentoSelect.innerHTML = '<option value="">Todos los departamentos</option>';
      departmentOptions.forEach((dept) => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departamentoSelect.appendChild(option);
      });

      if (selectedFilter) {
        const matched = findDepartmentMatch(selectedFilter);
        if (matched) {
          departamentoSelect.value = matched;
        }
      }
    }

    updateDepartamentoFormOptions(departmentOptions);
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
      populateTipoOptions();
      populateDepartmentOptions();
      applyFilters();
      handleDispositivoInputValidation();
    } catch (error) {
      console.error('Error al obtener inventario', error);
      showToast('Error al cargar el inventario de equipos.', 'error');
    } finally {
      if (showLoader) toggleLoader(false);
    }
  }

  function validateIp(value) {
    const rawValue = typeof value === 'string' ? value.trim() : '';
    if (!rawValue) {
      return { valid: false, message: 'Debes indicar la dirección IP.' };
    }

    if (/^\d{1,3}$/.test(rawValue)) {
      const octet = Number(rawValue);
      if (!Number.isInteger(octet) || octet < LAST_OCTET_MIN || octet > LAST_OCTET_MAX) {
        return { valid: false, message: 'El último octeto debe estar entre 0 y 254.' };
      }
      return { valid: true, value: `${IP_PREFIX}${octet}` };
    }

    const normalized = rawValue.replace(/\s+/g, '');
    const match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) {
      return { valid: false, message: 'Debes indicar una dirección IP válida.' };
    }

    const parts = match.slice(1).map(Number);
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return { valid: false, message: 'Cada octeto debe estar entre 0 y 255.' };
    }

    return { valid: true, value: parts.join('.') };
  }

  function buildPayloadFromForm() {
    const dispositivo = dispositivoInput.value.trim();
    const customTipoActive = isCustomTipoInputActive();
    const tipoSeleccionado = customTipoActive ? tipoCustomInput.value.trim() : tipoSelect.value;
    const tipoValue = typeof tipoSeleccionado === 'string' ? tipoSeleccionado.trim() : '';
    const hasIp = getTieneIpSelection();
    let estadoSeleccionado = null;
    if (hasIp) {
      estadoSeleccionado = estadoInput.value;
      if (!estadoSeleccionado) {
        throw new Error('Debes seleccionar un estado.');
      }
    }
    const departmentResolution = resolveDepartamentoValue({ requireMatch: hasIp && estadoSeleccionado === 'asignada' });
    const departamentoBaseValue = departmentResolution.value || '';
    const departamentoNormalizedValue = normalizeDepartment(departamentoBaseValue);
    let departamento = departamentoBaseValue;
    const notas = notasInput.value.trim();
    const propietario = propietarioInput?.value.trim() || '';
    const usuario = usuarioInput?.value.trim() || '';

    if (hasIp && estadoSeleccionado === 'libre') {
      const hasEquipoData = Boolean(dispositivo || tipoValue || departamentoNormalizedValue || propietario || usuario);
      if (hasEquipoData) {
        throw new Error(MESSAGE_LIBRE_WITH_DATA);
      }
    }

    if (!hasIp) {
      if (!dispositivo) {
        throw new Error('Debes indicar el dispositivo para registrar un equipo sin IP.');
      }
      const hasAdditionalData = Boolean(tipoValue || departamentoNormalizedValue || propietario || usuario);
      if (!hasAdditionalData) {
        throw new Error(MESSAGE_NO_IP_MISSING_FIELDS);
      }
    }

    let ip = null;
    let mascara = null;
    let gateway = null;
    let dns1 = null;
    let dns2 = null;

    if (hasIp) {
      const ipValidation = validateIp(ipInput.value);
      if (!ipValidation.valid) {
        throw new Error(ipValidation.message);
      }
      ip = ipValidation.value;
      mascara = (mascaraInput?.value || '').trim() || DEFAULTS.mascara;
      gateway = (gatewayInput?.value || '').trim() || DEFAULTS.gateway;
      dns1 = (dns1Input?.value || '').trim() || DEFAULTS.dns1;
      dns2 = (dns2Input?.value || '').trim() || DEFAULTS.dns2;
    }

    if (departmentResolution.isCustom) {
      const customValue = departamentoCustomInput?.value || '';
      const validation = validateCustomDepartmentInput(customValue);
      if (!validation.valid) {
        setDepartamentoFeedback(validation.message);
        departamentoCustomInput?.focus();
        throw new Error(validation.message);
      }
      clearDepartamentoFeedback();
      departamento = validation.formatted;
    } else if (departamento) {
      departamento = formatDepartmentLabel(departamento);
      clearDepartamentoFeedback();
    } else {
      clearDepartamentoFeedback();
    }

    if (hasIp && estadoSeleccionado === 'asignada') {
      if (!dispositivo) throw new Error('Para asignar una IP debes indicar el dispositivo.');
      if (!tipoValue) throw new Error('Para asignar una IP debes indicar el tipo de dispositivo.');
      if (!departamento) throw new Error('Para asignar una IP debes indicar el departamento.');
      if (!propietario) throw new Error('Para asignar una IP debes indicar el propietario.');
      if (!usuario) throw new Error('Para asignar una IP debes indicar el usuario.');
    }

    const shouldClearDeviceFields = hasIp && estadoSeleccionado === 'libre';

    const payload = {
      ip,
      dispositivo: shouldClearDeviceFields ? CLEAR_ON_FREE_DEFAULTS.dispositivo : dispositivo || null,
      tipo: shouldClearDeviceFields
        ? CLEAR_ON_FREE_DEFAULTS.tipo
        : (tipoValue ? tipoValue : null),
      departamento: shouldClearDeviceFields ? CLEAR_ON_FREE_DEFAULTS.departamento : departamento || null,
      propietario: shouldClearDeviceFields ? CLEAR_ON_FREE_DEFAULTS.propietario : propietario || null,
      usuario: shouldClearDeviceFields ? CLEAR_ON_FREE_DEFAULTS.usuario : usuario || null,
      estado: estadoSeleccionado,
      notas: shouldClearDeviceFields ? CLEAR_ON_FREE_DEFAULTS.notas : notas || null,
      mascara: hasIp ? mascara : null,
      gateway: hasIp ? gateway : null,
      dns1: hasIp ? dns1 : null,
      dns2: hasIp ? dns2 : null
    };

    if (shouldClearDeviceFields) {
      payload.asignado_por = CLEAR_ON_FREE_DEFAULTS.asignado_por;
    }

    return payload;
  }

  function ensureNoDuplicateRecords({ dispositivo, ipInput, excludeId = null, hasIpSelection = true }) {
    const normalizedDevice = normalizeDeviceValue(dispositivo);

    if (normalizedDevice) {
      const duplicateDevice = findDeviceDuplicate(normalizedDevice, { excludeId });
      if (duplicateDevice) {
        setDispositivoFeedback(MESSAGE_DUPLICATE_DEVICE_INLINE);
        throw new Error(MESSAGE_DUPLICATE_RECORD);
      }
    }

    clearDispositivoFeedback();

    if (!hasIpSelection) {
      return;
    }

    const rawIpValue = typeof ipInput === 'string' ? ipInput.trim() : '';
    if (!rawIpValue) {
      return;
    }

    const ipValidation = validateIp(rawIpValue);
    if (!ipValidation.valid) {
      return;
    }

    const duplicateIp = findIpDuplicate(ipValidation.value, { excludeId });
    if (duplicateIp) {
      throw new Error(MESSAGE_DUPLICATE_RECORD);
    }
  }

  function ensureNoDuplicateRecordsFromPayload({ dispositivo, ip, excludeId = null }) {
    const normalizedDevice = normalizeDeviceValue(dispositivo);

    if (normalizedDevice) {
      const duplicateDevice = findDeviceDuplicate(normalizedDevice, { excludeId });
      if (duplicateDevice) {
        setDispositivoFeedback(MESSAGE_DUPLICATE_DEVICE_INLINE);
        throw new Error(MESSAGE_DUPLICATE_RECORD);
      }
    }

    clearDispositivoFeedback();

    if (ip && hasIpValue(ip)) {
      const duplicateIp = findIpDuplicate(ip, { excludeId });
      if (duplicateIp) {
        throw new Error(MESSAGE_DUPLICATE_RECORD);
      }
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      const targetRecordId = isEditing ? editingId : selectedFreeRecordId;
      const hasIpSelection = getTieneIpSelection();

      ensureNoDuplicateRecords({
        dispositivo: dispositivoInput?.value || '',
        ipInput: hasIpSelection ? ipInput?.value || '' : '',
        excludeId: targetRecordId || null,
        hasIpSelection
      });

      const payload = buildPayloadFromForm();

      ensureNoDuplicateRecordsFromPayload({
        dispositivo: payload.dispositivo || dispositivoInput.value.trim(),
        ip: payload.ip,
        excludeId: targetRecordId || null
      });
      isSubmitting = true;
      modalSubmitBtn.disabled = true;
      modalCancelBtn.disabled = true;

      if (isEditing && editingId) {
        await updateRecord(editingId, payload);
        showToast('Registro actualizado correctamente.');
      } else if (selectedFreeRecordId) {
        await updateRecord(selectedFreeRecordId, { ...payload, estado: 'asignada' });
        showToast('Registro libre asignado correctamente.');
      } else {
        await createRecord(payload);
        showToast('Registro creado correctamente.');
      }

      closeModal();
      await fetchRecords();
    } catch (error) {
      const message = error?.message || 'No se pudo guardar el registro.';
      showToast(message, 'error', 4200);
      console.error('Error guardando el registro', error);
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
        throw new Error('No tienes permisos para eliminar este registro.');
      }
      throw error;
    }
  }

  async function handleDelete(id) {
    const record = allRecords.find((item) => item.id === id);
    if (!record) return;

    const hasIp = hasIpValue(record.ip);
    const descriptor = record.dispositivo
      ? `del dispositivo ${record.dispositivo}`
      : hasIp
        ? `de la IP ${record.ip}`
        : 'seleccionado';

    const confirmed = await window.showConfirmationModal(
      'Eliminar registro',
      `¿Deseas eliminar el registro ${descriptor}?`
    );

    if (!confirmed) return;

    try {
      await deleteRecord(id);
      showToast('Registro eliminado correctamente.');
      await fetchRecords();
    } catch (error) {
      const message = error?.message || 'No se pudo eliminar el registro.';
      showToast(message, 'error', 4200);
      console.error('Error eliminando registro', error);
    }
  }

  function exportToExcel() {
    if (!filteredRecords.length) {
      showToast('No hay registros para exportar.', 'error', 3200);
      return;
    }

    const exportRows = filteredRecords.map((record) => ({
      'Dispositivo': record.dispositivo || '',
      'Tipo': formatTipoLabel(record.tipo, { fallback: '' }),
      'Departamento': record.departamento || '',
      'Propietario': record.propietario || '',
      'Usuario': record.usuario || '',
      'Dirección IP': hasIpValue(record.ip) ? record.ip : NO_IP_LABEL,
      'Máscara': record.mascara || '',
      'Gateway': record.gateway || '',
      'DNS 1': record.dns1 || '',
      'DNS 2': record.dns2 || '',
      'Estado': STATE_LABELS[record.estado] || record.estado,
      'Notas': record.notas || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows, {
      header: [
        'Dispositivo',
        'Tipo',
        'Departamento',
        'Propietario',
        'Usuario',
        'Dirección IP',
        'Máscara',
        'Gateway',
        'DNS 1',
        'DNS 2',
        'Estado',
        'Notas'
      ]
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Equipos');
    const fileName = `Inventario_Equipos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('Exportación completada.');
  }

  function attachEventListeners() {
    searchInput?.addEventListener('input', () => applyFilters());
    estadoSelect?.addEventListener('change', () => applyFilters());
    departamentoSelect?.addEventListener('change', () => applyFilters());
    actualizarBtn?.addEventListener('click', () => fetchRecords());
    exportarBtn?.addEventListener('click', exportToExcel);
    nuevoBtn?.addEventListener('click', () => openModal({ mode: 'create' }));

    modalCloseBtns?.forEach((btn) => btn.addEventListener('click', closeModal));
    modalCancelBtn?.addEventListener('click', closeModal);
    formIp?.addEventListener('submit', handleFormSubmit);
    estadoInput?.addEventListener('change', applyEstadoRules);
    tipoSelect?.addEventListener('change', handleTipoSelectChange);
    departamentoInput?.addEventListener('change', handleDepartamentoInputChange);
    departamentoCustomInput?.addEventListener('input', handleDepartamentoCustomInput);
    departamentoCustomInput?.addEventListener('blur', handleDepartamentoCustomInput);
    dispositivoInput?.addEventListener('input', handleDispositivoInputValidation);
    dispositivoInput?.addEventListener('blur', handleDispositivoInputValidation);

    tieneIpRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        const hasIp = radio.value === 'si';
        const wasHavingIp = lastTieneIpSelection;
        if (hasIp && !wasHavingIp) {
          skipClearDeviceFieldsOnNextEstadoApply = true;
        }
        setTieneIpState(hasIp, { preserveValue: false });
        if (!hasIp) {
          selectedFreeRecordId = null;
          hideAvailableIpList();
        }
        applyEstadoRules();
      });
    });

    ipInput?.addEventListener('focus', () => {
      if (!getTieneIpSelection()) return;
      if (!ipInput.readOnly && !ipInput.value) {
        ipInput.value = IP_PREFIX;
        requestAnimationFrame(() => {
          if (typeof ipInput.setSelectionRange === 'function') {
            const cursorPosition = ipInput.value.length;
            ipInput.setSelectionRange(cursorPosition, cursorPosition);
          }
        });
      }
      populateAvailableIpList();
    });

    ipInput?.addEventListener('input', () => {
      if (!getTieneIpSelection()) return;
      selectedFreeRecordId = null;
      hideAvailableIpList();
    });

    document.addEventListener('click', (event) => {
      if (!availableIpList || availableIpList.hidden) return;
      const isInside = availableIpList.contains(event.target) || event.target === ipInput;
      if (!isInside) {
        hideAvailableIpList();
      }
    });

    tablaBody?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const actionEl = target.closest('[data-action]');
      if (actionEl instanceof HTMLElement) {
        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;
        const record = allRecords.find((item) => item.id === id);
        if (!action || !id || !record) return;

        if (action === 'edit') {
          openModal({ mode: 'edit', record });
        } else if (action === 'delete') {
          handleDelete(id);
        }
        return;
      }

      if (target.closest('.action-buttons')) {
        return;
      }

      const detailRow = target.closest('.inventory-row-details');
      if (detailRow instanceof HTMLTableRowElement) {
        const parentRow = detailRow.previousElementSibling;
        if (parentRow instanceof HTMLTableRowElement) {
          toggleRowDetails(parentRow);
        }
        return;
      }

      const row = target.closest('.inventory-row');
      if (row instanceof HTMLTableRowElement) {
        toggleRowDetails(row);
      }
    });

    tablaBody?.addEventListener('keydown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('inventory-row')) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleRowDetails(target);
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
  initializeStatsToggle();
  initializeFilterToolbar();
  populateTipoOptions();
  populateDepartmentOptions();
  await fetchRecords({ showLoader: false });
  toggleLoader(false);
});
