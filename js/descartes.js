document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENTOS DEL DOM ---
    const inicioSection = document.getElementById('inicio-descarte-section');
    const registroSection = document.getElementById('registro-equipos-section');
    const btnIniciar = document.getElementById('btn-iniciar-descarte');
    const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
    const btnFinalizar = document.getElementById('btn-finalizar-descarte');
    
    // Modales
    const modalSesion = document.getElementById('modal-nueva-sesion');
    const btnCerrarModalSesion = document.getElementById('btn-cerrar-modal');
    const formNuevaSesion = document.getElementById('form-nueva-sesion');
    
    const modalEditar = document.getElementById('modal-editar-equipo');
    const formEditar = document.getElementById('form-editar-equipo');
    const btnCerrarModalEditar = document.getElementById('btn-cerrar-modal-editar');
    const btnCancelarEdicion = document.getElementById('btn-editar-cancelar');

    // Formularios y tabla
    const formEquipo = document.getElementById('form-equipo');
    const tablaEquiposBody = document.querySelector('#tabla-equipos tbody');
    const contadorEquiposSpan = document.getElementById('contador-equipos');
    const activeSessionIdSpan = document.getElementById('active-session-id');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let equiposCounter = 0;
    let toastTimeout;
    let equipoActualEditandoId = null;
    const SESSION_STORAGE_KEY = 'activeDescarteSessionId';

    // --- 3. FUNCIONES AUXILIARES ---

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
    
    // --- 4. LÓGICA DE SESIÓN Y RESTAURACIÓN ---

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

    // --- 5. MANEJADORES DE EVENTOS (CÓDIGO EXISTENTE) ---

    btnIniciar.addEventListener('click', () => modalSesion.style.display = 'flex');
    btnCerrarModalSesion.addEventListener('click', () => modalSesion.style.display = 'none');

    formNuevaSesion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const unidadAdministrativa = document.getElementById('unidad_administrativa').value.trim();
        const codigoSiace = document.getElementById('siace_code').value.trim();
        if (!unidadAdministrativa || !codigoSiace) {
            return showToast('Completa la unidad y el código SIACE.', 'error');
        }

        const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error("Usuario no encontrado.");
            
            const userProfile = getUserProfile(user);

            const nuevaSesion = {
                unidad_administrativa: unidadAdministrativa,
                codigo_siace: codigoSiace,
                tecnico_encargado: userProfile.name,
                fecha: new Date().toISOString().split('T')[0],
                user_id: user.id
            };

            const { data, error } = await supabaseClient.from('descartes_sesiones').insert(nuevaSesion).select().single();
            if (error) throw error;

            sessionStorage.setItem(SESSION_STORAGE_KEY, data.id);
            showRegistroUI(data.id);
            modalSesion.style.display = 'none';
            formNuevaSesion.reset();
        } catch (error) {
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
            showToast('Equipo añadido con éxito.', 'success');
        } catch (error) {
            showToast('No se pudo añadir el equipo.', 'error');
        } finally {
            btnAnadirEquipo.disabled = false;
            btnAnadirEquipo.textContent = 'Añadir Equipo';
        }
    });
    
    tablaEquiposBody.addEventListener('click', async (e) => {
        const target = e.target;
        const equipoId = target.dataset.id;

        if (target.classList.contains('btn-eliminar')) {
            const confirmado = await window.showConfirmationModal('Eliminar Equipo', '¿Estás seguro?');
            if (confirmado) {
                try {
                    await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
                    document.querySelector(`tr[data-id='${equipoId}']`).remove();
                    equiposCounter--;
                    contadorEquiposSpan.textContent = equiposCounter;
                } catch (error) {
                    showToast('No se pudo eliminar el equipo.', 'error');
                }
            }
        }

        if (target.classList.contains('btn-editar')) {
            try {
                const { data, error } = await supabaseClient.from('equipos_descartados').select('*').eq('id', equipoId).single();
                if (error) throw error;

                equipoActualEditandoId = data.id;
                document.getElementById('edit-descripcion').value = data.descripcion || '';
                document.getElementById('edit-marbete').value = data.marbete || '';
                document.getElementById('edit-serie').value = data.serie || '';
                document.getElementById('edit-marca').value = data.marca || '';
                document.getElementById('edit-modelo').value = data.modelo || '';
                document.getElementById('edit-estado_equipo').value = data.estado_equipo || '';
                document.getElementById('edit-motivo_descarte').value = data.motivo_descarte || '';
                
                modalEditar.style.display = 'flex';
            } catch (error) {
                showToast('No se pudieron cargar los datos del equipo.', 'error');
            }
        }
    });
    
    btnCerrarModalEditar.addEventListener('click', () => modalEditar.style.display = 'none');
    btnCancelarEdicion.addEventListener('click', () => modalEditar.style.display = 'none');
    
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datosActualizados = {
            descripcion: document.getElementById('edit-descripcion').value.trim(),
            marbete: document.getElementById('edit-marbete').value.trim(),
            serie: document.getElementById('edit-serie').value.trim(),
            marca: document.getElementById('edit-marca').value.trim(),
            modelo: document.getElementById('edit-modelo').value.trim(),
            estado_equipo: document.getElementById('edit-estado_equipo').value.trim(),
            motivo_descarte: document.getElementById('edit-motivo_descarte').value.trim(),
        };

        const submitBtn = formEditar.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Aplicando...';
        
        try {
            const { data, error } = await supabaseClient.from('equipos_descartados')
                .update(datosActualizados)
                .eq('id', equipoActualEditandoId)
                .select()
                .single();
            if (error) throw error;
            
            updateFilaEnTabla(data);
            modalEditar.style.display = 'none';
            showToast('Equipo actualizado con éxito.', 'success');
        } catch (error) {
            showToast('No se pudo actualizar el equipo.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Aplicar Cambios';
            equipoActualEditandoId = null;
        }
    });

    btnFinalizar.addEventListener('click', async () => {
        if (equiposCounter === 0) return showToast('Debes añadir al menos un equipo.', 'error');

        const confirmado = await window.showConfirmationModal('Finalizar Descarte', '¿Has terminado de registrar los equipos?');

        if (confirmado) {
            const currentSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
            const observacion = document.getElementById('observacion').value.trim();
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

    // --- NUEVO: LÓGICA DEL ESCÁNER DE CÓDIGO DE BARRAS ---

    const modalScanner = document.getElementById('modal-scanner');
    const videoElement = document.getElementById('video-scanner');
    const btnCerrarScanner = document.getElementById('btn-cerrar-scanner');
    let targetInput = null; // Variable para saber a qué input enviar el resultado

    const codeReader = new ZXing.BrowserMultiFormatReader();
    let stream = null; // Variable para guardar el stream de la cámara

    // Función para detener la cámara y el escáner
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        codeReader.reset();
        modalScanner.style.display = 'none';
    }

    // Cuando se hace clic en cualquier botón de escaneo (.btn-scan)
    document.querySelectorAll('.btn-scan').forEach(button => {
        button.addEventListener('click', async () => {
            const inputId = button.dataset.targetInput;
            targetInput = document.getElementById(inputId);
            
            try {
                // Pedimos permiso y obtenemos el stream de la cámara trasera
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                modalScanner.style.display = 'flex';

                // Empezamos a decodificar desde el stream de video
                codeReader.decodeFromStream(stream, videoElement, (result, err) => {
                    if (result) {
                        targetInput.value = result.getText(); // Ponemos el resultado en el input correcto
                        stopCamera(); // Detenemos la cámara y cerramos el modal
                        showToast('Código escaneado con éxito.', 'success');
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error("Error de escaneo:", err);
                        showToast('Error al escanear.', 'error');
                        stopCamera();
                    }
                });
            } catch (error) {
                console.error("Error al acceder a la cámara:", error);
                showToast('No se pudo acceder a la cámara.', 'error');
            }
        });
    });

    // Evento para el botón de cerrar el modal del scanner
    btnCerrarScanner.addEventListener('click', stopCamera);


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
        document.getElementById('main-content').style.display = 'flex';
    })();
});