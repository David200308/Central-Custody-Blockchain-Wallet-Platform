// CREATE TABLE IF NOT EXISTS users (
//     id SERIAL PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     passkeyEnabled BOOLEAN DEFAULT FALSE
// );

export const CREATE_USER_SQL = 'INSERT INTO users (email) VALUES ($1) RETURNING id';

export const GET_USER_BY_EMAIL_SQL = 'SELECT * FROM users WHERE email = $1';

export const GET_USER_BY_ID_SQL = 'SELECT * FROM users WHERE id = $1';

export const GET_USER_BY_EMAIL_PASSKEY_DISABLED_SQL = 'SELECT * FROM users WHERE email = $1 AND passkeyEnabled = FALSE';

export const ENABLE_PASSKEY_SQL = 'UPDATE users SET passkeyEnabled = TRUE WHERE id = $1';
