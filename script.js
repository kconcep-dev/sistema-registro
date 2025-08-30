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

// Iniciar escáner con la cámara seleccionada
function startScanner() {
  const cameraId = document.getElementById("camera-select").value;
  const qrReader = new Html5Qrcode("qr-reader");

  qrReader.start(
    cameraId,
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      procesarQR(decodedText);
      qrReader.stop();
      document.getElementById("qr-reader").innerHTML = "";
    },
    (errorMessage) => {
      console.warn("QR no detectado:", errorMessage);
    }
  ).catch(err => {
    console.error("Error al iniciar el escáner:", err);
    alert("No se pudo iniciar la cámara.");
  });
}

// Procesar el texto escaneado del QR
function procesarQR(textoQR) {
  const partes = textoQR.split("|");

  const cedula = partes[0]?.trim();
  const nombre = partes[1]?.trim();
  const apellido = partes[2]?.trim();

  document.getElementById("cedula").value = cedula;
  document.getElementById("nombre").value = nombre;
  document.getElementById("apellido").value = apellido;

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