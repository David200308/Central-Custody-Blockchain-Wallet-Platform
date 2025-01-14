#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0

import base64
import json
import os
import socket
import subprocess
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from Crypto.Util.Padding import unpad
from web3.auto import w3
import web3
import sqlite3


def kms_call(credential, ciphertext):
    aws_access_key_id = credential["access_key_id"]
    aws_secret_access_key = credential["secret_access_key"]
    aws_session_token = credential["token"]

    subprocess_args = [
        "/app/kmstool_enclave_cli",
        "decrypt",
        "--region",
        os.getenv("REGION"),
        "--proxy-port",
        "8000",
        "--aws-access-key-id",
        aws_access_key_id,
        "--aws-secret-access-key",
        aws_secret_access_key,
        "--aws-session-token",
        aws_session_token,
        "--ciphertext",
        ciphertext,
    ]

    print("subprocess args: {}".format(subprocess_args))

    proc = subprocess.Popen(subprocess_args, stdout=subprocess.PIPE)

    # returns b64 encoded plaintext
    result_b64 = proc.communicate()[0].decode()
    plaintext_b64 = result_b64.split(":")[1].strip()

    return plaintext_b64

def generate_private_key():
    return w3.eth.account.create()

def encrypt_private_key(private_key_hex, plaintext_data_key):
    data_key_bytes = base64.b64decode(plaintext_data_key)
    
    if len(data_key_bytes) not in [16, 24, 32]:
        raise ValueError("Data key length must be 16, 24, or 32 bytes.")

    private_key_bytes = bytes.fromhex(private_key_hex)
    
    cipher = AES.new(data_key_bytes, AES.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(private_key_bytes, AES.block_size))
    
    iv_and_ct = cipher.iv + ct_bytes
    
    ciphertext_b64 = base64.b64encode(iv_and_ct).decode('utf-8')
    
    return ciphertext_b64

def kms_to_encrypt_private_key(credential, DataKeyCiphertext):
    DataKeyCiphertextBinary = DataKeyCiphertext.encode()

    plaintext_b64 = kms_call(credential, DataKeyCiphertextBinary)
    print("plaintext_b64: {}".format(plaintext_b64))

    wallet = generate_private_key()
    address = wallet.address
    privateKey = wallet.privateKey.hex().split("0x")[1]

    try:
        encrypted_private_key = encrypt_private_key(privateKey, plaintext_b64)
        response = address

        try:
            conn = sqlite3.connect('./data.db')
            c = conn.cursor()

            c.execute('''
            CREATE TABLE IF NOT EXISTS wallet
            (
                address TEXT PRIMARY KEY,
                encrypted_data_key TEXT,
                encrypted_private_key TEXT
            )
            ''')
            
            c.execute('''
                INSERT INTO wallet (address, encrypted_data_key, encrypted_private_key)
                VALUES (?, ?, ?)
                ''', (address, DataKeyCiphertext, encrypted_private_key)
            )

            conn.commit()
            conn.close()
        except Exception as e:
            msg = "error - exception happened store key to database: {}".format(e)
            print(msg)
            response = msg

    except Exception as e:
        msg = "error - exception happened encrypting private key: {}".format(e)
        print(msg)
        response = msg

    return response

def decrypt_encrypt_private_key(encrypted_private_key_b64, plaintext_data_key_b64):
    encrypted_private_key = base64.b64decode(encrypted_private_key_b64)
    plaintext_data_key = base64.b64decode(plaintext_data_key_b64)
    
    if len(plaintext_data_key) not in [16, 24, 32]:
        raise ValueError("Data key length must be 16, 24, or 32 bytes.")

    iv = encrypted_private_key[:AES.block_size]
    ct = encrypted_private_key[AES.block_size:]
    cipher = AES.new(plaintext_data_key, AES.MODE_CBC, iv)

    private_key_bytes = unpad(cipher.decrypt(ct), AES.block_size)
    private_key_hex = private_key_bytes.hex()
    
    return private_key_hex

def get_keys_from_db(address):
    get_keys_query = "SELECT encrypted_data_key, encrypted_private_key FROM wallet WHERE address = ?"
    conn = sqlite3.connect('./data.db')
    c = conn.cursor()
    c.execute(get_keys_query, (address,))
    result = c.fetchone()
    conn.close()

    return result


def main():
    print("Starting server...")

    # Create a vsock socket object
    s = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)

    # Listen for connection from any CID
    cid = socket.VMADDR_CID_ANY

    # The port should match the client running in parent EC2 instance
    port = 5000

    # Bind the socket to CID and port
    s.bind((cid, port))

    # Listen for connection from client
    s.listen()

    while True:
        c, addr = s.accept()

        # Get AWS credential sent from parent instance
        payload = c.recv(4096)
        payload_json = json.loads(payload.decode())
        print("payload json: {}".format(payload_json))

        credential = payload_json["credential"]

        if "operation" in payload_json and payload_json["operation"] == "set_key":
            try:
                DataKeyCiphertext = payload_json["encrypted_data_key"]
                response= kms_to_encrypt_private_key(credential, DataKeyCiphertext)

                c.send(str.encode(json.dumps(response)))
                c.close()
            except Exception as e:
                msg = "exception happened: {}".format(e)
                print(msg)
                response_plaintext = msg

                print("response_plaintext: {}".format(response_plaintext))

                c.send(str.encode(json.dumps(response_plaintext)))
                c.close()
            
        else:
            transaction_dict = payload_json["transaction_payload"]
            address = payload_json["from"]

            keys = get_keys_from_db(address)
            private_key_ciphertext = keys[1]
            data_key_ciphertext = keys[0].encode()

            try:
                data_key_b64 = kms_call(credential, data_key_ciphertext)
                print("data_key_b64: {}".format(data_key_b64))

                key_hex = decrypt_encrypt_private_key(private_key_ciphertext, data_key_b64)
            except Exception as e:
                msg = "exception happened calling kms binary or decrypting the key: {}".format(e)
                print(msg)
                response_plaintext = msg

            else:
                private_key = key_hex

                try:
                    transaction_dict["value"] = web3.Web3.toWei(
                        transaction_dict["value"], "ether"
                    )
                    transaction_signed = w3.eth.account.sign_transaction(
                        transaction_dict, private_key
                    )
                    response_plaintext = {
                        "transaction_signed": transaction_signed.rawTransaction.hex(),
                        "transaction_hash": transaction_signed.hash.hex(),
                    }

                except Exception as e:
                    msg = "exception happened signing the transaction: {}".format(e)
                    print(msg)
                    response_plaintext = msg

                # delete internal reference to plain text password
                del private_key

            print("response_plaintext: {}".format(response_plaintext))

            c.send(str.encode(json.dumps(response_plaintext)))
            c.close()


if __name__ == "__main__":
    main()
