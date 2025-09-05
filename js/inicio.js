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

        // 1. Mapa de correos a nombres.
        //    Añade todos los usuarios que necesites aquí.
        const userMappings = {
            'concepcion.kelieser@gmail.com': 'Kevin',
            'otro.usuario@gmail.com': 'Ana'
            // 'email@ejemplo.com': 'Nombre',
        };

        const userEmail = session.user.email;
        let welcomeName;

        // 2. Verificamos si el correo del usuario está en nuestro mapa.
        if (userMappings[userEmail]) {
            // Si se encuentra, usamos el nombre del mapa.
            welcomeName = userMappings[userEmail];
        } else {
            // Si no, usamos la parte del correo antes del '@' como un nombre por defecto.
            welcomeName = userEmail.split('@')[0];
        }
        
        // 3. Actualizamos el mensaje en la página.
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bienvenido, ${welcomeName}`;
        }
        
        // --- FIN DE LA LÓGICA ---
        
        // Mostrar contenido principal de la página
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
    }
}

// Ejecutamos la función al cargar la página
checkSession();