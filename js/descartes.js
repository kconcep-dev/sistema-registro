// js/descartes.js

// --- 0. EJECUCIÓN CUANDO EL DOM ESTÁ LISTO ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. PROTECCIÓN DE RUTA Y CARGADOR ---
    async function checkSessionAndInitialize() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        // Ocultar cargador y mostrar contenido
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }

    // --- 2. ELEMENTOS DEL DOM ---
    // Secciones principales
    const inicioSection = document.getElementById('inicio-descarte-section');
    const registroSection = document.getElementById('registro-equipos-section');

    // Botones
    const btnIniciar = document.getElementById('btn-iniciar-descarte');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
    const btnFinalizar = document.getElementById('btn-finalizar-descarte');

    // Modal y sus formularios
    const modal = document.getElementById('modal-nueva-sesion');
    const formNuevaSesion = document.getElementById('form-nueva-sesion');
    const inputUA = document.getElementById('unidad_administrativa');

    // Formulario de equipos
    const formEquipo = document.getElementById('form-equipo');

    // Tabla y contador
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');

    // Notificaciones Toast
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 3. ESTADO DE LA APLICACIÓN ---
    let currentSessionId = null;
    let equiposCounter = 0;
    let toastTimeout;

    // --- 4. FUNCIONES AUXILIARES ---

    // Función para mostrar notificaciones
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    // Función para renderizar un equipo en la tabla
    function renderEquipoEnTabla(equipo, numero) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', equipo.id); // Guardamos el ID del equipo en la fila
        tr.innerHTML = `
            <td>${numero}</td>
            <td>${equipo.descripcion}</td>
            <td>${equipo.marca}</td>
            <td>${equipo.serie}</td>
            <td>${equipo.marbete}</td>
            <td><button class="btn-eliminar" data-id="${equipo.id}">Eliminar</button></td>
        `;
        tablaEquiposBody.appendChild(tr);
    }

    // Función para obtener el nombre del usuario (simplificado)
    async function getUserName() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return 'Desconocido';
        const userMappings = {
            'concepcion.kelieser@gmail.com': 'Kevin',
            // Agrega más usuarios aquí si es necesario
        };
        return userMappings[user.email] || user.email.split('@')[0];
    }

    // --- 5. LÓGICA PRINCIPAL Y MANEJADORES DE EVENTOS ---

    // Abrir el modal para crear una nueva sesión
    btnIniciar.addEventListener('click', () => {
        modal.style.display = 'flex';
        inputUA.focus();
    });

    // Cerrar el modal
    btnCerrarModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Crear una nueva sesión de descarte
