import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import 'dotenv/config';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // 1. Lógica de carpetas (Mantenemos la tuya que está perfecta)
        let folderPath = 'transporte-cbg/otros';

        switch (file.fieldname) {
            case 'archivo_dni': folderPath = 'transporte-cbg/choferes/dnis'; break;
            case 'archivo_licencia': folderPath = 'transporte-cbg/choferes/licencias'; break;
            case 'archivo_psicofisico': folderPath = 'transporte-cbg/choferes/psicofisicos'; break;
            case 'archivo_curso_carga_normal': folderPath = 'transporte-cbg/choferes/cursos_generales'; break;
            case 'archivo_curso_carga_peligrosa': folderPath = 'transporte-cbg/choferes/cursos_peligrosos'; break;
            case 'url_cedula_chasis':
            case 'url_titulo_chasis': folderPath = 'transporte-cbg/flota/chasis/documentacion_legal'; break;
            case 'url_vtv_chasis': folderPath = 'transporte-cbg/flota/chasis/vtv'; break;
            case 'url_senasa_chasis':
            case 'url_tipificacion_carga_chasis':
            case 'url_homologacion_chasis': folderPath = 'transporte-cbg/flota/chasis/habilitaciones'; break;
            case 'url_cedula_acoplado':
            case 'url_titulo_acoplado': folderPath = 'transporte-cbg/flota/acoplados/documentacion_legal'; break;
            case 'url_vtv_acoplado': folderPath = 'transporte-cbg/flota/acoplados/vtv'; break;
            case 'url_senasa_acoplado':
            case 'url_tipificacion_carga_acoplado':
            case 'url_homologacion_acoplado': folderPath = 'transporte-cbg/flota/acoplados/habilitaciones'; break;
        }

        // 🚨 LA CORRECCIÓN ESTÁ AQUÍ 🚨
        const isPdf = file.mimetype === 'application/pdf';

        return {
            folder: folderPath,
            
            // Si es PDF forzamos 'raw' y 'public'. Si es 'auto', Cloudinary lo bloquea.
            resource_type: isPdf ? 'raw' : 'image',
            access_mode: 'public', // <--- ESTO ARREGLA EL BLOQUEO
            
            public_id: `${file.fieldname}-${Date.now()}`,
            
            // Allowed formats SOLO va si NO es PDF
            ...(isPdf ? { format: 'pdf' } : { allowed_formats: ['jpg', 'png', 'jpeg'] })
        };
    },
});

export const upload = multer({ storage: storage });
export const cloudinaryInstance = cloudinary;