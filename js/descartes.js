// js/descartes.js

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENTS ---
    const inicioSection = document.getElementById('inicio-descarte-section');
    const registroSection = document.getElementById('registro-equipos-section');
    const btnIniciar = document.getElementById('btn-iniciar-descarte');
    const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
    const btnFinalizar = document.getElementById('btn-finalizar-descarte');
    
    // Modals
    const modalSesion = document.getElementById('modal-nueva-sesion');
    const btnCerrarModalSesion = document.getElementById('btn-cerrar-modal');
    const formNuevaSesion = document.getElementById('form-nueva-sesion');
    
    const modalEditar = document.getElementById('modal-editar-equipo');
    const formEditar = document.getElementById('form-editar-equipo');
    const btnCerrarModalEditar = document.getElementById('btn-cerrar-modal-editar');
    const btnCancelarEdicion = document.getElementById('btn-editar-cancelar');

    // Forms & Table
    const formEquipo = document.getElementById('form-equipo');
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');
    const activeSessionIdSpan = document.getElementById('active-session-id');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 2. APP STATE ---
    let equiposCounter = 0;
    let toastTimeout;
    let equipoActualEditandoId = null;
    const SESSION_STORAGE_KEY = 'activeDescarteSessionId';

    // --- 3. HELPER FUNCTIONS ---
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (window.location.pathname.includes('descartes.html')) {
            equiposCounter = 0;
            contadorEquiposSpan.textContent = '0';
            tablaEquiposBody.innerHTML = '';
            formEquipo.reset();
            document.getElementById('observacion').value = '';
            inicioSection.style.display = 'flex';
            registroSection.style.display = 'none';
            document.body.classList.add('page-descartes-inicio');
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
            <td class="actions-cell">
                <button class="btn-accion btn-editar" data-id="${equipo.id}">Editar</button>
                <button class="btn-accion btn-eliminar" data-id="${equipo.id}">Eliminar</button>
            </td>
        `;
        tablaEquiposBody.appendChild(tr);
    }

    function updateFilaEnTabla(equipoActualizado) {
        const fila = document.querySelector(`tr[data-id='${equipoActualizado.id}']`);
        if (fila) {
            fila.cells[1].textContent = equipoActualizado.descripcion || '-';
            fila.cells[2].textContent = equipoActualizado.marbete || '-';
            fila.cells[3].textContent = equipoActualizado.serie || '-';
            fila.cells[4].textContent = equipoActualizado.marca || '-';
            fila.cells[5].textContent = equipoActualizado.modelo || '-';
            fila.cells[6].textContent = equipoActualizado.estado_equipo || '-';
            fila.cells[7].textContent = equipoActualizado.motivo_descarte || '-';
        }
    }

    function showRegistroUI(sessionId) {
        activeSessionIdSpan.textContent = sessionId;
        inicioSection.style.display = 'none';
        registroSection.style.display = 'flex';
        window.isWorkInProgress = true;
        document.body.classList.remove('page-descartes-inicio');
    }
    
    // --- 4. SESSION LOGIC & RESTORATION ---
    async function restoreSession(sessionId) {
        try {
            const { data: equiposData, error } = await supabaseClient
                .from('equipos_descartados')
                .select('*')
                .eq('sesion_id', sessionId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            
            showRegistroUI(sessionId);
            tablaEquiposBody.innerHTML = '';
            equiposData.forEach((equipo, index) => renderEquipoEnTabla(equipo, index + 1));
            equiposCounter = equiposData.length;
            contadorEquiposSpan.textContent = equiposCounter;
            
            showToast('Sesión anterior restaurada.', 'success');
        } catch (error) {
            showToast("No se pudo restaurar la sesión. Empezando de nuevo.", "error");
            clearWorkInProgress();
        }
    }

    // --- 5. EVENT HANDLERS ---

    // 🔥 MODIFIED: Use classList to show/hide modals
    btnIniciar.addEventListener('click', () => modalSesion.classList.add('visible'));
    btnCerrarModalSesion.addEventListener('click', () => modalSesion.classList.remove('visible'));

    formNuevaSesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (form validation)
        try {
            // ... (supabase logic)
            sessionStorage.setItem(SESSION_STORAGE_KEY, data.id);
            showRegistroUI(data.id);
            modalSesion.classList.remove('visible'); // 🔥 MODIFIED
            formNuevaSesion.reset();
        } catch (error) {
            // ... (error handling)
        } finally {
            // ... (button reset)
        }
    });
    
    formEquipo.addEventListener('submit', async (e) => {
        // ... (This function has no modal logic, so no changes needed)
    });
    
    tablaEquiposBody.addEventListener('click', async (e) => {
        const target = e.target;
        const equipoId = target.dataset.id;
        if (target.classList.contains('btn-eliminar')) {
            // ... (delete logic)
        }
        if (target.classList.contains('btn-editar')) {
            try {
                // ... (fetch data logic)
                modalEditar.classList.add('visible'); // 🔥 MODIFIED
            } catch (error) {
                showToast('No se pudieron cargar los datos del equipo.', 'error');
            }
        }
    });
    
    // 🔥 MODIFIED: Use classList to hide modals
    btnCerrarModalEditar.addEventListener('click', () => modalEditar.classList.remove('visible'));
    btnCancelarEdicion.addEventListener('click', () => modalEditar.classList.remove('visible'));
    
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (update logic)
        try {
            // ... (supabase logic)
            updateFilaEnTabla(data);
            modalEditar.classList.remove('visible'); // 🔥 MODIFIED
            showToast('Equipo actualizado con éxito.', 'success');
        } catch (error) {
            // ... (error handling)
        } finally {
            // ... (button reset)
        }
    });

    btnFinalizar.addEventListener('click', async () => {
        // ... (This function has no modal logic, so no changes needed)
    });

    // --- BARCODE SCANNER LOGIC (ZXing) ---
    const modalScanner = document.getElementById('modal-scanner');
    const videoElement = document.getElementById('video-scanner');
    const btnCerrarScanner = document.getElementById('btn-cerrar-scanner');
    let targetInput = null;
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let stream = null;

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        codeReader.reset();
        modalScanner.classList.remove('visible'); // 🔥 MODIFIED
    }

    document.querySelectorAll('.btn-scan').forEach(button => {
        button.addEventListener('click', async () => {
            // ... (logic to get target input)
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                modalScanner.classList.add('visible'); // 🔥 MODIFIED
                codeReader.decodeFromStream(stream, videoElement, (result, err) => {
                    // ... (decode logic)
                });
            } catch (error) {
                // ... (error handling)
            }
        });
    });

    btnCerrarScanner.addEventListener('click', stopCamera);

    // --- 6. GUARDS & INITIALIZATION ---
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
        document.getElementById('main-content').style.display = 'flex';
    })();
});