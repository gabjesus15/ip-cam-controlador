# IP Cam Controlador 📹✨

Aplicación móvil y web multiplataforma diseñada para el monitoreo, control de movimiento (PTZ), grabación local y alertas en tiempo real de cámaras de seguridad IP.

El diseño de la interfaz ha sido completamente modernizado bajo el lenguaje visual de **Samsung One UI**, caracterizado por amplios espacios de cabecera que facilitan el uso a una mano, tarjetas con bordes muy redondeados, widgets integrados y un pad circular de control remoto unificado tipo SmartThings.

---

## ✨ Características

- 🎨 **Diseño Estilo Samsung One UI:** Estética minimalista y premium con esquinas redondeadas suaves (`radiusMd: 16px`), amplias cabeceras descriptivas y acentos en Azul Samsung.
- 🎮 **Pad PTZ Circular Unificado:** Control remoto analógico interactivo para movimientos de cámara (arriba, abajo, izquierda, derecha, zoom) inspirado en el control de dispositivos SmartThings.
- 🔍 **Escaneo y Descubrimiento Local:**
  - **Escaneo TCP:** Barrido ultra veloz de subredes buscando puertos HTTP, RTSP u ONVIF comunes.
  - **Escaneo UDP:** Detección de dispositivos nativos a través de mensajes de broadcast local.
- 🎥 **Visualización y Grabación en Tiempo Real:** Reproducción nativa en móviles con `expo-video` y visualizador MJPEG de alto rendimiento. Soporte para grabación local de fragmentos de video directo a la galería del dispositivo.
- 🏃 **Detección de Movimiento por Imagen:** Algoritmo dinámico que compara fotogramas consecutivos para detectar movimiento local, registrar el historial de eventos e intensidades y disparar alarmas.
- 🔔 **Alertas en Pantalla e Integración Nube:** Alertas visuales flotantes y soporte para respaldar eventos en la nube mediante webhooks externos (Zapier, Make, IFTTT).

---

## ⚠️ ¿En qué casos NO funciona este proyecto? (Limitaciones Técnicas)

Para evitar malentendidos durante el despliegue o pruebas, ten en cuenta las siguientes restricciones impuestas por los navegadores web, sistemas operativos y firmwares de los fabricantes de hardware:

### 1. Escaneo UDP de cámaras en versión Web o Expo Go básico
- **Por qué falla:** Los navegadores web no tienen acceso a sockets UDP de bajo nivel debido al sandbox de seguridad HTML5. En entornos móviles simulados con la app cliente estándar de Expo Go, las librerías nativas de sockets (como `react-native-udp`) no están enlazadas dinámicamente.
- **Caso de uso afectado:** El botón de escaneo "UDP (A9/V720)" no funcionará en navegadores ni en Expo Go estándar.
- **Solución:** Requiere compilar la aplicación utilizando un Development Client (`npx expo prebuild`) para empaquetar el código nativo compilado, o utilizar únicamente el escaneo TCP.

### 2. Conexión directa a Mini Cámaras A9 / X5 / V720 (Beken Chip)
- **Por qué falla:** Las cámaras ultra económicas basadas en microcontroladores Beken (aplicación oficial YsxLite o iLnkP2P) **no exponen un servidor web HTTP, RTSP u ONVIF** estándar en la red local. El firmware del fabricante bloquea los puertos locales y transmite video codificado utilizando un protocolo propietario UDP P2P de puerto aleatorio.
- **Caso de uso afectado:** Si intentas apuntar la URL HTTP/RTSP de la app a la dirección IP de tu cámara X5/A9 directamente, no conectará.
- **Solución:** Debes utilizar un túnel intermedio en tu red local. El repositorio incluye un script proxy en la carpeta `proxy/` (`proxy/start_proxy.js` basado en la ingeniería inversa `cam-reverse` de la comunidad) que se conecta a la cámara por P2P UDP, desencripta el stream de video y lo retransmite como un servidor local HTTP MJPEG (`http://IP_DE_TU_PC:8081`). Debes agregar la IP y puerto de la PC que ejecuta el proxy en la app.

### 3. Falsos Positivos de puertos en la versión Web (CORS)
- **Por qué falla:** Los navegadores imponen la política **CORS** (Cross-Origin Resource Sharing). Al realizar pings rápidos de sockets TCP desde JS web mediante `fetch()`, el navegador bloquea la lectura de la respuesta a menos que la cámara web devuelva cabeceras CORS explícitas (lo cual casi ninguna hace).
- **Caso de uso afectado:** El escáner TCP en navegadores web no puede distinguir con precisión si un puerto está abierto o si fue rechazado por CORS. La app implementa un workaround (asume que los errores que no son "Abort" pueden ser puertos abiertos bloqueados), lo cual puede causar falsos positivos en Chrome/Firefox.
- **Solución:** Ejecutar el escáner desde la aplicación compilada en Android o iOS, donde el código nativo de red no está sujeto a políticas CORS de navegador.

