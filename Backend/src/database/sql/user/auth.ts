export const CREATE_AUTH_SQL = 'INSERT INTO auth (auth_uuid, user_id, loginMethod) VALUES ($1, $2, $3) RETURNING auth_id';

export const GET_AUTH_BY_UUID_SQL = 'SELECT * FROM auth WHERE auth_uuid = $1';

export const GET_AUTH_BY_USER_ID_SQL = 'SELECT * FROM auth WHERE user_id = $1 ORDER BY loginAt DESC';
