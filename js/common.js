// js/common.js

// --- 1. CONFIGURACIÓN Y CLIENTE SUPABASE ---
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. INYECTOR DE BARRA DE NAVEGACIÓN ---
const navbarHTML = `
    <nav class="navbar">
        <div class="nav-container">
            <ul class="nav-links" id="nav-menu">
                <li class="nav-item"><a href="inicio.html" class="nav-link">🏠 Inicio</a></li>
                <li class="nav-item"><a href="index.html" class="nav-link">📝 Registrar</a></li>
                <li class="nav-item"><a href="descartes.html" class="nav-link">🗑️ Descartes</a></li>
                <li class="nav-item"><a href="#" class="nav-link disabled">📊 Consultar</a></li>
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

// --- 3. FUNCIONES COMUNES (Se ejecutarán cuando el DOM esté listo) ---

// NUEVO: Variable global para rastrear trabajo sin guardar
window.isWorkInProgress = false;

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL TEMA ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        }
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('theme', theme);
        });
    }

    // --- LÓGICA DE LOGOUT ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // Lógica de advertencia también podría ir aquí si se desea
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // --- LÓGICA DE NAVEGACIÓN (HAMBURGUESA) ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            document.body.classList.toggle('nav-open');
        });
    }
    
    // --- LÓGICA PARA MARCAR ENLACE ACTIVO Y AÑADIR GUARDIÁN DE NAVEGACIÓN ---
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();

        // Marcar enlace activo
        if (linkPage === currentPage) {
            link.classList.add('active');
        }

        // NUEVO: Guardián de navegación
        link.addEventListener('click', async (e) => {
            // No hacer nada si es un enlace deshabilitado o si es el enlace de la página actual
            if (link.classList.contains('disabled') || link.classList.contains('active')) {
                return;
            }

            if (window.isWorkInProgress) {
                e.preventDefault(); // Detener la navegación

                // Las funciones showConfirmationModal y clearWorkInProgress son definidas en las páginas específicas (descartes.js, script.js)
                if (typeof window.showConfirmationModal === 'function') {
                    const confirmado = await window.showConfirmationModal(
                        'Salir sin Guardar',
                        'Tienes cambios sin finalizar. ¿Estás seguro de que quieres salir y descartar el progreso?'
                    );

                    if (confirmado) {
                        if (typeof window.clearWorkInProgress === 'function') {
                            window.clearWorkInProgress(); // Limpiar sessionStorage
                        }
                        window.location.href = link.href; // Navegar a la nueva página
                    }
                } else {
                    // Fallback por si la función modal no está disponible
                    window.location.href = link.href;
                }
            }
        });
    });

    // --- TEMPORIZADOR DE INACTIVIDAD ---
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

    async function logoutUser() {
        alert("Cerrando sesión por inactividad...");
        // Limpiar trabajo en progreso antes de salir
        if (typeof window.clearWorkInProgress === 'function') {
            window.clearWorkInProgress();
        }
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
    }

    // CORRECCIÓN: Añadido descartes.html a la lista
    const pagesWithInactivityTimer = ['index.html', 'inicio.html', 'descartes.html'];
    if (pagesWithInactivityTimer.some(page => window.location.pathname.includes(page))) {
        window.onload = resetInactivityTimer;
        document.onmousemove = resetInactivityTimer;
        document.onkeydown = resetInactivityTimer;
        document.onclick = resetInactivityTimer;
    }
});