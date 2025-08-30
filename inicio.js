// --- CONFIGURACIÓN Y CLIENTE SUPABASE ---
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- PROTECCIÓN DE RUTA Y CARGADOR ---
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        // Personalizar bienvenida
        document.getElementById('welcome-message').textContent = `Bienvenido, ${session.user.email}`;
        
        // Mostrar contenido
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }
}
checkSession();

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGOUT Y TEMA ---
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });

    const themeToggleBtn = document.getElementById('theme-toggle');
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
});