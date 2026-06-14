# IP Cam Controlador

Aplicación multiplataforma para control y monitoreo de cámaras IP. Construida con **React Native** y **Expo**, compatible con **iOS**, **Android** y **Web**.

## ✨ Características

- 📹 **Control de cámaras IP** - Agrega, edita y elimina cámaras de tu red
- 🔍 **Escaneo automático** - Detecta cámaras automáticamente en tu red local
- 🌐 **Multiplataforma** - Funciona en iOS, Android y navegadores web
- 📱 **Diseño responsive** - Adaptable a móviles, tablets y escritorio
- 🎨 **Tema oscuro** - Interfaz moderna y minimalista
- 🔄 **Estado en tiempo real** - Indicadores de online/offline
- 📸 **Vista de grid** - Visualiza múltiples cámaras simultáneamente
- 🔒 **Seguridad** - Soporte para autenticación básica (usuario/contraseña)

## 🚀 Tecnologías

- **React Native** - Framework principal
- **Expo** - Plataforma de desarrollo
- **React Navigation** - Navegación entre pantallas
- **AsyncStorage** - Almacenamiento local persistente
- **FontAwesome5** - Iconografía profesional

## 📋 Requisitos

- Node.js >= 18
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- Dispositivo físico o emulador (iOS/Android)

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/gabjesus15/ip-cam-controlador.git

# Entrar al directorio
cd ip-cam-controlador

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npx expo start
```

## 🏃 Uso

### Desarrollo

```bash
# Iniciar en modo desarrollo
npx expo start

# Opciones:
# - i: Abrir en iOS simulator
# - a: Abrir en Android emulator
# - w: Abrir en navegador web
# - r: Recargar bundler
# - m: Mostrar menú
# - shift+m: Seleccionar dispositivo
```

### Producción Web

```bash
# Generar build estático
npx expo export --platform web

# Servir localmente
cd dist && npx serve
```

## 📱 Estructura del Proyecto

```
ip-cam-controlador/
├── App.js                 # Punto de entrada
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js        # Dashboard principal
│   │   ├── CameraGridScreen.js  # Vista de grid
│   │   ├── CameraSingleScreen.js # Vista individual
│   │   └── AddCameraScreen.js   # Agregar/Editar cámara
│   └── utils/
│       └── cameraStore.js       # Estado global (Zustand-like)
├── assets/                # Imágenes y recursos
└── package.json
```

## 🌐 Pantallas

### Dashboard (Home)
- Estadísticas de cámaras (total, online, offline)
- Acciones rápidas (ver grid, escanear, agregar)
- Lista de cámaras con indicadores de estado

### Grid de Cámaras
- Visualización 2-columnas
- Thumbnails de cámaras
- Estado online/offline
- Navegación a vista individual

### Vista Individual
- Visualización fullscreen
- Información detallada de la cámara
- Controles (PTZ, zoom, etc.)
- Edición de configuración

### Agregar Cámara
- Formulario de configuración
- Detección automática de URL
- Escaneo de red
- Soporte para autenticación

## 🔧 Configuración de Cámaras

La app soporta cámaras IP con los siguientes protocolos:

- **RTSP** - Real Time Streaming Protocol
- **MJPEG** - Motion JPEG
- **HTTP** - Streams HTTP estándar

### Formato de URL

```
http://IP:PUERTO/video
http://IP:PUERTO/stream
rtsp://IP:PUERTO/live
```

### Ejemplo de configuración

```javascript
{
  "name": "Cámara Principal",
  "ip": "192.168.1.100",
  "port": "8080",
  "username": "admin",
  "password": "12345",
  "url": "http://192.168.1.100:8080/video"
}
```

## 🚀 Deployment

### Web

La app se puede desplegar en cualquier servidor web estático:

```bash
# Generar build
npx expo export --platform web

# Copiar archivos a tu servidor
rsync -av dist/ usuario@servidor:/var/www/html/
```

### Móvil

Para publicar en stores:

```bash
# Construir para Android
npx expo prebuild
npx expo run:android --variant release

# Construir para iOS (requiere Mac)
npx expo prebuild
npx expo run:ios --configuration Release
```

## 📸 Compatibilidad de Cámaras

La app es compatible con la mayoría de cámaras IP que exponen streams:

- ✅ Hikvision
- ✅ Dahua
- ✅ TP-Link (Tapo)
- ✅ Reolink
- ✅ Foscam
- ✅ Cámaras genéricas (con URL configurable)

## 🔒 Seguridad

- **Autenticación básica** - Soporta usuario/contraseña
- **Almacenamiento local** - Las credenciales se guardan en el dispositivo
- **Validación de URLs** - Verifica URLs de cámaras antes de guardar

## 📝 Roadmap

- [ ] Soporte para RTSP con autenticación
- [ ] Grabación de video
- [ ] Detección de movimiento
- [ ] Notificaciones push
- [ ] Soporte para cámaras ONVIF
- [ ] Modo oscuro/claro
- [ ] Widgets para home screen
- [ ] Soporte para múltiples streams

## 🤝 Contribución

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto. Libre para uso personal y comercial.

## 📞 Contacto

- **GitHub:** [gabjesus15](https://github.com/gabjesus15)
- **Proyecto:** [ip-cam-controlador](https://github.com/gabjesus15/ip-cam-controlador)

---

⭐ **Si te gusta este proyecto, dale una estrella en GitHub!**
