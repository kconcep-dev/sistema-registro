// --- PROTECCIÓN DE RUTA Y BIENVENIDA ---
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
        console.error("Error al obtener la sesión:", error);
        window.location.href = 'login.html';
        return;
    }

    if (!session) {
        window.location.href = 'login.html';
    } else {
        // Personalizar bienvenida
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bienvenido, ${session.user.email}`;
        }
        
        // Mostrar contenido
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        document.getElementById('header-buttons').style.display = 'flex';
    }
}

checkSession();