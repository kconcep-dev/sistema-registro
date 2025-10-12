// js/common.js

// --- 1. CONFIGURACIÓN Y CLIENTE SUPABASE ---
const supabaseConfig = window.__SUPABASE_CONFIG__ || {};

if (!supabaseConfig.url || !supabaseConfig.key) {
    throw new Error('Supabase no está configurado. Define window.__SUPABASE_CONFIG__ antes de cargar common.js');
}

const supabaseUrl = supabaseConfig.url;
const supabaseKey = supabaseConfig.key;
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. INYECTOR DE BARRA DE NAVEGACIÓN ---
const navbarHTML = `
    <nav class="navbar">
        <div class="nav-container">
            <ul class="nav-links" id="nav-menu">
                <li class="nav-item"><a href="inicio.html" class="nav-link">
                    <span class="icon icon--sm icon-nav-inicio nav-icon" aria-hidden="true"></span>
                    <span class="nav-label">Inicio</span>
                </a></li>
                <li class="nav-item"><a href="index.html" class="nav-link">
                    <span class="icon icon--sm icon-nav-registrar nav-icon" aria-hidden="true"></span>
                    <span class="nav-label">Registrar</span>
                </a></li>
                <li class="nav-item"><a href="descartes.html" class="nav-link">
                    <span class="icon icon--sm icon-nav-descartes nav-icon" aria-hidden="true"></span>
                    <span class="nav-label">Descartar</span>
                </a></li>
                <li class="nav-item"><a href="consultar.html" class="nav-link">
                    <span class="icon icon--sm icon-nav-consultar nav-icon" aria-hidden="true"></span>
                    <span class="nav-label">Consultar</span>
                </a></li>
                <li class="nav-item"><a href="inventario.html" class="nav-link">
                    <span class="icon icon--sm icon-nav-inventario nav-icon" aria-hidden="true"></span>
                    <span class="nav-label">Inventario</span>
                </a></li>
                <li class="nav-separator"></li>
                <li class="nav-item nav-item-controls">
                    <button id="theme-toggle" class="theme-btn nav-control-btn" title="Cambiar Tema" aria-label="Cambiar a tema oscuro">
                        <span class="icon icon-theme-dark icon-dark" aria-hidden="true"></span>
                        <span class="icon icon-theme-light icon-light" aria-hidden="true"></span>
                    </button>
                    <button id="logout-btn" class="header-btn nav-control-btn" title="Cerrar Sesión" aria-label="Cerrar Sesión">
                        <span class="icon icon-logout icon-dark" aria-hidden="true"></span>
                        <span class="icon icon-logout icon-light" aria-hidden="true"></span>
                    </button>
                </li>
            </ul>
            <div class="nav-controls">
                <button class="hamburger" id="hamburger-btn" aria-label="Abrir menú">
                    <div class="icon-menu">
                        <svg class="icon-light" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
                            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                        </svg>
                        <svg class="icon-dark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
                            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                        </svg>
                    </div>
                    <div class="icon-close">
                        <svg class="icon-light" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
                            <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                        </svg>
                        <svg class="icon-dark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
                            <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                        </svg>
                    </div>
                </button>
            </div>
        </div>
    </nav>
`;

const navbarPlaceholder = document.getElementById('navbar-placeholder');
if (navbarPlaceholder) {
    navbarPlaceholder.innerHTML = navbarHTML;
}

// --- 3. FUNCIONES Y LÓGICA COMÚN ---

// Variable global para rastrear trabajo sin guardar
window.isWorkInProgress = false;

// Función global para limpiar el estado de trabajo (será definida en las páginas específicas)
window.clearWorkInProgress = () => {
    window.isWorkInProgress = false;
};

