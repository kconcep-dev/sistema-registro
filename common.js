// common.js

// --- 1. CONFIGURACIÓN Y CLIENTE SUPABASE (ÚNICO LUGAR) ---
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. FUNCIONES COMUNES (Se ejecutarán cuando el DOM esté listo) ---
document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL TEMA ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) { // Verificamos que el botón exista en la página actual
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
    if (logoutBtn) { // Verificamos que el botón exista
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // --- LÓGICA DE NAVEGACIÓN MÓVIL (HAMBURGUESA) ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) { // Verificamos que el botón exista
        hamburgerBtn.addEventListener('click', () => {
            document.body.classList.toggle('nav-open');
        });
    }

    // --- LÓGICA PARA MARCAR ENLACE ACTIVO ---
    const currentPage = window.location.pathname.split('/').pop(); // Obtiene "inicio.html" o "index.html"
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // --- TEMPORIZADOR DE INACTIVIDAD (Ahora en todas las páginas protegidas) ---
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos

    async function logoutUser() {
        alert("Cerrando sesión por inactividad..."); // Puedes cambiarlo por un toast si quieres
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
    }
    
    // El temporizador solo se activa si no estamos en la página de login
    if (window.location.pathname.includes('index.html') || window.location.pathname.includes('inicio.html')) {
        window.onload = resetInactivityTimer;
        document.onmousemove = resetInactivityTimer;
        document.onkeydown = resetInactivityTimer;
        document.onclick = resetInactivityTimer;
    }
});