import db from '../../db/db.connection.js';
import logger  from '../../utils/pino/logger.js';

/**
 * GET /company
 * Obtener todas las empresas
 */
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await db('empresas').select('*').orderBy('nombre', 'asc');
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener empresas');
    res.status(500).json({ success: false, message: 'Error al obtener empresas' });
  }
};

/**
 * GET /company/:id
 * Obtener empresa por ID
 */
export const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    const company = await db('empresas').where({ id }).first();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener empresa');
    res.status(500).json({ success: false, message: 'Error al obtener empresa' });
  }
};

/**
 * POST /company
 * Crear nueva empresa
 */
export const createCompany = async (req, res) => {
  const { nombre, tipo_cobro, activo } = req.body;

  try {
    const [id] = await db('empresas').insert({
      nombre,
      tipo_cobro: tipo_cobro || 'TARIFA',
      activo: activo !== undefined ? activo : true
    });

    const newCompany = await db('empresas').where({ id }).first();
    logger.info({ event: 'create_company_success', companyId: id }, 'Empresa creada');
    res.status(201).json({ success: true, message: 'Empresa creada exitosamente', data: newCompany });

  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear empresa');
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('unique')) {
      return res.status(400).json({ success: false, message: 'Ya existe una empresa con ese nombre' });
    }
    res.status(500).json({ success: false, message: 'Error al crear empresa' });
  }
};

/**
 * PATCH /company/:id
 * Actualizar empresa
 */
export const updateCompany = async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_cobro, activo } = req.body;

  try {
    const company = await db('empresas').where({ id }).first();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (tipo_cobro !== undefined) updateData.tipo_cobro = tipo_cobro;
    if (activo !== undefined) updateData.activo = activo;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay datos para actualizar' });
    }

    await db('empresas').where({ id }).update(updateData);
    const updatedCompany = await db('empresas').where({ id }).first();

    logger.info({ event: 'update_company_success', companyId: id }, 'Empresa actualizada');
    res.status(200).json({ success: true, message: 'Empresa actualizada exitosamente', data: updatedCompany });

  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar empresa');
    res.status(500).json({ success: false, message: 'Error al actualizar empresa' });
  }
};

/**
 * DELETE /company/:id
 * Eliminar empresa (soft delete)
 */
export const deleteCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const company = await db('empresas').where({ id }).first();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    // Soft delete para no romper referencias de viajes
    await db('empresas').where({ id }).update({ activo: false });

    logger.info({ event: 'delete_company_success', companyId: id }, 'Empresa desactivada');
    res.status(200).json({ success: true, message: 'Empresa eliminada exitosamente' });

  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar empresa');
    res.status(500).json({ success: false, message: 'Error al eliminar empresa' });
  }
};