// Gestor para preservar formularios antes de recargar la página por el escáner
window.createScannerReloadPersistence = (storageKey, formIds = []) => {
    const resolveForms = () => formIds
        .map((formRef) => {
            if (!formRef) return null;
            if (typeof formRef === 'string') {
                return document.getElementById(formRef);
            }
            return formRef;
        })
        .filter((form) => form instanceof HTMLFormElement);

    const collectFormValues = (form) => {
        const values = {};
        if (!form) return values;
        const fields = form.querySelectorAll('input[id], textarea[id], select[id]');
        fields.forEach((field) => {
            const { id, type } = field;
            if (!id) return;
            if (type === 'checkbox' || type === 'radio') {
                values[id] = field.checked;
            } else {
                values[id] = field.value;
            }
        });
        return values;
    };

    const applyFormValues = (values) => {
        if (!values || typeof values !== 'object') return;
        Object.entries(values).forEach(([fieldId, storedValue]) => {
            const field = document.getElementById(fieldId);
            if (!field) return;
            if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = Boolean(storedValue);
            } else if (storedValue !== undefined) {
                field.value = storedValue;
            }
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    return {
        store() {
            try {
                const forms = resolveForms();
                if (!forms.length) {
                    sessionStorage.removeItem(storageKey);
                    return;
                }

                const payload = {};
                let hasValues = false;

                forms.forEach((form, index) => {
                    const formValues = collectFormValues(form);
                    if (Object.keys(formValues).length > 0) {
                        const key = form.id || `form-${index}`;
                        payload[key] = formValues;
                        hasValues = true;
                    }
                });

                if (hasValues) {
                    sessionStorage.setItem(storageKey, JSON.stringify(payload));
                } else {
                    sessionStorage.removeItem(storageKey);
                }
            } catch (error) {
                console.warn('No se pudo guardar el estado antes de recargar:', error);
            }
        },
        restore() {
            const raw = sessionStorage.getItem(storageKey);
            if (!raw) return;
            sessionStorage.removeItem(storageKey);
            try {
                const payload = JSON.parse(raw);
                Object.values(payload || {}).forEach((values) => applyFormValues(values));
            } catch (error) {
                console.warn('No se pudo restaurar el estado tras la recarga:', error);
            }
        }
    };
};

// Controlador del tiempo de vida del escáner en modo de prueba
window.createScannerSessionGuard = ({
    buttons = [],
    reloadButtons = [],
    toast = () => {},
    onBeforeReload = () => {},
    timeoutMessage = 'El escáner dejó de estar disponible. Recarga la página para volver a usarlo.',
    autoCloseDelayMs = 60000,
    disableTooltip = 'Recarga la página para reactivar el escáner',
    countdownDisplay = null
} = {}) => {
    const launchButtons = Array.from(buttons).filter((btn) => btn instanceof HTMLElement);
    const reloadTriggers = Array.from(reloadButtons).filter((btn) => btn instanceof HTMLElement);
    let timerId = null;
    let expired = false;
    let effectsApplied = false;
    let countdownIntervalId = null;

    const countdownProvider = typeof countdownDisplay === 'function'
        ? countdownDisplay
        : () => countdownDisplay;

    const getCountdownElement = () => {
        const element = countdownProvider ? countdownProvider() : null;
        return element instanceof HTMLElement ? element : null;
    };

    const formatRemaining = (milliseconds) => {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const updateCountdownText = (milliseconds) => {
        const countdownEl = getCountdownElement();
        if (!countdownEl) return;
        countdownEl.textContent = `Tiempo restante: ${formatRemaining(milliseconds)}`;
    };

    const showCountdown = () => {
        const countdownEl = getCountdownElement();
        if (!countdownEl) return;
        countdownEl.hidden = false;
        countdownEl.setAttribute('aria-hidden', 'false');
    };

    const hideCountdown = () => {
        const countdownEl = getCountdownElement();
        if (!countdownEl) return;
        countdownEl.hidden = true;
        countdownEl.setAttribute('aria-hidden', 'true');
    };

    const clearCountdownInterval = () => {
        if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }
    };

    const resetCountdown = () => {
        clearCountdownInterval();
        updateCountdownText(autoCloseDelayMs);
        hideCountdown();
    };

    const beginCountdown = () => {
        const countdownEl = getCountdownElement();
        if (!countdownEl) return;
        clearCountdownInterval();
        let remainingMs = autoCloseDelayMs;
        updateCountdownText(remainingMs);
        showCountdown();
        countdownIntervalId = setInterval(() => {
            remainingMs -= 1000;
            if (remainingMs <= 0) {
                updateCountdownText(0);
                clearCountdownInterval();
            } else {
                updateCountdownText(remainingMs);
            }
        }, 1000);
    };

    const clearTimer = () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    };

    const disableLaunchButtons = () => {
        launchButtons.forEach((btn) => {
            if (!btn) return;
            btn.disabled = true;
            btn.classList.add('btn-scan--disabled');
            btn.setAttribute('aria-disabled', 'true');
            if (disableTooltip) {
                if (!btn.dataset.originalTitle) {
                    btn.dataset.originalTitle = btn.getAttribute('title') || '';
                }
                btn.setAttribute('title', disableTooltip);
            }
            btn.hidden = true;
            btn.setAttribute('aria-hidden', 'true');
        });
    };

    const revealReloadButtons = () => {
        reloadTriggers.forEach((btn) => {
            if (!btn) return;
            btn.hidden = false;
            btn.removeAttribute('aria-hidden');
        });
    };

    reloadTriggers.forEach((btn) => {
        if (!btn) return;
        btn.hidden = true;
        btn.setAttribute('aria-hidden', 'true');
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            try {
                onBeforeReload(btn);
            } catch (error) {
                console.error('Error al preparar la recarga del escáner:', error);
            }
            window.location.reload();
        });
    });

    const applyTimeoutEffects = () => {
        if (effectsApplied) return;
        effectsApplied = true;
        disableLaunchButtons();
        revealReloadButtons();
        if (typeof toast === 'function' && timeoutMessage) {
            toast(timeoutMessage, 'warning');
        }
    };

    return {
        startTimer(triggerClose) {
            if (expired) return;
            clearTimer();
            beginCountdown();
            timerId = setTimeout(() => {
                timerId = null;
                expired = true;
                if (typeof triggerClose === 'function') {
                    triggerClose();
                } else {
                    applyTimeoutEffects();
                }
            }, autoCloseDelayMs);
        },
        clearTimer,
        markClosed({ reason } = {}) {
            const timedOut = expired || reason === 'timeout';
            if (reason === 'timeout' && !expired) {
                expired = true;
            }
            clearTimer();
            resetCountdown();
            if (timedOut) {
                applyTimeoutEffects();
            }
        },
        hasExpired() {
            return expired;
        }
    };

    resetCountdown();
};

