import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4006;
export const CONNECTION_STRING  = process.env.CONNECTION_STRING;

export const JWT_SECRET = process.env.JWT_SECRET;

// 1. Validación Crítica: Si no existe, APAGAMOS el servidor.
if (!JWT_SECRET) {
    console.error('\n🔴 ERROR FATAL DE SEGURIDAD:');
    console.error('   La variable JWT_SECRET no está definida en el archivo .env');
    console.error('   El servidor se detendrá para proteger el sistema.\n');
    process.exit(1); // Código 1 significa "error"
}

// 2. Advertencia de Fortaleza: Si es muy corta, avisamos.
if (JWT_SECRET.length < 32) {
    console.warn('\n⚠️  ADVERTENCIA DE SEGURIDAD:');
    console.warn(`   Tu JWT_SECRET tiene solo ${JWT_SECRET.length} caracteres.`);
    console.warn('   Se recomienda una clave de al menos 32 caracteres para producción.\n');
}