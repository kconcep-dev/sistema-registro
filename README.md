# Sistema de Registro - Soporte Técnico

<p align="center">
  <img src="https://kconcep-dev.github.io/sistema-registro/assets/icons/icon-192.png" alt="Logo del Sistema de Registro" width="128">
</p>

> **Nota:** Este es un proyecto beta desarrollado como propuesta final para la práctica profesional en la Universidad Tecnológica OTEIMA (Panamá).

Aplicación web integral diseñada para digitalizar y optimizar los procesos de registro en una oficina, reemplazando por completo los flujos de trabajo manuales en papel. El sistema permite guardar datos de visitantes y gestionar el descarte de equipos tecnológicos de forma segura y centralizada.

## 🚀 Ver Demo en Vivo

Puedes acceder a la aplicación desplegada en la siguiente URL:

**[https://kconcep-dev.github.io/sistema-registro/](https://kconcep-dev.github.io/sistema-registro/)**

*(Se requieren credenciales para acceder a las funcionalidades)*

---

## ✨ Características Principales

* **🔐 Autenticación Segura:** Sistema de inicio de sesión robusto con gestión de sesión por inactividad y cierre manual.
* **👤 Registro de Visitantes:** Formulario para registrar nuevos visitantes, optimizado con un lector de QR para autocompletar datos desde la cédula panameña.
* **🗑️ Gestión de Descartes de Equipo:**
    * Creación de "sesiones" de descarte por departamento o escuela.
    * Funcionalidad CRUD completa (Crear, Leer, Actualizar, Borrar) para los equipos registrados en una sesión.
    * Edición de registros en un modal para una experiencia de usuario fluida.
* **🛡️ Sistema "Guardián" Anti-Pérdida de Datos:** Advertencias personalizadas previenen que el usuario cierre o navegue fuera de la página con cambios sin guardar.
* **🔄 Persistencia de Sesión:** Si la página se recarga durante un descarte, la sesión activa se restaura automáticamente, recuperando la lista de equipos registrados.
* **🎨 Interfaz Moderna y Responsiva:**
    * Tema claro y oscuro persistente.
    * Notificaciones "toast" para feedback no intrusivo.
    * Diseño completamente adaptable a dispositivos de escritorio y móviles.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto fue construido utilizando las siguientes tecnologías:

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend y Base de Datos:** Supabase (Autenticación, Base de datos PostgreSQL con políticas RLS)
* **Hosting:** GitHub Pages

---

## ⚙️ Cómo Ejecutar el Proyecto Localmente

Si deseas ejecutar una copia de este proyecto, necesitarás tu propia instancia de Supabase.

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/kconcep-dev/sistema-registro.git](https://github.com/kconcep-dev/sistema-registro.git)
    ```
2.  **Navegar a la carpeta del proyecto:**
    ```bash
    cd sistema-registro
    ```
3.  **Configurar Supabase:**
    * Crea un proyecto en [Supabase](https://supabase.com/).
    * Define el esquema de tus tablas (`visitantes`, `descartes_sesiones`, `equipos_descartados`) según la lógica de la aplicación.
    * Obtén tu **URL del Proyecto** y tu **Clave Pública (anon key)**.
    * En el archivo `js/common.js`, reemplaza las variables `supabaseUrl` y `supabaseKey` con tus credenciales.

4.  **Abrir en el navegador:**
    * Abre el archivo `login.html` directamente en tu navegador.

---

## ✍️ Autor

**Kevin Concepción**

* GitHub: [@kconcep-dev](https://github.com/kconcep-dev)