formNuevaSesion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unidadAdministrativa = inputUA.value.trim();
    if (!unidadAdministrativa) {
        showToast('Por favor, introduce la unidad administrativa.', 'error');
        return;
    }

    try {
        // --- INICIO DE LA CORRECCIÓN ---

        // 1. Obtenemos la información completa del usuario actual
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("No se pudo obtener el usuario.");

        // 2. Preparamos los datos, incluyendo el user.id
        const tecnico = await getUserName();
        const fecha = new Date().toISOString().split('T')[0];
        
        const nuevaSesion = {
            unidad_administrativa: unidadAdministrativa,
            tecnico_encargado: tecnico,
            fecha: fecha,
            user_id: user.id // <-- ESTA ES LA LÍNEA CLAVE
        };

        // --- FIN DE LA CORRECCIÓN ---

        const { data, error } = await supabaseClient
            .from('descartes_sesiones')
            .insert(nuevaSesion) // <-- Enviamos el nuevo objeto completo
            .select()
            .single();

        if (error) throw error;

        // Guardar el ID de la sesión actual
        currentSessionId = data.id;

        // Actualizar la interfaz (esto no cambia)
        document.getElementById('sesion-id').textContent = data.id;
        document.getElementById('sesion-ua').textContent = data.unidad_administrativa;
        document.getElementById('sesion-tecnico').textContent = data.tecnico_encargado;
        document.getElementById('sesion-fecha').textContent = new Date(data.fecha).toLocaleDateString('es-PA');

        // Cambiar de vista
        inicioSection.style.display = 'none';
        registroSection.style.display = 'block';
        modal.style.display = 'none';
        formNuevaSesion.reset();

        showToast('Sesión creada con éxito. Ya puedes añadir equipos.', 'success');

    } catch (error) {
        console.error('Error creando la sesión:', error);
        showToast('No se pudo crear la sesión.', 'error');
    }
});

    // Añadir un nuevo equipo
    formEquipo.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentSessionId) {
            showToast('Error: No hay una sesión activa.', 'error');
            return;
        }

        const nuevoEquipo = {
            sesion_id: currentSessionId,
            descripcion: document.getElementById('descripcion').value.trim(),
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            serie: document.getElementById('serie').value.trim(),
            marbete: document.getElementById('marbete').value.trim(),
            estado_equipo: document.getElementById('estado_equipo').value.trim(),
            motivo_descarte: document.getElementById('motivo_descarte').value.trim(),
        };

        // Aunque no son obligatorios, es bueno tener al menos una descripción
        if (!nuevoEquipo.descripcion) {
            showToast('La descripción es recomendable.', 'error');
            return;
        }

        try {
            btnAnadirEquipo.disabled = true;
            btnAnadirEquipo.textContent = 'Añadiendo...';

            const { data, error } = await supabaseClient
                .from('equipos_descartados')
                .insert(nuevoEquipo)
                .select()
                .single();

            if (error) throw error;

            // Actualizar UI
            equiposCounter++;
            contadorEquiposSpan.textContent = equiposCounter;
            renderEquipoEnTabla(data, equiposCounter);
            formEquipo.reset();
            document.getElementById('descripcion').focus(); // Foco en el primer campo para agilizar

            showToast('Equipo añadido con éxito.', 'success');

        } catch (error) {
            console.error('Error añadiendo equipo:', error);
            showToast('No se pudo añadir el equipo.', 'error');
        } finally {
            btnAnadirEquipo.disabled = false;
            btnAnadirEquipo.textContent = 'Añadir Equipo';
        }
    });
    
    // Eliminar un equipo (usando delegación de eventos)
    tablaEquiposBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const equipoId = e.target.dataset.id;
            
            if (!confirm('¿Estás seguro de que quieres eliminar este equipo?')) {
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from('equipos_descartados')
                    .delete()
                    .eq('id', equipoId);

                if (error) throw error;
                
                // Eliminar de la tabla visual
                const filaParaEliminar = document.querySelector(`tr[data-id='${equipoId}']`);
                filaParaEliminar.remove();
                
                // Actualizar contador
                // Nota: Esto desordenará la numeración, pero es lo más simple.
                // La numeración final correcta se hará al generar el Excel.
                equiposCounter--;
                contadorEquiposSpan.textContent = equiposCounter;

                showToast('Equipo eliminado.', 'success');

            } catch (error) {
                console.error('Error eliminando equipo:', error);
                showToast('No se pudo eliminar el equipo.', 'error');
            }
        }
    });

    // Finalizar el descarte
    btnFinalizar.addEventListener('click', async () => {
        const observacion = document.getElementById('observacion').value.trim();
        
        try {
             const { error } = await supabaseClient
                .from('descartes_sesiones')
                .update({ observacion: observacion })
                .eq('id', currentSessionId);
                
            if (error) throw error;

            alert('Descarte finalizado y guardado con éxito.');
            window.location.href = 'inicio.html';

        } catch (error) {
            console.error('Error al finalizar el descarte:', error);
            showToast('No se pudo guardar la observación final.', 'error');
        }
    });


    // --- 6. INICIALIZACIÓN ---
    checkSessionAndInitialize();

});