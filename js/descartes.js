// js/descartes.js

// --- 0. EJECUCIÓN CUANDO EL DOM ESTÁ LISTO ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENTOS DEL DOM ---
    const inicioSection = document.getElementById('inicio-descarte-section');
    const registroSection = document.getElementById('registro-equipos-section');
    const btnIniciar = document.getElementById('btn-iniciar-descarte');
    const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
    const btnFinalizar = document.getElementById('btn-finalizar-descarte');
    const modalSesion = document.getElementById('modal-nueva-sesion');
    const btnCerrarModalSesion = document.getElementById('btn-cerrar-modal');
    const formNuevaSesion = document.getElementById('form-nueva-sesion');
    const inputUA = document.getElementById('unidad_administrativa');
    const formEquipo = document.getElementById('form-equipo');
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let currentSessionId = null;
    let equiposCounter = 0;
    let toastTimeout;

    // --- 3. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

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

    // NUEVO: Función para limpiar el estado de trabajo. Se expone globalmente.
    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        // Resetea la UI a su estado inicial si el usuario abandona la página
        if (window.location.pathname.includes('descartes.html')) {
            currentSessionId = null;
            equiposCounter = 0;
            contadorEquiposSpan.textContent = '0';
            tablaEquiposBody.innerHTML = '';
            formEquipo.reset();
            document.getElementById('observacion').value = '';
            inicioSection.style.display = 'flex';
            registroSection.style.display = 'none';
        }
    };
    
    // --- 4. MANEJADORES DE EVENTOS ---

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
            
            const tecnico = await (async () => {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return 'Desconocido';
                const userMappings = { 'concepcion.kelieser@gmail.com': 'Kevin' };
                return userMappings[user.email] || user.email.split('@')[0];
            })();
            
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
            
            // Activa el guardián de navegación
            window.isWorkInProgress = true; 

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
            
            const confirmado = await window.showConfirmationModal(
                'Eliminar Equipo', 
                '¿Estás seguro de que quieres eliminar este equipo?'
            );

            if (confirmado) {
                try {
                    const { error } = await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
                    if (error) throw error;
                    
                    document.querySelector(`tr[data-id='${equipoId}']`).remove();
                    
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
        if (equiposCounter === 0) {
            showToast('Debes añadir al menos un equipo antes de finalizar.', 'error');
            return;
        }

        const confirmado = await window.showConfirmationModal(
            'Finalizar Descarte',
            '¿Has terminado de registrar todos los equipos?'
        );

        if (confirmado) {
            const observacion = document.getElementById('observacion').value.trim();
            btnFinalizar.disabled = true;
            btnFinalizar.textContent = 'Finalizando...';
            try {
                const { error } = await supabaseClient.from('descartes_sesiones').update({ observacion: observacion }).eq('id', currentSessionId);
                if (error) throw error;
                
                window.isWorkInProgress = false; // Desactiva el guardián
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

    // NUEVO: Guardián para recargar o cerrar la pestaña
    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            // El navegador se encarga de mostrar el mensaje por defecto.
            // La siguiente línea es requerida por algunos navegadores antiguos.
            event.returnValue = '';
        }
    });

    // --- 5. INICIALIZACIÓN ---
    (async function initializePage() {
        await supabaseClient.auth.getSession();
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    })();
});