// Función principal para enviar los datos a Supabase
async function sendToBackend(nombre, apellido, cedula, motivo) {
  const fecha = new Date().toISOString().split("T")[0];
  const hora = new Date().toLocaleTimeString("es-PA", { hour12: false });

  const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/visitantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify([{
        nombre,
        apellido,
        cedula,
        motivo,
        fecha,
        hora
      }])
    });

    if (response.ok) {
      console.log("Registro exitoso");
      alert("Registro exitoso");
      document.getElementById("registro-form").reset();
    } else {
      const error = await response.text();
      console.error("Error al registrar:", error);
      alert("Error al registrar: " + error);
    }
  } catch (err) {
    console.error("Error de conexión:", err);
    alert("No se pudo conectar con el servidor.");
  }
}

// Conectar el formulario con la función
document.getElementById("registro-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const cedula = document.getElementById("cedula").value.trim();
  const motivo = document.getElementById("motivo").value.trim();

  if (nombre && apellido && cedula && motivo) {
    sendToBackend(nombre, apellido, cedula, motivo);
  } else {
    alert("Por favor, completa todos los campos.");
  }
});

// Cargar lista de cámaras disponibles
Html5Qrcode.getCameras().then(devices => {
  const select = document.getElementById("camera-select");
  devices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.id;
    option.text = device.label || `Cámara ${index + 1}`;
    select.appendChild(option);
  });
}).catch(err => {
  console.error("No se pudieron obtener las cámaras:", err);
  alert("Error al acceder a la cámara.");
});

// Leer QR desde imagen capturada
function leerQRDesdeCaptura() {
  const archivo = document.getElementById("cedula-captura").files[0];
  if (!archivo) return alert("Toma una foto de la cédula primero.");

  procesarImagenQR(archivo);
}

// Leer QR desde imagen subida
function leerQRDesdeArchivo() {
  const archivo = document.getElementById("cedula-img").files[0];
  if (!archivo) return alert("Selecciona una imagen desde tu galería.");

  procesarImagenQR(archivo);
}

// Procesar imagen y extraer QR con jsQR
function procesarImagenQR(archivo) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      const canvas = document.getElementById("qr-canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        document.getElementById("resultado").innerText = code.data;
        document.getElementById("scan-sound").play();
        procesarQR(code.data);
      } else {
        alert("No se detectó ningún código QR en la imagen.");
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(archivo);
}

// Procesar texto extraído del QR
function procesarQR(textoQR) {
  const partes = textoQR.split("|");

  const cedula = partes[0]?.trim();
  const nombre = partes[1]?.trim();
  const apellido = partes[2]?.trim();

  document.getElementById("cedula").value = cedula || "";
  document.getElementById("nombre").value = nombre || "";
  document.getElementById("apellido").value = apellido || "";

  alert("Datos cargados desde el QR. Completa el motivo y registra.");
}

// Registrar el Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(reg => console.log("Service Worker registrado"))
      .catch(err => console.error("Error al registrar Service Worker:", err));
  });
}