import { Pool } from 'pg';
import { readFileSync } from 'fs';
import 'dotenv/config';

const access = {
    // connectionString: readFileSync(process.env.DB_URL_FILE, 'utf8').trim(),
    connectionString: process.env.DB_URL,
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(access);

export const checkDBConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        console.log('Database connection established successfully.');
        client.release();
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
        throw new Error('Database connection failed');
    }
};