### 4. Permisos de Red Local en iOS 14+ y Android 10+
- **Por qué falla:** Apple y Google restringen la búsqueda de IPs en la red de área local (LAN) por motivos de privacidad del usuario.
- **Caso de uso afectado:** El escáner de red no encontrará ningún dispositivo si el usuario no otorga el permiso de "Red Local" (en iOS) o de "Ubicación precisa" / "Dispositivos cercanos" (en Android).
- **Solución:** Aceptar explícitamente el prompt de permisos de red local al iniciar la app por primera vez.

### 5. Bloqueo de Contenido Mixto (HTTPS vs HTTP)
- **Por qué falla:** Si el cliente web de IP Cam Controlador está alojado en un dominio seguro (`https://miservidor.com`), los navegadores modernos bloquearán activamente cualquier petición a direcciones IP locales insecure (`http://192.168.1.100:8080/video`) debido a políticas de Mixed Content.
- **Caso de uso afectado:** Los reproductores de video no cargarán streams locales de cámaras HTTP.
- **Solución:** Servir la interfaz web de la aplicación a través de HTTP sin SSL en tu servidor doméstico local (ej. `http://localhost:19006` o `http://192.168.1.X`), o utilizar la aplicación móvil nativa.

---

## 🛠️ Instalación y Configuración

### 1. Clonar e Instalar dependencias
```bash
# Clonar repositorio
git clone https://github.com/gabjesus15/ip-cam-controlador.git
cd ip-cam-controlador

# Instalar dependencias del proyecto React Native
npm install
```

### 2. Iniciar en Modo Desarrollo
```bash
# Lanzar servidor de desarrollo de Expo
npx expo start
```
*Presiona **`w`** para abrir en Web, **`a`** para Android, o **`i`** para iOS simulator.*

### 3. Configurar el Proxy local para Mini Cámaras A9 / X5
Si utilizas una cámara con chip Beken (A9/X5):
```bash
# Ir a la carpeta del proxy
cd proxy

# Instalar las dependencias de node
npm install

# Iniciar el script de ingeniería inversa local (debe correr en la misma red local)
node start_proxy.js
```
El script buscará la cámara por broadcast UDP, se enlazará a ella, y abrirá un stream en `http://localhost:8081`. En la aplicación móvil, agrega una nueva cámara ingresando la IP de tu computadora y el puerto `8081`.

---

## 📱 Estructura del Código

```
ip-cam-controlador/
├── App.js                   # Enrutador principal (Navigation Stack)
├── proxy/
│   └── start_proxy.js       # Proxy local UDP-a-MJPEG para cámaras Beken
├── src/
│   ├── theme/
│   │   ├── theme.js         # Tokens del diseño de Samsung One UI
│   │   └── index.js         # Exportador de temas
│   ├── components/
│   │   ├── CameraCard.js    # Tarjeta de cámara (Lista y Cuadrícula redondeadas)
│   │   ├── StatusBadge.js   # Píldora de estado (online/offline)
│   │   ├── EmptyState.js    # Pantallas de lista vacía minimalistas
│   │   └── ScanProgress.js  # Barra de progreso del escáner
│   ├── screens/
│   │   ├── HomeScreen.js    # Dashboard principal estilo One UI
│   │   ├── CameraGridScreen.js # Cuadrícula de previsualizaciones
│   │   ├── CameraSingleScreen.js # Vista detallada y pad PTZ circular
│   │   ├── AddCameraScreen.js # Formulario de nueva cámara
│   │   └── SettingsScreen.js # Preferencias y Webhooks agrupados
│   ├── services/
│   │   ├── discoveryService.js # Motores de escaneo TCP y UDP real
│   │   └── cameraProfiles.js # Path mappings por marca (Hikvision, Dahua, Tapo, etc.)
│   └── store/
│       ├── cameraStore.js   # Estado global persistente (Zustand)
│       └── settingsStore.js # Estado global de ajustes locales
```

---

## 📐 Especificaciones de Configuración de Cámaras

La aplicación puede conectarse a streams nativos de video de las marcas más populares mediante los siguientes formatos estándar de URL autocompletados:

| Perfil de Marca | Protocolo Stream Típico | Puerto Común | Ruta de Ejemplo |
| :--- | :--- | :--- | :--- |
| **Generic MJPEG** | HTTP | `80` / `8080` | `http://IP:PORT/video` |
| **Hikvision** | RTSP / HTTP | `554` / `8000` | `rtsp://user:pass@IP:554/Streaming/Channels/101` |
| **Dahua** | RTSP | `554` | `rtsp://user:pass@IP:554/cam/realmonitor?channel=1&subtype=0` |
| **TP-Link Tapo** | RTSP | `554` | `rtsp://user:pass@IP:554/stream1` |
| **Reolink** | RTSP / HTTP | `554` / `80` | `rtsp://user:pass@IP:554//h264Preview_01_main` |

---

## 🤝 Contribuir

Si encuentras algún detalle o deseas proponer mejoras visuales, eres libre de abrir un Pull Request en el repositorio. ¡Toda ayuda para mejorar el ecosistema local es bienvenida!

⭐ **¡Si te sirve el proyecto, apóyalo con una estrella en GitHub!**
