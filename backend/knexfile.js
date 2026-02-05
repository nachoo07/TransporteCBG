// knexfile.js
import { CONNECTION_STRING } from './src/config/config.js';

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {
  development: {
    client: 'mysql2', // Usamos el driver que ya instalaste
    connection: CONNECTION_STRING,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations', // Aquí se guardarán los archivos de historial
      tableName: 'knex_migrations' // Tabla interna para control de versiones
    }
  },
  
  production: {
    client: 'mysql2',
    connection: CONNECTION_STRING,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};