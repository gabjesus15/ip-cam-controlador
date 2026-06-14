# IP Cam Controlador - Especificación y Guía Técnica 📹

Aplicación multiplataforma (iOS, Android, Web) construida con **React Native** y **Expo** para la administración, descubrimiento local, procesamiento de video y monitoreo de cámaras IP.

---

## 🛠️ Arquitectura Técnica y Dependencias

El núcleo del proyecto utiliza una arquitectura desacoplada basada en hooks para el procesamiento en segundo plano y stores ligeros para la persistencia de datos:

- **Runtime/Framework:** Expo SDK (React Native)
- **Gestión de Estado:** Zustand con persistencia local mediante `AsyncStorage` (`src/store/cameraStore.js` y `src/store/settingsStore.js`).
- **Reproducción de Video:** `expo-video` para flujos nativos (MP4, HLS/M3U8). Para flujos HTTP MJPEG u ONVIF snapshots, se implementa un bucle de refresco de imágenes a 2 FPS (`CameraSingleScreen.js`).
- **Detección de Movimiento:** Algoritmo en JavaScript (`src/hooks/useMotionDetection.js`) que analiza fotogramas secuenciales mediante comparación matricial elemental para calcular diferencias de píxeles y evaluar umbrales de sensibilidad.
- **Grabación Local:** `src/hooks/useRecording.js` captura secuencias de fotogramas (snapshots) en un búfer local, los consolida como un flipbook y permite su exportación a través del sistema de compartición nativo del sistema operativo (`expo-sharing`).

---

## 🔍 Motor de Descubrimiento de Red

El servicio de descubrimiento local (`src/services/discoveryService.js`) opera en dos capas de red diferentes:

### 1. Escaneo Subnet TCP (Barrido de Puertos)
- Realiza peticiones asíncronas concurrentes (concurrencia configurable entre 1 y 50 hilos en paralelo) a un segmento `/24` (ej. `192.168.1.1` al `192.168.1.254`).
- Puertos analizados: `80` (HTTP), `8080`/`8081` (Web Alt), `88` (Foscam), `554` (RTSP), `8000` (ONVIF/Hikvision), `37777` (Dahua).
- **Control de Aborto:** Utiliza `AbortController` para cancelar peticiones pendientes si el usuario detiene el escaneo o se alcanza el timeout de conexión (200ms - 5000ms).

### 2. Escaneo UDP Broadcast
- Envía un paquete broadcast (IP `255.255.255.255`) a través del puerto de descubrimiento `32108` para solicitar identificación a dispositivos locales compatibles con Beken/A9.
- El listener del puerto responde al protocolo P2P propietario de enlace local.

---

## ⚠️ Limitaciones y Casos de Falla Técnica (¿Dónde NO funciona?)

El proyecto presenta limitaciones inherentes impuestas por la seguridad del navegador, restricciones del sistema operativo y firmwares cerrados de cámaras económicas:

### 1. Incompatibilidad de Sockets UDP en Web y Expo Go
- **Causa:** Las APIs de navegador web no exponen soporte para sockets UDP crudos (`dgram`). En Expo Go, el bundle de la aplicación no incluye los enlaces nativos compilados de `react-native-udp`.
- **Falla:** El escaneo UDP ("UDP A9/V720") fallará silenciosamente o disparará un error controlado en navegadores y en Expo Go estándar.
- **Solución:** Requiere compilar la app nativamente con un Development Client (`npx expo prebuild` y `run:android` / `run:ios`).

### 2. Bloqueo de Conexión en Cámaras Beken (A9 / X5 / V720)
- **Causa:** Las mini cámaras genéricas con chip Beken (que usan apps como YsxLite) no implementan protocolos estándar como HTTP o RTSP en su interfaz de red local. Emplean un protocolo cerrado P2P UDP con cifrado propietario.
- **Falla:** La app no podrá conectar de forma directa con la IP de la cámara.
- **Solución:** Correr el script proxy intermedio de Node.js en la red local (`proxy/start_proxy.js`). Este script actúa como cliente UDP P2P de la cámara, desencripta el flujo de video y expone un servidor HTTP MJPEG local que la app sí puede reproducir.

### 3. Restricciones de CORS en Escaneo TCP (Navegadores)
- **Causa:** Los navegadores web aplican estrictamente las políticas Same-Origin (CORS). Una petición `fetch()` HTTP desde un navegador a una cámara local sin cabeceras `Access-Control-Allow-Origin: *` será bloqueada por el motor JS del navegador.
- **Falla:** El escáner TCP en la web no puede leer las respuestas HTTP de los dispositivos. La app asume cualquier error diferente de `AbortError` como puerto potencialmente abierto, resultando en falsos positivos.
- **Solución:** Utilizar el escaneo local desde clientes nativos compilados (Android/iOS), donde las peticiones HTTP no están sujetas a restricciones CORS del navegador.

### 4. Directiva de Contenido Mixto (Mixed Content Block)
- **Causa:** Los navegadores bloquean la carga de recursos HTTP insecure desde contextos HTTPS seguros.
- **Falla:** Si la aplicación web se aloja bajo HTTPS (`https://controlador.midominio.com`), cualquier llamada de video o snapshot local `http://192.168.1.50:8080/video` será rechazada por el navegador.
- **Solución:** Alojar el servidor web cliente en un entorno HTTP sin SSL en la red local o usar las apps móviles nativas.

### 5. Entitlements de Red Local en iOS 14+
- **Causa:** Apple restringe el escaneo LAN y la búsqueda de dispositivos en la subred local.
- **Falla:** El descubrimiento no devolverá ningún resultado en iOS si no se han declarado las llaves de permiso y los identificadores de servicio en el `Info.plist`.
- **Solución:** Declarar `NSLocalNetworkUsageDescription` y los esquemas de Bonjour utilizados en la configuración del prebuild del archivo `app.json`.

---

## 💻 Configuración del Proxy Local (Cámaras Beken/A9/X5)

El script proxy traduce la comunicación cifrada P2P UDP a una corriente HTTP MJPEG estándar compatible con la aplicación:

### Configuración e Inicio
```bash
# Navegar al directorio del proxy
cd proxy

# Instalar dependencias requeridas (dgram, http, etc.)
npm install

# Iniciar el transcodificador local
node start_proxy.js
```

### Flujo de Datos
```
[Cámara A9/X5] <--- (P2P UDP / puerto 32108) ---> [PC local: start_proxy.js] <--- (HTTP MJPEG / puerto 8081) ---> [App IP Cam]
```

Una vez que el script se en enlace con la dirección MAC de la cámara en la red, expone la ruta local. En la aplicación, ingresa la IP de la computadora que ejecuta el proxy y el puerto `8081` con formato genérico.

---

## 🛠️ Instalación y Compilación

### Instalación de dependencias
```bash
npm install
```

### Ejecutar Servidor de Desarrollo (Metro)
```bash
npx expo start
```

### Compilar Paquete Estático para Web
```bash
npx expo export --platform web
```
*Genera los bundles optimizados en el directorio `/dist`.*
