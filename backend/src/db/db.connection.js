import knex from 'knex';
import knexConfig from '../../knexfile.js';

const env = process.env.DB_ENV || process.env.NODE_ENV || 'development';
const selectedConfig = knexConfig[env] || knexConfig.development;

const connection = knex(selectedConfig);

export default connection;
