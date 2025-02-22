export const ADD_WALLET_SQL = 'INSERT INTO auth (wallet_uuid, user_id, wallet_address) VALUES ($1, $2, $3) RETURNING wallet_id';

export const GET_WALLET_BY_UUID_SQL = 'SELECT * FROM wallet WHERE wallet_uuid = $1';

export const GET_WALLET_BY_USER_ID_SQL = 'SELECT * FROM wallet WHERE user_id = $1';
