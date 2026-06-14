# IP Cam Controlador

Aplicación cross-platform para controlar y monitorear cámaras IP en tu red local.

## Características

- **Detección automática**: Escanea la red para encontrar cámaras IP automáticamente
- **Vista en grid**: Muestra todas las cámaras en una cuadrícula organizada
- **Vista individual**: Muestra una cámara específica en pantalla completa
- **Agregar manualmente**: Permite agregar cámaras por dirección IP
- **Estado en tiempo real**: Verifica si las cámaras están en línea u offline
- **Controles**: Botones para mover, zoom, foto y grabar (UI)
- **Cross-platform**: Funciona en Android, iOS y Web

## Estructura del Proyecto

```
ip-cam-controlador/
├── App.js                          # Entry point con navegación
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js           # Pantalla principal con stats
│   │   ├── CameraGridScreen.js     # Grid de todas las cámaras
│   │   ├── CameraSingleScreen.js   # Vista individual de cámara
│   │   └── AddCameraScreen.js      # Formulario para agregar cámara
│   ├── utils/
│   │   └── cameraStore.js          # Hook para manejo de cámaras
│   └── components/                 # Componentes reutilizables
├── assets/                         # Iconos e imágenes
└── package.json
```

## Instalación

```bash
cd ip-cam-controlador
npm install
```

## Ejecución

```bash
# Web
npx expo start --web

# Android
npx expo start --android

# iOS
npx expo start --ios
```

## Funcionalidades

### 1. Home Screen
- Estadísticas de cámaras (total, en línea)
- Botón rápido para ver grid
- Escanear red automáticamente
- Agregar cámara manualmente
- Lista rápida de cámaras

### 2. Camera Grid
- Grid de 2 columnas
- Preview de cámara con placeholder
- Indicador de estado (online/offline)
- Pull-to-refresh para actualizar
- Floating action button para agregar
- Long press para eliminar

### 3. Camera Single View
- Video en pantalla completa (16:9)
- Información de la cámara (IP, puerto, usuario)
- Indicador de estado
- Controles: Mover, Zoom, Foto, Grabar
- Modal para editar cámara
- Opción para eliminar

### 4. Add Camera
- Formulario con nombre, IP, puerto, credenciales
- Auto-detección de URL
- Escanear red para descubrir cámaras
- Seleccionar cámaras descubiertas
- Validación de campos requeridos

## Tecnologías

- React Native / Expo
- React Navigation
- AsyncStorage (persistencia local)
- NetInfo (información de red)
- FontAwesome5 (iconos)

## Notas

- Las cámaras demo son solo para pruebas (IPs ficticias)
- La detección de cámaras requiere permisos de red
- Las URLs de video deben ser accesibles desde la red
- Para cámaras reales, se necesita configurar correctamente las credenciales

## URLs de Prueba

- http://localhost:8082 (web local)
- http://192.168.1.153:8082 (red local)
