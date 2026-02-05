import {cloudinaryInstance} from '../files/cloudinary.js';
import logger from '../src/utils/pino/logger.js';

export const deleteFileFromCloudinary = async (url) => {
    if (!url) return;

    try {
        // 1. Detectar tipo de recurso mirando la URL
        // Las URLs de PDF tienen "/raw/upload/", las de imágenes "/image/upload/"
        const isRaw = url.includes('/raw/upload/');
        const resourceType = isRaw ? 'raw' : 'image';

        // 2. Extraer el Public ID
        // URL típica: https://res.cloudinary.com/.../upload/v12345/carpeta/archivo.jpg
        const parts = url.split('/upload/');
        if (parts.length < 2) return; // URL inválida

        // Tomamos lo que sigue a 'upload/' (ej: v12345/carpeta/archivo.jpg)
        let publicId = parts[1];

        // Quitamos el número de versión (v12345/) si existe
        publicId = publicId.replace(/^v\d+\//, '');

        // 3. Manejo de Extensión (CRUCIAL)
        if (!isRaw) {
            // SI ES IMAGEN: Cloudinary requiere el ID SIN extensión.
            publicId = publicId.replace(/\.[^/.]+$/, "");
        } else {
            // SI ES RAW (PDF): Cloudinary requiere el ID CON extensión.
            // No hacemos nada, dejamos la extensión.
            publicId = decodeURIComponent(publicId); // Por si tiene espacios o caracteres raros
        }

        logger.info(`🗑️ Borrando de Cloudinary (${resourceType}): ${publicId}`);

        const result = await cloudinaryInstance.uploader.destroy(publicId, { 
            resource_type: resourceType,
            invalidate: true 
        });

        logger.info(`✅ Resultado borrado: ${result.result}`);

    } catch (error) {
        logger.error({ error: error.message, url }, '❌ Error intentando borrar archivo de Cloudinary');
    }
};