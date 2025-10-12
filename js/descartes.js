document.addEventListener('DOMContentLoaded', () => {

  // --- Helpers de fecha/hora en zona 'America/Panama' ---
  function getLocalPaDateISO() {
    // Devuelve 'YYYY-MM-DD' (en-CA) según hora local de Panamá
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date());
  }
  // Si en el futuro necesitas hora local: 
  // function getLocalPaTime24h() {
  //   const t = new Intl.DateTimeFormat('es-PA', {
  //     timeZone: 'America/Panama',
  //     hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  //   }).format(new Date());
  //   return t.replace(/\./g, ':').replace(/\s/g, '');
  // }

  // --- 1. ELEMENTOS DEL DOM ---
  const inicioSection = document.getElementById('inicio-descarte-section');
  const registroSection = document.getElementById('registro-equipos-section');
  const btnIniciar = document.getElementById('btn-iniciar-descarte');
  const btnAnadirEquipo = document.getElementById('btn-anadir-equipo');
  const btnFinalizar = document.getElementById('btn-finalizar-descarte');
  const pageDescription = document.getElementById('descartes-description');
  const iconButtons = document.querySelectorAll('.button-with-icon');
  const mobileLabelQuery = window.matchMedia('(max-width: 600px)');

  // Modales
  const modalSesion = document.getElementById('modal-nueva-sesion');
  const btnCerrarModalSesion = document.getElementById('btn-cerrar-modal');
  const formNuevaSesion = document.getElementById('form-nueva-sesion');

  const nuevaSesionRequiredInputs = formNuevaSesion
    ? Array.from(formNuevaSesion.querySelectorAll('input[required]'))
    : [];

  nuevaSesionRequiredInputs.forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (!formNuevaSesion.reportValidity()) return;
      const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
    });
  });
  
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

  iconButtons.forEach((button) => {
    const labelSpan = button.querySelector('.button-label');
    if (!labelSpan) return;
    if (!button.dataset.labelDesktop) {
      button.dataset.labelDesktop = labelSpan.textContent.trim();
    }
    if (!button.dataset.labelMobile) {
      button.dataset.labelMobile = button.dataset.labelDesktop;
    }
  });

  function applyResponsiveLabel(button) {
    if (button.dataset.loading === 'true') return;
    const labelSpan = button.querySelector('.button-label');
    if (!labelSpan) return;
    const desktopLabel = button.dataset.labelDesktop;
    if (!desktopLabel) return;
    const mobileLabel = button.dataset.labelMobile || desktopLabel;
    labelSpan.textContent = mobileLabelQuery.matches ? mobileLabel : desktopLabel;
  }

  function applyResponsiveLabels() {
    iconButtons.forEach(applyResponsiveLabel);
  }

  if (typeof mobileLabelQuery.addEventListener === 'function') {
    mobileLabelQuery.addEventListener('change', applyResponsiveLabels);
  } else if (typeof mobileLabelQuery.addListener === 'function') {
    mobileLabelQuery.addListener(applyResponsiveLabels);
  }
  applyResponsiveLabels();

  function setButtonLoading(button, isLoading, loadingLabel) {
    const labelSpan = button.querySelector('.button-label');
    if (!labelSpan) return;
    if (isLoading) {
      button.dataset.loading = 'true';
      if (loadingLabel) {
        labelSpan.textContent = loadingLabel;
      }
    } else {
      delete button.dataset.loading;
      applyResponsiveLabel(button);
    }
  }

  // --- 2. ESTADO DE LA APLICACIÓN ---
  let equiposCounter = 0;
  let toastTimeout;
  let equipoActualEditandoId = null;
  const SESSION_STORAGE_KEY = 'activeDescarteSessionId';

  function shouldRestoreActiveSession() {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    const navigationType = navigationEntry?.type || 'navigate';

    let referrerPathname = '';
    try {
      const referrerUrl = new URL(document.referrer, window.location.origin);
      referrerPathname = referrerUrl.pathname;
    } catch (error) {
      referrerPathname = '';
    }

    const samePageReferrer = referrerPathname === window.location.pathname;
    if (navigationType === 'reload') return true;
    if (navigationType === 'back_forward' && samePageReferrer) return true;
    return false;
  }
  let scanbotSDK;
  let activeBarcodeScanner;

  function recalcularNumeracionTabla() {
    const filas = Array.from(tablaEquiposBody.rows);
    filas.forEach((fila, index) => {
      if (fila.cells[0]) {
        fila.cells[0].textContent = index + 1;
      }
    });
    equiposCounter = filas.length;
    contadorEquiposSpan.textContent = equiposCounter;
  }

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
      btnAnadirEquipo.disabled = false;
      setButtonLoading(btnAnadirEquipo, false);
      btnFinalizar.disabled = false;
      setButtonLoading(btnFinalizar, false);
      inicioSection.style.display = 'flex';
      registroSection.style.display = 'none';
      if (pageDescription) {
        pageDescription.hidden = false;
      }
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
        <button class="btn-accion btn-editar button-with-icon" data-id="${equipo.id}" aria-label="Editar equipo">
          <span class="icon icon--sm icon-edit" aria-hidden="true"></span>
          <span class="button-label">Editar</span>
        </button>
        <button class="btn-accion btn-eliminar button-with-icon" data-id="${equipo.id}" aria-label="Eliminar equipo">
          <span class="icon icon--sm icon-trash" aria-hidden="true"></span>
          <span class="button-label">Eliminar</span>
        </button>
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
    if (pageDescription) {
      pageDescription.hidden = true;
    }
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

  // --- 5. MANEJADORES DE EVENTOS (CRUD Y SESIÓN) ---
  btnIniciar.addEventListener('click', () => modalSesion.classList.add('visible'));
  btnCerrarModalSesion.addEventListener('click', () => modalSesion.classList.remove('visible'));

  formNuevaSesion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unidadAdministrativa = document.getElementById('unidad_administrativa').value.trim();
    const codigoSiace = document.getElementById('siace_code').value.trim();
    if (!unidadAdministrativa || !codigoSiace) {
      return showToast('Completa la unidad y el código SIACE.', 'error');
    }

    const submitBtn = formNuevaSesion.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setButtonLoading(submitBtn, true, 'Creando...');

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error("Usuario no encontrado.");
      
      const userProfile = getUserProfile(user);

      const nuevaSesion = {
        unidad_administrativa: unidadAdministrativa,
        codigo_siace: codigoSiace,
        tecnico_encargado: userProfile.name,
        // ⬇️ FECHA corregida a zona de Panamá
        fecha: getLocalPaDateISO(),            // 'YYYY-MM-DD' local Panamá
        user_id: user.id
      };

      const { data, error } = await supabaseClient
        .from('descartes_sesiones')
        .insert(nuevaSesion)
        .select()
        .single();
      if (error) throw error;

      sessionStorage.setItem(SESSION_STORAGE_KEY, data.id);
      showRegistroUI(data.id);
      modalSesion.classList.remove('visible');
      formNuevaSesion.reset();
    } catch (error) {
      showToast('No se pudo crear la sesión.', 'error');
    } finally {
      submitBtn.disabled = false;
      setButtonLoading(submitBtn, false);
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
    setButtonLoading(btnAnadirEquipo, true, 'Añadiendo...');
    try {
      const { data, error } = await supabaseClient
        .from('equipos_descartados')
        .insert(nuevoEquipo)
        .select()
        .single();
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
      setButtonLoading(btnAnadirEquipo, false);
    }
  });

  tablaEquiposBody.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const equipoId = targetButton.dataset.id;
    if (!equipoId) return;

    if (targetButton.classList.contains('btn-eliminar')) {
      const confirmado = await window.showConfirmationModal('Eliminar Equipo', '¿Estás seguro?');
      if (confirmado) {
        try {
          await supabaseClient.from('equipos_descartados').delete().eq('id', equipoId);
          const fila = document.querySelector(`tr[data-id='${equipoId}']`);
          if (fila) {
            fila.remove();
            recalcularNumeracionTabla();
          }
        } catch (error) {
          showToast('No se pudo eliminar el equipo.', 'error');
        }
      }
    }

    if (targetButton.classList.contains('btn-editar')) {
      try {
        const { data, error } = await supabaseClient
          .from('equipos_descartados')
          .select('*')
          .eq('id', equipoId)
          .single();
        if (error) throw error;

        equipoActualEditandoId = data.id;
        document.getElementById('edit-descripcion').value = data.descripcion || '';
        document.getElementById('edit-marbete').value = data.marbete || '';
        document.getElementById('edit-serie').value = data.serie || '';
        document.getElementById('edit-marca').value = data.marca || '';
        document.getElementById('edit-modelo').value = data.modelo || '';
        document.getElementById('edit-estado_equipo').value = data.estado_equipo || '';
        document.getElementById('edit-motivo_descarte').value = data.motivo_descarte || '';
        
        modalEditar.classList.add('visible');
      } catch (error) {
        showToast('No se pudieron cargar los datos del equipo.', 'error');
      }
    }
  });
  
  btnCerrarModalEditar.addEventListener('click', () => modalEditar.classList.remove('visible'));
  btnCancelarEdicion.addEventListener('click', () => modalEditar.classList.remove('visible'));
  
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
    setButtonLoading(submitBtn, true, 'Aplicando...');
    
    try {
      const { data, error } = await supabaseClient
        .from('equipos_descartados')
        .update(datosActualizados)
        .eq('id', equipoActualEditandoId)
        .select()
        .single();
      if (error) throw error;
      
      updateFilaEnTabla(data);
      modalEditar.classList.remove('visible');
      showToast('Equipo actualizado con éxito.', 'success');
    } catch (error) {
      showToast('No se pudo actualizar el equipo.', 'error');
    } finally {
      submitBtn.disabled = false;
      setButtonLoading(submitBtn, false);
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
      setButtonLoading(btnFinalizar, true, 'Finalizando...');
      try {
        await supabaseClient
          .from('descartes_sesiones')
          .update({ observacion })
          .eq('id', currentSessionId);
        clearWorkInProgress();
        showToast('Descarte finalizado y guardado.', 'success');
        setTimeout(() => window.location.href = 'inicio.html', 1500);
      } catch (error) {
        showToast('No se pudo guardar la observación.', 'error');
        btnFinalizar.disabled = false;
        setButtonLoading(btnFinalizar, false);
      }
    }
  });

  // --- LÓGICA DEL ESCÁNER CON SCANBOT SDK ---
  document.querySelectorAll('.btn-scan').forEach(button => {
    button.addEventListener('click', async () => {
      if (activeBarcodeScanner) return;
      
      const inputId = button.dataset.targetInput;
      const targetInput = document.getElementById(inputId);
      
      showToast("Iniciando cámara...", "success");

      try {
        if (!scanbotSDK) {
          scanbotSDK = await ScanbotSDK.initialize({
            licenseKey: '', 
            enginePath: 'js/scanbot/'
          });
        }

        const barcodeScannerConfig = {
          containerId: 'scanner-container',
          onBarcodesDetected: (result) => {
            if (result.barcodes.length > 0) {
              const scannedValue = result.barcodes[0].text;
              targetInput.value = scannedValue;
              
              if (activeBarcodeScanner) {
                activeBarcodeScanner.dispose();
                activeBarcodeScanner = null;
              }
              const container = document.getElementById('scanner-container');
              if (container) container.remove();
              
              showToast('Código escaneado con éxito.', 'success');
            }
          },
          onError: (e) => {
            console.error('Error del escáner:', e);
            showToast('Error al escanear.', 'error');
            if (activeBarcodeScanner) {
              activeBarcodeScanner.dispose();
              activeBarcodeScanner = null;
            }
          },
          text: { scanningHint: "Apunte al código de barras del equipo" }
        };

        let scannerContainer = document.getElementById('scanner-container');
        if (!scannerContainer) {
          scannerContainer = document.createElement('div');
          scannerContainer.id = 'scanner-container';
          scannerContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1000;';
          document.body.appendChild(scannerContainer);
        }
        
        activeBarcodeScanner = await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

      } catch (e) {
        console.error('Error al inicializar Scanbot SDK:', e);
        showToast('No se pudo iniciar el escáner.', 'error');
      }
    });
  });

  // --- 6. GUARDIANES E INICIALIZACIÓN ---
  window.addEventListener('beforeunload', (event) => {
    if (window.isWorkInProgress) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  (async function initializePage() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) {
        console.error('Error al obtener la sesión:', error);
        window.location.href = 'login.html';
        return;
      }

      if (!session) {
        window.location.href = 'login.html';
        return;
      }

      const activeSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const canRestoreSession = shouldRestoreActiveSession();
      if (activeSessionId && canRestoreSession) {
        await restoreSession(activeSessionId);
      } else if (activeSessionId && !canRestoreSession) {
        window.clearWorkInProgress();
      }

      document.getElementById('main-content').style.display = 'flex';
    } finally {
      document.getElementById('loader').style.display = 'none';
    }
  })();
});