// ✅ FUNCIÓN GLOBAL PARA MOSTRAR MODAL DE CONFIRMACIÓN: CORREGIDA
window.showConfirmationModal = (title, message) => {
    const modal = document.getElementById('modal-confirmacion');
    if (!modal) return Promise.resolve(true); // Si no hay modal, se asume confirmación

    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const btnAceptar = document.getElementById('btn-confirmar-aceptar');
    const btnCancelar = document.getElementById('btn-confirmar-cancelar');

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    modal.classList.add('visible'); // <-- Usamos la clase para mostrarlo

    return new Promise((resolve) => {
        const closeModal = (value) => {
            modal.classList.remove('visible'); // <-- Usamos la clase para ocultarlo
            // Removemos los event listeners para evitar fugas de memoria
            btnAceptar.onclick = null;
            btnCancelar.onclick = null;
            resolve(value);
        };

        btnAceptar.onclick = () => closeModal(true);
        btnCancelar.onclick = () => closeModal(false);
    });
};

document.addEventListener('DOMContentLoaded', () => {

   // --- LÓGICA DEL TEMA ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const updateThemeToggleLabels = (isDarkMode) => {
            const label = isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
            themeToggleBtn.setAttribute('aria-label', label);
            themeToggleBtn.setAttribute('title', label);
        };

        updateThemeToggleLabels(document.documentElement.classList.contains('dark-mode'));

        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-mode');
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            const theme = isDarkMode ? 'dark' : 'light';
            updateThemeToggleLabels(isDarkMode);
            localStorage.setItem('theme', theme);
        });
    }
    
    // --- LÓGICA DE NAVEGACIÓN (HAMBURGUESA) ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    }

    // --- FUNCIÓN GENÉRICA PARA SALIR DE FORMA SEGURA ---
    async function safeExit(exitFunction) {
        if (window.isWorkInProgress) {
            const confirmed = await window.showConfirmationModal(
                'Salir sin Guardar',
                'Tienes cambios sin finalizar. ¿Estás seguro de que quieres salir y descartar el progreso?'
            );
            if (confirmed) {
                if (typeof window.clearWorkInProgress === 'function') {
                    window.clearWorkInProgress();
                }
                exitFunction();
            }
        } else {
            exitFunction();
        }
    }

    // --- LÓGICA DE LOGOUT ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            safeExit(async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        });
    }

    // --- LÓGICA PARA MARCAR ENLACE ACTIVO Y GUARDIÁN DE NAVEGACIÓN ---
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }

        link.addEventListener('click', (e) => {
            if (link.classList.contains('disabled') || link.classList.contains('active')) {
                e.preventDefault();
                return;
            }
            e.preventDefault(); // Siempre prevenimos la navegación inmediata
            safeExit(() => {
                window.location.href = link.href;
            });
        });
    });

    // --- ORDENAMIENTO DE TABLAS ---
    const NUMERIC_PATTERN = /^-?\d+(?:[.,]\d+)?$/;

    const extractSortableValue = (row, columnIndex) => {
        const cell = row.cells[columnIndex];
        if (!cell) {
            return { type: 'text', raw: '', value: '' };
        }

        const dataValue = cell.getAttribute('data-sort-value');
        const rawText = dataValue !== null ? dataValue : cell.textContent;
        const text = rawText ? rawText.trim() : '';

        if (!text) {
            return { type: 'text', raw: '', value: '' };
        }

        const normalizedNumeric = text.replace(/\s+/g, '').replace(',', '.');
        if (NUMERIC_PATTERN.test(normalizedNumeric)) {
            const numericValue = Number(normalizedNumeric);
            if (!Number.isNaN(numericValue)) {
                return { type: 'number', raw: text, value: numericValue };
            }
        }

        const timestamp = Date.parse(text);
        if (!Number.isNaN(timestamp)) {
            return { type: 'date', raw: text, value: timestamp };
        }

        return { type: 'text', raw: text, value: text.toLocaleLowerCase('es') };
    };

    const compareSortableValues = (a, b, direction) => {
        const dir = direction === 'asc' ? 1 : -1;

        if (!a.raw && !b.raw) return 0;
        if (!a.raw) return 1 * dir;
        if (!b.raw) return -1 * dir;

        if (a.type === 'number' && b.type === 'number') {
            if (a.value === b.value) {
                return a.raw.localeCompare(b.raw, 'es', { sensitivity: 'base', numeric: true }) * dir;
            }
            return (a.value - b.value) * dir;
        }

        if (a.type === 'date' && b.type === 'date') {
            if (a.value === b.value) {
                return a.raw.localeCompare(b.raw, 'es', { sensitivity: 'base', numeric: true }) * dir;
            }
            return (a.value - b.value) * dir;
        }

        if (a.type === 'text' && b.type === 'text') {
            return a.value.localeCompare(b.value, 'es', { sensitivity: 'base', numeric: true }) * dir;
        }

        // Priorizamos números sobre fechas y texto, y fechas sobre texto
        const typeRank = { number: 0, date: 1, text: 2 };
        const rankA = typeRank[a.type] ?? 3;
        const rankB = typeRank[b.type] ?? 3;
        if (rankA === rankB) {
            return a.raw.localeCompare(b.raw, 'es', { sensitivity: 'base', numeric: true }) * dir;
        }
        return (rankA - rankB) * dir;
    };

    const handleTableSort = (table, columnIndex) => {
        const tbody = table.tBodies[0];
        if (!tbody) return;

        const headerCells = Array.from(table.tHead?.querySelectorAll('th') || []);
        const currentColumn = Number.parseInt(table.dataset.sortColumn ?? '', 10);
        let direction = 'asc';
        if (!Number.isNaN(currentColumn) && currentColumn === columnIndex) {
            direction = table.dataset.sortDirection === 'asc' ? 'desc' : 'asc';
        }

        table.dataset.sortColumn = String(columnIndex);
        table.dataset.sortDirection = direction;

        headerCells.forEach((cell, index) => {
            if (index === columnIndex) {
                cell.setAttribute('data-direction', direction);
                cell.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
            } else {
                cell.removeAttribute('data-direction');
                cell.removeAttribute('aria-sort');
            }
        });

        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((rowA, rowB) => {
            const valueA = extractSortableValue(rowA, columnIndex);
            const valueB = extractSortableValue(rowB, columnIndex);
            return compareSortableValues(valueA, valueB, direction);
        });

        rows.forEach((row) => tbody.appendChild(row));
    };

    const initializeSortableTables = () => {
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
            if (table.dataset.sortableInitialized === 'true') return;
            if (!table.tHead || !table.tBodies || !table.tBodies.length) return;

            const headerCells = Array.from(table.tHead.querySelectorAll('th'));
            if (!headerCells.length) return;

            // Si la tabla ya define data-sort en los encabezados, asumimos que tiene una lógica personalizada (ej. inventario)
            const hasCustomSort = headerCells.some((th) => th.hasAttribute('data-sort'));
            if (hasCustomSort) {
                table.dataset.sortableInitialized = 'custom';
                return;
            }

            const sortableHeaders = headerCells.filter((th) => th.dataset.noSort !== 'true');
            if (!sortableHeaders.length) {
                table.dataset.sortableInitialized = 'true';
                return;
            }

            table.dataset.sortColumn = '';
            table.dataset.sortDirection = '';

            headerCells.forEach((th, index) => {
                if (th.dataset.noSort === 'true') return;
                th.classList.add('is-sortable');
                if (!th.hasAttribute('tabindex')) {
                    th.tabIndex = 0;
                }
                th.addEventListener('click', () => handleTableSort(table, index));
                th.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleTableSort(table, index);
                    }
                });
            });

            table.dataset.sortableInitialized = 'true';
        });
    };

    initializeSortableTables();

    // --- TEMPORIZADOR DE INACTIVIDAD ---
    const INACTIVITY_WARNING_TIMEOUT = 10 * 60 * 1000; // 10 minutos para aviso
    const FORCED_LOGOUT_DELAY = 5 * 60 * 1000; // 5 minutos adicionales para cierre forzado

    let inactivityWarningTimer;
    let forcedLogoutTimer;
    let countdownInterval;
    let isInactivityModalOpen = false;

    const formatCountdown = (totalSeconds) => {
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const cleanupInactivityCountdown = () => {
        clearTimeout(forcedLogoutTimer);
        clearInterval(countdownInterval);
        forcedLogoutTimer = null;
        countdownInterval = null;
    };

    const logoutAndRedirect = async () => {
        clearTimeout(inactivityWarningTimer);
        cleanupInactivityCountdown();

        if (typeof window.clearWorkInProgress === 'function') {
            window.clearWorkInProgress();
        }

        try {
            await supabaseClient.auth.signOut();
        } finally {
            window.location.href = 'login.html';
        }
    };

    const showInactivityWarning = () => {
        const modal = document.getElementById('modal-confirmacion');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMessage = document.getElementById('confirm-message');
        const btnAceptar = document.getElementById('btn-confirmar-aceptar');
        const btnCancelar = document.getElementById('btn-confirmar-cancelar');

        if (!modal || !confirmTitle || !confirmMessage || !btnAceptar || !btnCancelar) {
            forcedLogoutTimer = setTimeout(logoutAndRedirect, FORCED_LOGOUT_DELAY);
            return;
        }

        const acceptLabel = btnAceptar.querySelector('.button-label');
        const cancelLabel = btnCancelar.querySelector('.button-label');
        const previousAcceptText = acceptLabel ? acceptLabel.textContent : '';
        const previousCancelText = cancelLabel ? cancelLabel.textContent : '';

        const closeModal = () => {
            modal.classList.remove('visible');
            btnAceptar.onclick = null;
            btnCancelar.onclick = null;

            if (acceptLabel) {
                acceptLabel.textContent = previousAcceptText;
            }
            if (cancelLabel) {
                cancelLabel.textContent = previousCancelText;
            }

            confirmMessage.textContent = '';
            cleanupInactivityCountdown();
            isInactivityModalOpen = false;
        };

        confirmTitle.textContent = 'Cierre de sesión por inactividad';
        confirmMessage.innerHTML = 'Se ha detectado inactividad en el sitio web. La sesión se cerrará automáticamente en <span id="inactivity-countdown">05:00</span>.';

        if (acceptLabel) {
            acceptLabel.textContent = 'Cerrar sesión ahora';
        }
        if (cancelLabel) {
            cancelLabel.textContent = 'Continuar aquí';
        }

        btnAceptar.onclick = () => {
            closeModal();
            logoutAndRedirect();
        };

        btnCancelar.onclick = () => {
            closeModal();
            resetInactivityTimer();
        };

        isInactivityModalOpen = true;
        modal.classList.add('visible');

        const countdownElement = document.getElementById('inactivity-countdown');
        if (countdownElement) {
            let remainingSeconds = Math.floor(FORCED_LOGOUT_DELAY / 1000);
            const updateCountdown = () => {
                countdownElement.textContent = formatCountdown(Math.max(remainingSeconds, 0));
            };

            updateCountdown();
            countdownInterval = setInterval(() => {
                remainingSeconds -= 1;
                if (remainingSeconds < 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    return;
                }
                updateCountdown();
            }, 1000);
        }

        forcedLogoutTimer = setTimeout(() => {
            closeModal();
            logoutAndRedirect();
        }, FORCED_LOGOUT_DELAY);
    };

    function resetInactivityTimer() {
        cleanupInactivityCountdown();
        clearTimeout(inactivityWarningTimer);
        inactivityWarningTimer = setTimeout(showInactivityWarning, INACTIVITY_WARNING_TIMEOUT);
    }

    const handleUserActivity = () => {
        if (!isInactivityModalOpen) {
            resetInactivityTimer();
        }
    };

    const pagesWithInactivityTimer = ['index.html', 'inicio.html', 'descartes.html', 'consultar.html', 'inventario.html'];
    if (pagesWithInactivityTimer.some(page => window.location.pathname.includes(page))) {
        window.addEventListener('load', resetInactivityTimer);
        document.onmousemove = handleUserActivity;
        document.onkeydown = handleUserActivity;
        document.onclick = handleUserActivity;
    }
});

function getUserProfile(user) {
    // Si por alguna razón no hay un usuario, devolvemos un perfil genérico.
    if (!user) {
        return { name: 'Desconocido', role: 'Invitado' };
    }

    // MAPA CENTRAL DE USUARIOS
    const userMappings = {
        // email: { name: 'Nombre para mostrar', role: 'Rol del usuario' }
        'concepcion.kelieser@gmail.com': { name: 'Kevin', role: 'Técnico' },
        'usuario2@empresa.com': { name: 'Ana', role: 'Técnico' },
        'jefe.departamento@empresa.com': { name: 'Carlos', role: 'Supervisor' }
        // ...agrega los demás usuarios aquí
    };

    const userEmail = user.email;
    const profile = userMappings[userEmail];

    // Si encontramos el email en nuestro mapa, devolvemos su perfil.
    if (profile) {
        return profile;
    } 
    
    // Si no, creamos un perfil por defecto usando la parte local del email.
    return { name: userEmail.split('@')[0], role: 'Usuario' };
}