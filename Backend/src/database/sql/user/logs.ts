export const GET_LOGS_BY_USERID = 'SELECT * FROM logs WHERE user_id = $1 ORDER BY log_time DESC';

export const CREATE_LOG_SQL = 'INSERT INTO logs (user_id, content) VALUES ($1, $2) RETURNING log_id';
