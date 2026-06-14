# Proxy Local para Mini Cámara X5 / A9 (iLnkP2P)

Este directorio contiene la configuración y scripts para levantar un proxy local en tu PC. Convierte el protocolo UDP propietario de tu cámara X5 (aplicación YsxLite) en un stream HTTP MJPEG estándar compatible con la aplicación **IP Cam Controlador** (u otros sistemas locales como Home Assistant).

## 🛠️ Requisitos
1. Tener instalado [Node.js](https://nodejs.org/) (versión 16 o superior).
2. Tener la cámara X5 encendida y configurada en tu red Wi-Fi (usando la app YsxLite).

---

## 🚀 Instrucciones de Inicio Rápido

1. **Configurar la IP de la Cámara**:
   Copia el archivo `config.example.yml` y renombralo a `config.yml` en este mismo directorio. Abre el archivo y edita el campo `ip` bajo `cameras` con la IP local de tu cámara (puedes ver la IP en el router o usando la pestaña de **Escaneo UDP (A9/V720)** de la app).

2. **Ejecutar el Lanzador Automatizado**:
   Ejecuta el siguiente comando en tu terminal desde esta carpeta:
   ```bash
   node start_proxy.js
   ```
   *Este script se encargará automáticamente de clonar el repositorio de la comunidad `cam-reverse` en GitHub, instalar sus dependencias, compilar el módulo y lanzar el servidor local.*

3. **Agregar la Cámara en IP Cam Controlador**:
   * Abre la aplicación en tu celular.
   * Ve a **Añadir Cámara** (de forma manual).
   * Introduce la dirección IP de tu PC y la ruta del stream: 
     `http://<IP_DE_TU_PC>:5000/stream?cam=x5` (la terminal te mostrará la URL exacta al iniciar).
   * Selecciona el perfil **MJPEG / Genérico**.
   * ¡Listo! Podrás ver la transmisión, grabar snapshots locales y recibir alertas.
