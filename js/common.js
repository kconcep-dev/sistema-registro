// js/common.js

// --- 1. CONFIGURACIÓN Y CLIENTE SUPABASE ---
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. INYECTOR DE BARRA DE NAVEGACIÓN (CENTRALIZADO) ---
// El HTML de nuestro navbar vive aquí, en un solo lugar.
const navbarHTML = `
    <nav class="navbar">
        <div class="nav-container">
            <a href="inicio.html" class="nav-brand">Registro STI</a>
            <ul class="nav-links" id="nav-menu">
                <li class="nav-item"><a href="inicio.html" class="nav-link">🏠 Inicio</a></li>
                <li class="nav-item"><a href="index.html" class="nav-link">📝 Registrar</a></li>
                <li class="nav-item"><a href="#" class="nav-link disabled">🗑️ Descartes</a></li>
                <li class="nav-item"><a href="#" class="nav-link disabled">📊 Consultar</a></li>
            </ul>
            <div class="nav-controls">
                <button id="logout-btn" class="header-btn nav-control-btn" title="Cerrar Sesión">
                    <img src="assets/images/icono-logout-light.png" alt="Cerrar Sesión" class="icon-light">
                    <img src="assets/images/icono-logout-dark.png" alt="Cerrar Sesión" class="icon-dark">
                </button>
                <button id="theme-toggle" class="theme-btn nav-control-btn" title="Cambiar Tema">🌙</button>
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

// Insertamos el HTML en el placeholder de cada página.
const navbarPlaceholder = document.getElementById('navbar-placeholder');
if (navbarPlaceholder) {
    navbarPlaceholder.innerHTML = navbarHTML;
}

// --- 3. FUNCIONES COMUNES (Se ejecutarán cuando el DOM esté listo) ---
document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL TEMA ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) { 
        // Aplicar tema guardado al cargar la página
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        }
        // Evento para cambiar el tema
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

    // --- LÓGICA PARA MARCAR ENLACE ACTIVO ---
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // --- TEMPORIZADOR DE INACTIVIDAD ---
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
    
    async function logoutUser() {
        alert("Cerrando sesión por inactividad...");
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
    }
    
    if (window.location.pathname.includes('index.html') || window.location.pathname.includes('inicio.html')) {
        window.onload = resetInactivityTimer;
        document.onmousemove = resetInactivityTimer;
        document.onkeydown = resetInactivityTimer;
        document.onclick = resetInactivityTimer;
    }
});