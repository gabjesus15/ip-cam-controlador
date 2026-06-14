const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROXY_DIR = __dirname;
const CAM_REVERSE_DIR = path.join(PROXY_DIR, 'cam-reverse');
const CONFIG_FILE = path.join(PROXY_DIR, 'config.yml');

console.log('======================================================');
console.log('=== Lanzador de Proxy local iLnkP2P (cámara X5/A9) ===');
console.log('======================================================\n');

// 1. Check if config.yml exists
if (!fs.existsSync(CONFIG_FILE)) {
  console.log('Creando archivo de configuración inicial...');
  const exampleConfig = path.join(PROXY_DIR, 'config.example.yml');
  if (fs.existsSync(exampleConfig)) {
    fs.copyFileSync(exampleConfig, CONFIG_FILE);
    console.log('Se creó config.yml a partir del archivo de ejemplo.');
    console.log('Por favor, edita config.yml con la IP correcta de tu cámara.\n');
  } else {
    console.error('ERROR: No se encuentra config.example.yml.');
    process.exit(1);
  }
}

// 2. Clone cam-reverse if it doesn't exist
if (!fs.existsSync(CAM_REVERSE_DIR)) {
  console.log('Clonando el repositorio cam-reverse de GitHub...');
  try {
    execSync('git clone https://github.com/DavidVentura/cam-reverse.git', {
      cwd: PROXY_DIR,
      stdio: 'inherit'
    });
    console.log('Repositorio clonado con éxito.\n');
  } catch (err) {
    console.error('Error al clonar el repositorio. Asegúrate de tener Git instalado y conexión a internet.');
    process.exit(1);
  }
}

// 3. Install dependencies inside cam-reverse
const nodeModulesPath = path.join(CAM_REVERSE_DIR, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('Instalando dependencias de cam-reverse...');
  try {
    execSync('npm install', {
      cwd: CAM_REVERSE_DIR,
      stdio: 'inherit'
    });
    console.log('Dependencias instaladas con éxito.\n');
  } catch (err) {
    console.error('Error al instalar dependencias via npm.');
    process.exit(1);
  }
}

// 4. Build if dist/bin.cjs doesn't exist
const binPath = path.join(CAM_REVERSE_DIR, 'dist', 'bin.cjs');
if (!fs.existsSync(binPath)) {
  console.log('Compilando el binario cam-reverse...');
  try {
    execSync('npm run build', {
      cwd: CAM_REVERSE_DIR,
      stdio: 'inherit'
    });
    console.log('Compilación completada.\n');
  } catch (err) {
    console.log('Intentando compilación alternativa...');
    try {
      execSync('npm run compile', {
        cwd: CAM_REVERSE_DIR,
        stdio: 'inherit'
      });
      console.log('Compilación completada.\n');
    } catch (e) {
      console.warn('Advertencia: No se pudo ejecutar el script de compilación. Intentando arrancar directamente...\n');
    }
  }
}

// 5. Copy config.yml into cam-reverse
console.log('Actualizando archivo de configuración en cam-reverse...');
try {
  fs.copyFileSync(CONFIG_FILE, path.join(CAM_REVERSE_DIR, 'config.yml'));
} catch (err) {
  console.error('Error al copiar el archivo de configuración:', err);
  process.exit(1);
}

// 6. Start the http_server proxy
console.log('\n------------------------------------------------------');
console.log('Iniciando el servidor proxy...');
console.log('El stream estará disponible en: http://localhost:5000/stream?cam=x5');
console.log('------------------------------------------------------\n');

const server = spawn('node', ['dist/bin.cjs', 'http_server'], {
  cwd: CAM_REVERSE_DIR,
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor proxy:', err);
});
