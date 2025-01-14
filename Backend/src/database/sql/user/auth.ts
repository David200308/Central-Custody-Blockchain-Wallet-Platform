export const CREATE_AUTH_SQL = 'INSERT INTO auth (auth_uuid, user_id, ipAddress, loginMethod, loginDeviceName, loginLocation) VALUES ($1, $2, $3, $4, $5, $6) RETURNING auth_id';

export const GET_AUTH_BY_UUID_SQL = 'SELECT * FROM auth WHERE auth_uuid = $1';

export const GET_AUTH_BY_USER_ID_SQL = 'SELECT * FROM auth WHERE user_id = $1 ORDER BY loginAt DESC';
