/**
 * Comprueba que exista una sesión válida antes de mostrar el panel de inicio
 * y personaliza el mensaje de bienvenida con los datos del perfil.
 */
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
        const userProfile = getUserProfile(session.user);
        /* Inserta el nombre del perfil en la vista para reforzar la identidad */
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bienvenido, ${userProfile.name}`;
        }
        /* Una vez validada la sesión, se muestra el contenido protegido */
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
    }
}

/* Arranca la comprobación inmediatamente para evitar parpadeos de contenido */
checkSession();
