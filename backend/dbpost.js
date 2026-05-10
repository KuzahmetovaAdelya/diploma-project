import pkg from 'pg';
import 'dotenv/config'
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',          
  port: 5432,
  database: 'Reflection',
  user: 'postgres',      
  password: process.env.DB_PASSWORD || 'admin',  
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к PostgreSQL:', err);
  } else {
    console.log('Подключено к базе данных PostgreSQL (Reflection).');
    release(); 
  }
});

export default pool;

