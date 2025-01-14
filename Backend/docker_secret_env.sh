printf '' | docker secret create walletplatform_db_url -
docker secret create walletplatform_jwt_private_key private_key.pem
docker secret create walletplatform_jwt_public_key public_key.pem
printf '' | docker secret create walletplatform_docs_user -
printf '' | docker secret create walletplatform_docs_password -
printf '' | docker secret create walletplatform_passkey_rpname -
printf '' | docker secret create walletplatform_passkey_rpid -
printf '' | docker secret create walletplatform_passkey_origin -
printf '' | docker secret create walletplatform_aes_key -
printf '' | docker secret create walletplatform_sentry_dsn -
