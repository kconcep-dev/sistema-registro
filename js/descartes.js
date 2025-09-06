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
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }

    // --- 2. ELEMENTOS DEL DOM ---
    const inicioSection = document.getElementById('inicio-descarte-section');
    const registroSection = document.getElementById('registro-equipos-section');
    const btnIniciar = document.getElementById('btn-iniciar-descarte');
    const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
    const btnFinalizar = document.getElementById('btn-finalizar-descarte');

    // Modales
    const modalSesion = document.getElementById('modal-nueva-sesion');
    const btnCerrarModalSesion = document.getElementById('btn-cerrar-modal');
    const formNuevaSesion = document.getElementById('form-nueva-sesion');
    const inputUA = document.getElementById('unidad_administrativa');
    
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const btnConfirmarAceptar = document.getElementById('btn-confirmar-aceptar');
    const btnConfirmarCancelar = document.getElementById('btn-confirmar-cancelar');

    const formEquipo = document.getElementById('form-equipo');
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 3. ESTADO DE LA APLICACIÓN ---
    let currentSessionId = null;
    let equiposCounter = 0;
    let toastTimeout;
    
    // --- 4. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    // CORRECCIÓN: Renderiza la tabla con todas las columnas
    function renderEquipoEnTabla(equipo, numero) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', equipo.id);
        tr.innerHTML = `
            <td>${numero}</td>
            <td>${equipo.descripcion || '-'}</td>
            <td>${equipo.marbete || '-'}</td>
            <td>${equipo.serie || '-'}</td>
            <td>${equipo.marca || '-'}</td>
            <td>${equipo.modelo || '-'}</td>
            <td>${equipo.estado_equipo || '-'}</td>
            <td>${equipo.motivo_descarte || '-'}</td>
            <td><button class="btn-eliminar" data-id="${equipo.id}">Eliminar</button></td>
        `;
        tablaEquiposBody.appendChild(tr);
    }

    async function getUserName() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return 'Desconocido';
        const userMappings = { 'concepcion.kelieser@gmail.com': 'Kevin' };
        return userMappings[user.email] || user.email.split('@')[0];
    }

    function showConfirmationModal(title, message) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        modalConfirmacion.style.display = 'flex';

        return new Promise((resolve) => {
            btnConfirmarAceptar.onclick = () => {
                modalConfirmacion.style.display = 'none';
                resolve(true);
            };
            btnConfirmarCancelar.onclick = () => {
                modalConfirmacion.style.display = 'none';
                resolve(false);
            };
        });
    }

    // --- 5. LÓGICA PRINCIPAL Y MANEJADORES DE EVENTOS ---

    btnIniciar.addEventListener('click', () => {
        modalSesion.style.display = 'flex';
        inputUA.focus();
    });

    btnCerrarModalSesion.addEventListener('click', () => {
        modalSesion.style.display = 'none';
    });

    formNuevaSesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const unidadAdministrativa = inputUA.value.trim();
        if (!unidadAdministrativa) {
            showToast('Por favor, introduce la unidad administrativa.', 'error');
            return;
        }

        const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando Sesión...';

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error("No se pudo obtener el usuario.");
            
            const tecnico = await getUserName();
            const fecha = new Date().toISOString().split('T')[0];
            const nuevaSesion = {
                unidad_administrativa: unidadAdministrativa,
                tecnico_encargado: tecnico,
                fecha: fecha,
                user_id: user.id
            };

            const { data, error } = await supabaseClient.from('descartes_sesiones').insert(nuevaSesion).select().single();
            if (error) throw error;

            currentSessionId = data.id;
            document.getElementById('sesion-id').textContent = data.id;
            document.getElementById('sesion-ua').textContent = data.unidad_administrativa;
            document.getElementById('sesion-tecnico').textContent = data.tecnico_encargado;
            document.getElementById('sesion-fecha').textContent = new Date(data.fecha + 'T00:00:00').toLocaleDateString('es-PA');

            inicioSection.style.display = 'none';
            registroSection.style.display = 'flex';
            modalSesion.style.display = 'none';
            formNuevaSesion.reset();
            showToast('Sesión creada. Ya puedes añadir equipos.', 'success');
        } catch (error) {
            console.error('Error creando la sesión:', error);
            showToast('No se pudo crear la sesión.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Sesión';
        }
    });
    
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

        // CORRECCIÓN: Verifica si todos los campos están vacíos
        const isFormEmpty = Object.values(nuevoEquipo).slice(1).every(value => value === '');
        if (isFormEmpty) {
            showToast('Por favor, rellena al menos un campo del equipo.', 'error');
            return;
        }

        btnAnadirEquipo.disabled = true;
        btnAnadirEquipo.textContent = 'Añadiendo...';
        try {
            const { data, error } = await supabaseClient.from('equipos_descartados').insert(nuevoEquipo).select().single();
            if (error) throw error;
            
            equiposCounter++;
            contadorEquiposSpan.textContent = equiposCounter;
            renderEquipoEnTabla(data, equiposCounter);
            formEquipo.reset();
            document.getElementById('descripcion').focus();
            showToast('Equipo añadido con éxito.', 'success');
        } catch (error) {
            console.error('Error añadiendo equipo:', error);
            showToast('No se pudo añadir el equipo.', 'error');
        } finally {
            btnAnadirEquipo.disabled = false;
            btnAnadirEquipo.textContent = 'Añadir Equipo';
        }
    });
    
    tablaEquiposBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const equipoId = e.target.dataset.id;
            
            const confirmado = await showConfirmationModal(
                'Eliminar Equipo', 
                '¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer.'
            );

            if (confirmado) {
                try {
                    const { error } = await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
                    if (error) throw error;
                    
                    const filaParaEliminar = document.querySelector(`tr[data-id='${equipoId}']`);
                    filaParaEliminar.remove();
                    
                    equiposCounter--;
                    contadorEquiposSpan.textContent = equiposCounter;
                    showToast('Equipo eliminado.', 'success');
                } catch (error) {
                    console.error('Error eliminando equipo:', error);
                    showToast('No se pudo eliminar el equipo.', 'error');
                }
            }
        }
    });

    btnFinalizar.addEventListener('click', async () => {
        // CORRECCIÓN: Verifica si se ha añadido al menos un equipo
        if (equiposCounter === 0) {
            showToast('Debes añadir al menos un equipo antes de finalizar.', 'error');
            return;
        }

        const confirmado = await showConfirmationModal(
            'Finalizar Descarte',
            '¿Has terminado de registrar todos los equipos para esta sesión?'
        );

        if (confirmado) {
            const observacion = document.getElementById('observacion').value.trim();
            btnFinalizar.disabled = true;
            btnFinalizar.textContent = 'Finalizando...';
            try {
                const { error } = await supabaseClient.from('descartes_sesiones').update({ observacion: observacion }).eq('id', currentSessionId);
                if (error) throw error;

                showToast('Descarte finalizado y guardado.', 'success');
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 1500);
            } catch (error) {
                console.error('Error al finalizar el descarte:', error);
                showToast('No se pudo guardar la observación final.', 'error');
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = 'Finalizar Descarte';
            }
        }
    });

    // --- 6. INICIALIZACIÓN ---
    checkSessionAndInitialize();
});