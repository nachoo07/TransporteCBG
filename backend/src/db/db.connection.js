import knex from 'knex';
import knexConfig from '../../knexfile.js';

const connection = knex(knexConfig.development);

export default connection;
