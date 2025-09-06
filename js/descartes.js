// js/descartes.js

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
    const formInputs = formEquipo.querySelectorAll('input');
    const observacionInput = document.getElementById('observacion');
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let equiposCounter = 0;
    let toastTimeout;
    const SESSION_STORAGE_KEY = 'activeDescarteSessionId'; // Clave para la sesión

    // --- 3. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    function updateWorkInProgress() {
        const hasInputText = Array.from(formInputs).some(input => input.value.trim() !== '') || observacionInput.value.trim() !== '';
        // El trabajo está en progreso si hay una sesión activa
        window.isWorkInProgress = !!sessionStorage.getItem(SESSION_STORAGE_KEY);
    }

    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        // Resetea la UI a su estado inicial
        if (window.location.pathname.includes('descartes.html')) {
            equiposCounter = 0;
            contadorEquiposSpan.textContent = '0';
            tablaEquiposBody.innerHTML = '';
            formEquipo.reset();
            observacionInput.value = '';
            inicioSection.style.display = 'flex';
            registroSection.style.display = 'none';
        }
    };

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

    // NUEVO: Función para mostrar la UI de registro
    function showRegistroUI() {
        inicioSection.style.display = 'none';
        registroSection.style.display = 'flex';
        updateWorkInProgress();
    }
    
    // --- 4. LÓGICA DE SESIÓN Y RESTAURACIÓN ---

    async function restoreSession(sessionId) {
        try {
            // Obtener equipos de la sesión guardada
            const { data: equiposData, error: equiposError } = await supabaseClient
                .from('equipos_descartados')
                .select('*')
                .eq('sesion_id', sessionId)
                .order('created_at', { ascending: true });
            if (equiposError) throw equiposError;
            
            // Renderizar la UI
            showRegistroUI();
            tablaEquiposBody.innerHTML = '';
            equiposData.forEach((equipo, index) => {
                renderEquipoEnTabla(equipo, index + 1);
            });
            equiposCounter = equiposData.length;
            contadorEquiposSpan.textContent = equiposCounter;
            
            showToast('Sesión anterior restaurada.', 'success');
            updateWorkInProgress();

        } catch (error) {
            console.error("Error restaurando la sesión:", error);
            showToast("No se pudo restaurar la sesión. Empezando de nuevo.", "error");
            clearWorkInProgress();
        }
    }
    
    // --- 5. MANEJADORES DE EVENTOS ---

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
        if (!unidadAdministrativa) return showToast('Introduce la unidad administrativa.', 'error');

        const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error("Usuario no encontrado.");

            const tecnico = await (async () => {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return 'Desconocido';
                const userMappings = { 'concepcion.kelieser@gmail.com': 'Kevin' };
                return userMappings[user.email] || user.email.split('@')[0];
            })();
            
            const nuevaSesion = {
                unidad_administrativa: unidadAdministrativa,
                tecnico_encargado: tecnico,
                fecha: new Date().toISOString().split('T')[0],
                user_id: user.id
            };

            const { data, error } = await supabaseClient.from('descartes_sesiones').insert(nuevaSesion).select().single();
            if (error) throw error;

            sessionStorage.setItem(SESSION_STORAGE_KEY, data.id); // Guarda el ID de la sesión
            
            showRegistroUI();
            modalSesion.style.display = 'none';
            formNuevaSesion.reset();
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
        const currentSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!currentSessionId) return showToast('Error: No hay una sesión activa.', 'error');

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

        if (Object.values(nuevoEquipo).slice(1).every(v => v === '')) {
            return showToast('Por favor, rellena al menos un campo.', 'error');
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
        } catch (error) {
            showToast('No se pudo añadir el equipo.', 'error');
        } finally {
            btnAnadirEquipo.disabled = false;
            btnAnadirEquipo.textContent = 'Añadir Equipo';
            updateWorkInProgress();
        }
    });
    
    tablaEquiposBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const equipoId = e.target.dataset.id;
            const confirmado = await window.showConfirmationModal('Eliminar Equipo', '¿Estás seguro?');

            if (confirmado) {
                try {
                    await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
                    document.querySelector(`tr[data-id='${equipoId}']`).remove();
                    equiposCounter--;
                    contadorEquiposSpan.textContent = equiposCounter;
                    updateWorkInProgress();
                } catch (error) {
                    showToast('No se pudo eliminar el equipo.', 'error');
                }
            }
        }
    });

    btnFinalizar.addEventListener('click', async () => {
        if (equiposCounter === 0) return showToast('Debes añadir al menos un equipo.', 'error');

        const confirmado = await window.showConfirmationModal('Finalizar Descarte', '¿Has terminado de registrar los equipos?');

        if (confirmado) {
            const currentSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
            const observacion = observacionInput.value.trim();
            btnFinalizar.disabled = true;
            btnFinalizar.textContent = 'Finalizando...';
            try {
                await supabaseClient.from('descartes_sesiones').update({ observacion }).eq('id', currentSessionId);
                clearWorkInProgress();
                showToast('Descarte finalizado y guardado.', 'success');
                setTimeout(() => window.location.href = 'inicio.html', 1500);
            } catch (error) {
                showToast('No se pudo guardar la observación.', 'error');
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = 'Finalizar Descarte';
            }
        }
    });

    // --- 6. GUARDIANES E INICIALIZACIÓN ---

    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    (async function initializePage() {
        await supabaseClient.auth.getSession();
        
        const activeSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (activeSessionId) {
            await restoreSession(activeSessionId);
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    })();
});