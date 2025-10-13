/**
 * Gestiona el flujo completo del módulo de registro: autenticación de sesión,
 * captura de datos manuales, lectura de códigos QR por archivo o cámara y
 * sincronización con la base de datos de Supabase.
 */
function getLocalPaDateISO() {
  /**
   * Devuelve la fecha actual en formato ISO corto (YYYY-MM-DD) ajustada a la
   * zona horaria de Panamá, garantizando coherencia con la base de datos.
   */
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date());
}

function getLocalPaTime24h() {
  /**
   * Obtiene la hora local panameña en formato de 24 horas y normaliza la salida
   * para evitar separadores específicos de cada navegador.
   */
  const formatted = new Intl.DateTimeFormat('es-PA', {
    timeZone: 'America/Panama',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
  return formatted.replace(/\./g, ':').replace(/\s/g, '');
}

/**
 * Bloque inicial: impide el acceso a la aplicación si la sesión de Supabase
 * no está activa y muestra el contenido solo cuando se confirma la autenticación.
 */
(async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  } else {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('main-content').style.display = 'flex';
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  /*
   * Elementos del DOM utilizados en la pantalla principal. Agruparlos evita
   * múltiples búsquedas y ofrece una visión clara de la estructura requerida.
   */
  const mainForm = document.getElementById('registro-form');
  const mainFormInputs = mainForm.querySelectorAll('input[type="text"], select');
  const qrCaptureInput = document.getElementById('qr-captura');
  const qrChooseInput = document.getElementById('qr-elegir');
  const qrFileNameDisplay = document.getElementById('qr-file-name');
  const imageResultBox = document.getElementById('image-result-box');
  const qrCanvasElement = document.getElementById('qr-canvas');
  const qrCanvas = qrCanvasElement.getContext('2d');
  const btnScanLive = document.getElementById('btn-scan-live');
  const scanbotResultBox = document.getElementById('scanbot-result-box');
  const modalRegistro = document.getElementById('modal-registro-qr');
  const modalForm = document.getElementById('modal-form-registro');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal-registro');
  const btnCancelarModal = document.getElementById('btn-cancelar-modal-registro');
  const btnSubmitModal = document.getElementById('btn-submit-modal-registro');
  const toastEl = document.getElementById('toast-notification');
  const toastMessageEl = document.getElementById('toast-message');
  const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');

  /*
   * Variables de estado utilizadas por distintos módulos: control del escáner,
   * temporizadores de notificaciones y banderas de navegación.
   */
  let toastTimeout;
  let scanbotSDK;
  let activeBarcodeScanner;
  let scannerOverlayEl;
  let scannerViewEl;
  let scannerCloseButton;
  let scannerControlsEl;
  let scannerCountdownEl;
  let scannerPopStateHandler = null;
  let ignoreNextPopState = false;
  let hasScannerHistoryEntry = false;
  let scannerOpeningContext = null;
  let scannerGuard = null;

  /**
   * Elimina la entrada de historial asociada al escáner y, si es necesario,
   * navega hacia atrás para restaurar la URL original sin reabrir el escáner.
   */
  function detachScannerHistory({ triggeredByPopState } = {}) {
    if (scannerPopStateHandler) {
      window.removeEventListener('popstate', scannerPopStateHandler);
      scannerPopStateHandler = null;
    }

    if (hasScannerHistoryEntry) {
      if (!triggeredByPopState) {
        ignoreNextPopState = true;
        history.back();
      }
      hasScannerHistoryEntry = false;
    }
  }

  /**
   * Cierra cualquier instancia activa del escáner, limpia la interfaz
   * superpuesta y actualiza las protecciones de sesión relacionadas.
   */
  function closeActiveScanner({ triggeredByPopState, reason } = {}) {
    if (scannerOpeningContext) {
      scannerOpeningContext.cancelled = true;
      scannerOpeningContext = null;
    }

    if (activeBarcodeScanner) {
      activeBarcodeScanner.dispose();
      activeBarcodeScanner = null;
    }

    if (scannerOverlayEl) {
      scannerOverlayEl.classList.remove('scanbot-overlay--visible');
      scannerOverlayEl.setAttribute('aria-hidden', 'true');
    }

    detachScannerHistory({ triggeredByPopState });

    if (scannerGuard) {
      scannerGuard.markClosed({ reason });
    }
  }

  /**
   * Construye la superposición reutilizable del escáner si aún no existe y
   * devuelve el contenedor donde se insertará la vista del SDK.
   */
  function ensureScannerOverlay() {
    if (!scannerOverlayEl) {
      scannerOverlayEl = document.createElement('div');
      scannerOverlayEl.id = 'scanbot-scanner-overlay';
      scannerOverlayEl.className = 'scanbot-overlay';
      scannerOverlayEl.setAttribute('aria-hidden', 'true');

      scannerControlsEl = document.createElement('div');
      scannerControlsEl.className = 'scanbot-overlay__controls';

      scannerCloseButton = document.createElement('button');
      scannerCloseButton.type = 'button';
      scannerCloseButton.className = 'scanbot-overlay__close button-with-icon';
      scannerCloseButton.innerHTML = '<span class="icon icon--sm icon-close-cancel" aria-hidden="true"></span><span class="button-label">Cancelar escaneo</span>';
      scannerCloseButton.setAttribute('aria-label', 'Cancelar escaneo');
      scannerCloseButton.addEventListener('click', () => closeActiveScanner());

      scannerCountdownEl = document.createElement('div');
      scannerCountdownEl.className = 'scanbot-overlay__timer button-with-icon';
      scannerCountdownEl.setAttribute('role', 'timer');
      scannerCountdownEl.setAttribute('aria-live', 'polite');
      scannerCountdownEl.textContent = 'Tiempo restante: 01:00';
      scannerCountdownEl.hidden = true;

      scannerControlsEl.appendChild(scannerCloseButton);
      scannerControlsEl.appendChild(scannerCountdownEl);

      scannerViewEl = document.createElement('div');
      scannerViewEl.id = 'scanbot-scanner-view';
      scannerViewEl.className = 'scanbot-overlay__view';

      scannerOverlayEl.appendChild(scannerControlsEl);
      scannerOverlayEl.appendChild(scannerViewEl);
      document.body.appendChild(scannerOverlayEl);
    }

    return scannerViewEl;
  }

  /**
   * Inserta una entrada en el historial del navegador que permite cerrar el
   * escáner con el botón "atrás" y registra un manejador para revertir cambios.
   */
  function attachScannerHistory() {
    if (hasScannerHistoryEntry) return;

    history.pushState({ scanbotOverlay: true }, '', window.location.href);
    hasScannerHistoryEntry = true;

    scannerPopStateHandler = (event) => {
      if (ignoreNextPopState) {
        ignoreNextPopState = false;
        return;
      }

      if (activeBarcodeScanner || scannerOpeningContext) {
        closeActiveScanner({ triggeredByPopState: true });
      }
    };

    window.addEventListener('popstate', scannerPopStateHandler);
  }

  /**
   * Muestra un mensaje emergente en pantalla y programa su desaparición
   * automática para mantener la interfaz limpia.
   */
  function showToast(message, type = 'success', duration = 5000) {
    clearTimeout(toastTimeout);
    toastMessageEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    toastTimeout = setTimeout(() => {
      toastEl.className = toastEl.className.replace('show', '');
    }, duration);
  }

  /*
   * Persistencia opcional de recargas: guarda el estado del formulario cuando
   * se solicita recargar la página tras usar el escáner.
   */
  const reloadButtons = Array.from(document.querySelectorAll('.btn-reload-scan'));
  const reloadPersistence = window.createScannerReloadPersistence('scannerReloadRegistro', ['registro-form', 'modal-form-registro']);
  reloadPersistence.restore();

  scannerGuard = window.createScannerSessionGuard({
    buttons: btnScanLive ? [btnScanLive] : [],
    reloadButtons,
    toast: showToast,
    onBeforeReload: () => reloadPersistence.store(),
    timeoutMessage: 'El escáner se desactivó tras permanecer abierto un minuto. Recarga la página para volver a usarlo.',
    countdownDisplay: () => scannerCountdownEl
  });

  /**
   * Restablece todos los campos y oculta resultados cuando se completa un flujo
   * de registro, evitando estados residuales en la interfaz.
   */
  window.clearWorkInProgress = () => {
    window.isWorkInProgress = false;
    console.log('Work in progress: DESACTIVADO');
    mainForm.reset();
    modalForm.reset();
    qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
    if (imageResultBox) imageResultBox.style.display = 'none';
    if (scanbotResultBox) scanbotResultBox.style.display = 'none';
  };

  /**
   * Presenta la información del último visitante registrado en la tarjeta
   * resumen o un mensaje alternativo cuando no hay datos disponibles.
   */
  function displayLastVisitor(visitor) {
    if (visitor) {
      document.getElementById('ultimo-nombre').textContent = visitor.nombre;
      document.getElementById('ultimo-apellido').textContent = visitor.apellido;
      document.getElementById('ultimo-cedula').textContent = visitor.cedula;
      document.getElementById('ultimo-sexo').textContent = visitor.sexo;
      document.getElementById('ultimo-motivo').textContent = visitor.motivo;
      document.getElementById('ultimo-fecha').textContent = visitor.fecha;
      document.getElementById('ultimo-hora').textContent = visitor.hora;
    } else {
      ultimoVisitanteCard.innerHTML = '<h4>Aún no hay visitantes registrados.</h4>';
    }
  }

  /**
   * Recupera el visitante más reciente desde Supabase para mantener la tarjeta
   * de resumen sincronizada con los datos almacenados.
   */
  async function fetchLastVisitor() {
    try {
      const { data, error } = await supabaseClient
        .from('visitantes')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);
      if (error) throw error;
      displayLastVisitor(data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error fetching last visitor:', error);
      ultimoVisitanteCard.innerHTML = '<h4>No se pudo cargar el último registro.</h4>';
    }
  }

  /*
   * Gestión del formulario principal: valida los campos requeridos, envía los
   * datos a Supabase y actualiza la interfaz según el resultado del proceso.
   */
  mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const cedula = document.getElementById('cedula').value.trim();
    const sexo = document.getElementById('sexo').value;
    const motivo = document.getElementById('motivo').value.trim();

    if (!nombre || !apellido || !cedula || !sexo || !motivo) {
      showToast('Por favor, completa todos los campos.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';
    try {
      const fechaActual = getLocalPaDateISO();
      const horaActual = getLocalPaTime24h();
      const { data: nuevoVisitante, error } = await supabaseClient
        .from('visitantes')
        .insert([{ nombre, apellido, cedula, sexo, motivo, fecha: fechaActual, hora: horaActual }])
        .select()
        .single();
      if (error) throw error;

      showToast('¡Registro exitoso!', 'success');
      displayLastVisitor(nuevoVisitante);
      clearWorkInProgress();
    } catch (err) {
      showToast('Error al registrar los datos.', 'error');
      console.error('Supabase insert error:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrar';
    }
  });

  /**
   * Abre y cierra el modal de registro cuando los datos provienen de un código
   * QR, precargando la información leída antes de solicitar el motivo de visita.
   */
  function abrirModalRegistro(datos) {
    document.getElementById('modal-nombre').value = datos.nombre || '';
    document.getElementById('modal-apellido').value = datos.apellido || '';
    document.getElementById('modal-cedula').value = datos.cedula || '';
    document.getElementById('modal-sexo').value = datos.sexo || '';
    document.getElementById('modal-motivo').value = '';
    document.getElementById('modal-motivo').focus();
    modalRegistro.classList.add('visible');
  }

  function cerrarModalRegistro() {
    modalRegistro.classList.remove('visible');
  }

  btnCerrarModal.addEventListener('click', cerrarModalRegistro);
  btnCancelarModal.addEventListener('click', cerrarModalRegistro);

  /*
   * El envío del formulario en el modal replica la lógica del formulario
   * principal, reutilizando las utilidades de fecha/hora y limpieza de estado.
   */
  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('modal-nombre').value.trim();
    const apellido = document.getElementById('modal-apellido').value.trim();
    const cedula = document.getElementById('modal-cedula').value.trim();
    const sexo = document.getElementById('modal-sexo').value;
    const motivo = document.getElementById('modal-motivo').value.trim();

    if (!nombre || !apellido || !cedula || !sexo || !motivo) {
      showToast('Por favor, completa el motivo de la visita.', 'error');
      return;
    }

    btnSubmitModal.disabled = true;
    btnSubmitModal.textContent = 'Registrando...';

    try {
      const fechaActual = getLocalPaDateISO();
      const horaActual = getLocalPaTime24h();
      const { data: nuevoVisitante, error } = await supabaseClient
        .from('visitantes')
        .insert([{ nombre, apellido, cedula, sexo, motivo, fecha: fechaActual, hora: horaActual }])
        .select()
        .single();
      if (error) throw error;

      showToast('¡Registro exitoso!', 'success');
      displayLastVisitor(nuevoVisitante);
      cerrarModalRegistro();
      clearWorkInProgress();
    } catch (err) {
      showToast('Error al registrar los datos.', 'error');
      console.error('Supabase insert error:', err);
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.textContent = 'Registrar';
    }
  });

  /**
   * Procesa archivos de imagen seleccionados o capturados, decodifica el código
   * QR y abre el modal con la información obtenida.
   */
  const handleImageFile = (file) => {
    if (!file) {
      qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
      imageResultBox.style.display = 'none';
      return;
    }

    qrFileNameDisplay.textContent = file.name;
    imageResultBox.textContent = 'Procesando...';
    imageResultBox.style.display = 'block';
    showToast('Procesando imagen...', 'success');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        qrCanvasElement.width = img.width;
        qrCanvasElement.height = img.height;
        qrCanvas.drawImage(img, 0, 0, img.width, img.height);

        const imageData = qrCanvas.getImageData(0, 0, qrCanvasElement.width, qrCanvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          const decodedData = new TextDecoder('utf-8').decode(new Uint8Array(code.binaryData));
          imageResultBox.textContent = decodedData;
          const parts = decodedData.split('|');
          if (parts.length >= 5) {
            const sexoChar = parts[4].trim().toUpperCase();
            const sexo = sexoChar === 'M' ? 'Masculino' : (sexoChar === 'F' ? 'Femenino' : '');
            const datos = {
              cedula: parts[0].trim(),
              nombre: parts[1].trim(),
              apellido: parts[2].trim(),
              sexo: sexo
            };
            abrirModalRegistro(datos);
          } else {
            showToast('Formato del QR no esperado.', 'error');
          }
        } else {
          imageResultBox.textContent = 'No se detectó ningún código QR en la imagen.';
          showToast('No se encontró un QR en la imagen.', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  qrCaptureInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) handleImageFile(event.target.files[0]);
    event.target.value = '';
  });

  qrChooseInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) handleImageFile(event.target.files[0]);
    event.target.value = '';
  });

  /**
   * Inicializa el escáner en vivo con Scanbot SDK cuando está disponible,
   * gestiona el ciclo de vida del componente y procesa los códigos detectados.
   */
  if (btnScanLive) {
    btnScanLive.addEventListener('click', async () => {
      if (activeBarcodeScanner || scannerOpeningContext) return;
      if (scannerGuard && scannerGuard.hasExpired()) return;
      try {
        if (!scanbotSDK) {
          scanbotSDK = await ScanbotSDK.initialize({
            licenseKey: '',
            enginePath: 'js/scanbot/'
          });
        }

        const scannerView = ensureScannerOverlay();
        scannerView.innerHTML = '';
        scannerOverlayEl.classList.add('scanbot-overlay--visible');
        scannerOverlayEl.setAttribute('aria-hidden', 'false');
        attachScannerHistory();

        const openingContext = { cancelled: false };
        scannerOpeningContext = openingContext;

        const barcodeScannerConfig = {
          containerId: 'scanbot-scanner-view',
          onBarcodesDetected: (result) => {
            if (result.barcodes.length > 0) {
              const textoQR = result.barcodes[0].text;
              scanbotResultBox.textContent = textoQR;
              scanbotResultBox.style.display = 'block';

              const parts = textoQR.split('|');
              if (parts.length >= 5) {
                const sexoChar = parts[4].trim().toUpperCase();
                const sexo = sexoChar === 'M' ? 'Masculino' : (sexoChar === 'F' ? 'Femenino' : '');
                const datos = {
                  cedula: parts[0].trim(),
                  nombre: parts[1].trim(),
                  apellido: parts[2].trim(),
                  sexo: sexo
                };
                abrirModalRegistro(datos);
              } else {
                showToast('Formato del QR no esperado.', 'error');
              }

              closeActiveScanner();
            }
          },
          onError: (e) => {
            console.error('Error del escáner:', e);
            showToast('Error al escanear.', 'error');
            closeActiveScanner();
          },
          style: {
            window: { backgroundColor: 'rgba(0,0,0,0.7)' },
            viewfinder: { borderColor: 'white', borderWidth: 2, cornerRadius: 4 }
          },
          text: {
            scanningHint: 'Apunte al código QR de la cédula'
          }
        };

        const scannerInstance = await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

        if (openingContext.cancelled) {
          scannerInstance.dispose();
        } else {
          activeBarcodeScanner = scannerInstance;
          scannerOpeningContext = null;
          if (scannerGuard) {
            scannerGuard.startTimer(() => closeActiveScanner({ reason: 'timeout' }));
          }
        }

      } catch (e) {
        console.error('Error al inicializar Scanbot SDK:', e);
        closeActiveScanner();
      } finally {
        if (scannerOpeningContext && scannerOpeningContext.cancelled) {
          scannerOpeningContext = null;
        }
      }
    });
  }

  /*
   * Inicialización final: carga el último visitante, marca cambios en los
   * formularios y advierte antes de abandonar la página si hay trabajo pendiente.
   */
  fetchLastVisitor();

  const setWorkInProgress = () => {
    if (!window.isWorkInProgress) {
      window.isWorkInProgress = true;
      console.log('Work in progress: ACTIVADO');
    }
  };

  mainFormInputs.forEach(input => {
    input.addEventListener('input', setWorkInProgress);
  });

  window.addEventListener('beforeunload', (event) => {
    if (window.isWorkInProgress) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
});
