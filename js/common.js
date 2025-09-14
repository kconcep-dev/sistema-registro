// js/common.js

// --- 1. SUPABASE CLIENT CONFIGURATION ---
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. NAVBAR INJECTOR ---
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

// --- 3. COMMON LOGIC & FUNCTIONS ---

window.isWorkInProgress = false;

window.clearWorkInProgress = () => {
    window.isWorkInProgress = false;
};

// 🔥 UPDATED MODAL FUNCTION 🔥
window.showConfirmationModal = (title, message) => {
    const modal = document.getElementById('modal-confirmacion');
    if (!modal) return Promise.resolve(true);

    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const btnAceptar = document.getElementById('btn-confirmar-aceptar');
    const btnCancelar = document.getElementById('btn-confirmar-cancelar');

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    modal.classList.add('visible'); // Use class to show

    return new Promise((resolve) => {
        btnAceptar.onclick = () => {
            modal.classList.remove('visible'); // Use class to hide
            resolve(true);
        };
        btnCancelar.onclick = () => {
            modal.classList.remove('visible'); // Use class to hide
            resolve(false);
        };
    });
};

document.addEventListener('DOMContentLoaded', () => {

   // --- THEME LOGIC ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        if (document.documentElement.classList.contains('dark-mode')) {
            themeToggleBtn.textContent = '☀️';
        }
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-mode');
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            themeToggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        });
    }
    
    // --- NAVIGATION LOGIC (HAMBURGER) ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    }

    // --- SAFE EXIT FUNCTION ---
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

    // --- LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            safeExit(async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        });
    }

    // --- ACTIVE LINK & NAVIGATION GUARD LOGIC ---
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
        link.addEventListener('click', (e) => {
            if (link.classList.contains('disabled') || link.classList.contains('active')) {
                e.preventDefault(); // Prevent navigation for disabled or active links
                return;
            }
            e.preventDefault();
            safeExit(() => {
                window.location.href = link.href;
            });
        });
    });

    // --- INACTIVITY TIMER ---
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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
    if (!user) {
        return { name: 'Desconocido', role: 'Invitado' };
    }

    const userMappings = {
        'concepcion.kelieser@gmail.com': { name: 'Kevin', role: 'Técnico' },
        'usuario2@empresa.com': { name: 'Ana', role: 'Técnico' },
        'jefe.departamento@empresa.com': { name: 'Carlos', role: 'Supervisor' }
    };

    const userEmail = user.email;
    const profile = userMappings[userEmail];

    if (profile) {
        return profile;
    } 
    
    return { name: userEmail.split('@')[0], role: 'Usuario' };
}