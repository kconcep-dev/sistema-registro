// js/inicio.js

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
        
        // --- LÓGICA DEL MENSAJE DE BIENVENIDA PERSONALIZADO ---

        // 1. Obtenemos el perfil completo del usuario desde nuestra función centralizada.
        const userProfile = getUserProfile(session.user);

        // 2. Actualizamos el mensaje en la página usando el nombre del perfil.
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bienvenido, ${userProfile.name}`;     
        }
        
        // --- FIN DE LA LÓGICA ---
        
        // Mostrar contenido principal de la página
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
    }
}

// Ejecutamos la función al cargar la página
checkSession();