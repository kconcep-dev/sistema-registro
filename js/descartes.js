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
    let currentSessionId = null;
    let equiposCounter = 0;
    let toastTimeout;
    const VIEW_STORAGE_KEY = 'descarteViewActive'; // Bandera para la vista

    // --- 3. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    // NUEVO: Lógica refinada para 'trabajo en progreso'
    function updateWorkInProgress() {
        const hasInputText = Array.from(formInputs).some(input => input.value.trim() !== '') || observacionInput.value.trim() !== '';
        window.isWorkInProgress = equiposCounter > 0 || hasInputText;
    }

    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        sessionStorage.removeItem(VIEW_STORAGE_KEY);
        // Resetea la UI a su estado inicial
        currentSessionId = null;
        equiposCounter = 0;
        contadorEquiposSpan.textContent = '0';
        tablaEquiposBody.innerHTML = '';
        formEquipo.reset();
        observacionInput.value = '';
        inicioSection.style.display = 'flex';
        registroSection.style.display = 'none';
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
        if (!unidadAdministrativa) return showToast('Por favor, introduce la unidad administrativa.', 'error');

        const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando Sesión...';

        try {
            // Lógica para crear la sesión en Supabase...
            const { data, error } = await supabaseClient.from('descartes_sesiones').insert({ unidad_administrativa: unidadAdministrativa }).select().single();
            if (error) throw error;
            currentSessionId = data.id;

            sessionStorage.setItem(VIEW_STORAGE_KEY, 'true'); // Activa la bandera de la vista
            
            inicioSection.style.display = 'none';
            registroSection.style.display = 'flex';
            modalSesion.style.display = 'none';
            formNuevaSesion.reset();
            updateWorkInProgress(); // Verifica el estado inicial (que será 'false')
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
            return showToast('Por favor, rellena al menos un campo del equipo.', 'error');
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
            updateWorkInProgress(); // Actualiza el estado
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
            const confirmado = await window.showConfirmationModal('Eliminar Equipo', '¿Estás seguro?');

            if (confirmado) {
                try {
                    await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
                    document.querySelector(`tr[data-id='${equipoId}']`).remove();
                    equiposCounter--;
                    contadorEquiposSpan.textContent = equiposCounter;
                    showToast('Equipo eliminado.', 'success');
                    updateWorkInProgress(); // Actualiza el estado
                } catch (error) {
                    showToast('No se pudo eliminar el equipo.', 'error');
                }
            }
        }
    });

    btnFinalizar.addEventListener('click', async () => {
        if (equiposCounter === 0) return showToast('Debes añadir al menos un equipo.', 'error');

        const confirmado = await window.showConfirmationModal('Finalizar Descarte', '¿Has terminado de registrar todos los equipos?');

        if (confirmado) {
            const observacion = observacionInput.value.trim();
            btnFinalizar.disabled = true;
            btnFinalizar.textContent = 'Finalizando...';
            try {
                await supabaseClient.from('descartes_sesiones').update({ observacion }).eq('id', currentSessionId);
                clearWorkInProgress(); // Limpia estado y bandera de vista
                showToast('Descarte finalizado y guardado.', 'success');
                setTimeout(() => window.location.href = 'inicio.html', 1500);
            } catch (error) {
                showToast('No se pudo guardar la observación final.', 'error');
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = 'Finalizar Descarte';
            }
        }
    });

    // --- 5. GUARDIANES Y ESTADO INICIAL ---

    // Guardián para recargar o cerrar la pestaña
    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    // Listeners para actualizar el estado mientras se escribe
    [...formInputs, observacionInput].forEach(input => {
        input.addEventListener('input', updateWorkInProgress);
    });

    // Función de inicialización
    (async function initializePage() {
        await supabaseClient.auth.getSession();
        
        // CORRECCIÓN: Comprueba la bandera de vista al cargar
        if (sessionStorage.getItem(VIEW_STORAGE_KEY) === 'true') {
            inicioSection.style.display = 'none';
            registroSection.style.display = 'flex';
            // Nota: El ID de sesión y los equipos no se restauran, la sesión se considera "perdida"
            // pero el usuario permanece en la vista del formulario para empezar de nuevo si lo desea.
            // Para restaurar, necesitaríamos guardar también el `currentSessionId`.
            // Por ahora, al recargar se pierde la sesión pero no la VISTA.
            showToast("Listo para continuar o iniciar una nueva sesión.", "success");
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    })();
});