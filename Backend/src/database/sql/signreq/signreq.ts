export const ADD_SIGNREQ_SQL = 'INSERT INTO signrequest (user_id, signrequest_uuid, content_type, request_status) VALUES ($1, $2, $3, $4) RETURNING signrequest_id';

export const GET_SIGNREQ_BY_USER_ID_SQL = 'SELECT * FROM signrequest WHERE user_id = $1 ORDER BY request_time DESC';
