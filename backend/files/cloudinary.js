import multer from 'multer';
import 'dotenv/config';

let cloudinaryReadyPromise;

const resolveFolderPath = (fieldname) => {
    let folderPath = 'transporte-cbg/otros';
    switch (fieldname) {
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
        case 'invoice_photo': folderPath = 'transporte-cbg/viajes/facturas'; break;
        case 'archivo_factura_liquidado': folderPath = 'transporte-cbg/viajes/liquidaciones'; break;
        case 'foto_km_inicio':
        case 'foto_km_fin': folderPath = 'transporte-cbg/viajes/combustible/kilometraje'; break;
        case 'foto_factura_combustible': folderPath = 'transporte-cbg/viajes/combustible/facturas'; break;
    }
    return folderPath;
};

const getCloudinaryReady = async () => {
    if (!cloudinaryReadyPromise) {
        cloudinaryReadyPromise = (async () => {
            const [{ v2: cloudinary }, { CloudinaryStorage }] = await Promise.all([
                import('cloudinary'),
                import('multer-storage-cloudinary'),
            ]);

            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });

            const storage = new CloudinaryStorage({
                cloudinary,
                params: async (req, file) => {
                    const isPdf = file.mimetype === 'application/pdf';
                    return {
                        folder: resolveFolderPath(file.fieldname),
                        resource_type: isPdf ? 'raw' : 'image',
                        access_mode: 'public',
                        public_id: `${file.fieldname}-${Date.now()}`,
                        ...(isPdf ? { format: 'pdf' } : { allowed_formats: ['jpg', 'png', 'jpeg'] }),
                    };
                },
            });

            return {
                cloudinary,
                upload: multer({ storage }),
            };
        })();
    }

    return cloudinaryReadyPromise;
};

const lazyUploadMiddleware = (method) => (...args) => async (req, res, next) => {
    try {
        const { upload } = await getCloudinaryReady();
        return upload[method](...args)(req, res, next);
    } catch (error) {
        return next(error);
    }
};

export const upload = {
    fields: lazyUploadMiddleware('fields'),
    single: lazyUploadMiddleware('single'),
    array: lazyUploadMiddleware('array'),
    any: lazyUploadMiddleware('any'),
    none: lazyUploadMiddleware('none'),
};

export const cloudinaryInstance = {
    uploader: {
        destroy: async (...args) => {
            const { cloudinary } = await getCloudinaryReady();
            return cloudinary.uploader.destroy(...args);
        },
    },
};
