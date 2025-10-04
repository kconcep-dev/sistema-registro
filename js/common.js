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
                <li class="nav-item"><a href="inicio.html" class="nav-link">🏠 Inicio</a></li>
                <li class="nav-item"><a href="index.html" class="nav-link">📝 Registrar</a></li>
                <li class="nav-item"><a href="descartes.html" class="nav-link">🗑️ Descartes</a></li>
                <li class="nav-item"><a href="consultar.html" class="nav-link">📊 Consultar</a></li>
                <li class="nav-separator"></li>
                <li class="nav-item nav-item-controls">
                    <button id="theme-toggle" class="theme-btn nav-control-btn" title="Cambiar Tema">🌙</button>
                    <button id="logout-btn" class="header-btn nav-control-btn" title="Cerrar Sesión">
                        <img src="assets/images/icono-logout-dark.png" alt="Cerrar Sesión" class="icon-dark">
                        <img src="assets/images/icono-logout-light.png" alt="Cerrar Sesión" class="icon-light">
                    </button>
                </li>
            </ul>
            <div class="nav-controls">
                <button class="hamburger" id="hamburger-btn" aria-label="Abrir menú">
                    <div class="icon-menu">
                        <img src="assets/images/icono-menu-light.png" alt="Abrir menú" class="icon-light">
                        <img src="assets/images/icono-menu-dark.png" alt="Abrir menú" class="icon-dark">
                    </div>
                    <div class="icon-close">
                        <img src="assets/images/icono-cerrar-light.png" alt="Cerrar menú" class="icon-light">
                        <img src="assets/images/icono-cerrar-dark.png" alt="Cerrar menú" class="icon-dark">
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
        // Al cargar, solo necesitamos ajustar el ícono, la clase ya está puesta.
        if (document.documentElement.classList.contains('dark-mode')) {
            themeToggleBtn.textContent = '☀️';
        }

        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-mode');
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            const theme = isDarkMode ? 'dark' : 'light';
            themeToggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
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
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos

    async function logoutUserByInactivity() {
        const confirmed = await window.showConfirmationModal(
            'Sesión por Expirar',
            'Has estado inactivo por un tiempo. ¿Deseas cerrar la sesión ahora?'
        );

        if (confirmed) {
            if (typeof window.clearWorkInProgress === 'function') {
                window.clearWorkInProgress();
            }
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        } else {
            // Si el usuario cancela, reseteamos el timer
            resetInactivityTimer();
        }
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUserByInactivity, INACTIVITY_TIMEOUT);
    }

    const pagesWithInactivityTimer = ['index.html', 'inicio.html', 'descartes.html'];
    if (pagesWithInactivityTimer.some(page => window.location.pathname.includes(page))) {
        window.onload = resetInactivityTimer;
        document.onmousemove = resetInactivityTimer;
        document.onkeydown = resetInactivityTimer;
        document.onclick = resetInactivityTimer;
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