document.getElementById("registro-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const cedula = document.getElementById("cedula").value;
  const motivo = document.getElementById("motivo").value;

  fetch("https://script.google.com/macros/s/AKfycbzlooyMoHLkMYx0zdSSZ1LhEEF_2oAAa61774bbxYT_MGO1C2ggbVWlVwQsH7u24-jxag/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nombre,
      apellido,
      cedula,
      motivo
    })
  })
  .then(response => response.text())
  .then(data => {
    alert("Registro exitoso");
    document.getElementById("registro-form").reset();
  })
  .catch(error => {
    alert("Error al registrar: " + error);
  });
});