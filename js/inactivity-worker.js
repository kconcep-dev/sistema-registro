// Los temporizadores están en milisegundos
const INACTIVITY_WARNING_TIMEOUT = 10 * 60 * 1000; // 10 minutos
const FORCED_LOGOUT_DELAY = 5 * 60 * 1000;      // 5 minutos

let warningTimer;
let logoutTimer;

function startTimers() {
    // Limpiar cualquier temporizador existente
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);

    // Iniciar el primer temporizador para el aviso de inactividad
    warningTimer = setTimeout(() => {
        // Cuando se dispare, notificar al hilo principal para que muestre el aviso
        self.postMessage('showWarning');
        
        // Luego, iniciar el temporizador para el cierre de sesión final
        logoutTimer = setTimeout(() => {
            // Cuando este se dispare, notificar al hilo principal para que realice el cierre de sesión
            self.postMessage('logout');
        }, FORCED_LOGOUT_DELAY);

    }, INACTIVITY_WARNING_TIMEOUT);
}

// Escuchar mensajes desde el hilo principal
self.onmessage = (event) => {
    // Cualquier mensaje de actividad ('start' o 'reset') reiniciará los temporizadores
    if (event.data === 'start' || event.data === 'reset') {
        startTimers();
    }
};
