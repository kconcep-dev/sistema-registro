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