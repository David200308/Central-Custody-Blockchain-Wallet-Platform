export const CREATE_PASSKEY_SQL = 'INSERT INTO passkey (user_id, passkey_uid, public_key, counter, transports) VALUES ($1, $2, $3, $4, $5) RETURNING passkey_id';

export const GET_PASSKEY_BY_PASSKEY_UID_SQL = 'SELECT * FROM passkey WHERE passkey_uid = $1 LIMIT 1';

export const UPDATE_PASSKEY_COUNT_SQL = 'UPDATE passkey SET counter = $1 WHERE passkey_uid = $2';
