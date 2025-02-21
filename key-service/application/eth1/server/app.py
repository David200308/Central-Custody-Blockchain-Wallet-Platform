#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0

import base64
import json
import logging
import os
import socket
import ssl
from http import client
from http.server import BaseHTTPRequestHandler, HTTPServer

import boto3

client_kms = boto3.client(
    service_name="kms", region_name=os.getenv("REGION", "us-west-1")
)

class S(BaseHTTPRequestHandler):
    def _set_response(self, http_status=200):
        self.send_response(http_status)
        self.send_header("Content-type", "application/json")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        logging.info(
            "POST request,\nPath: %s\nHeaders:\n%s\n\nBody:\n%s\n",
            str(self.path),
            str(self.headers),
            post_data.decode("utf-8"),
        )
        payload = json.loads(post_data.decode("utf-8"))
        print("payload: {}".format(payload))

        if (payload.get("operation") == "set_key"):
            plaintext_json = call_enclave_gen_private_key(16, 5000, payload)

            self._set_response()
            self.wfile.write(plaintext_json.encode("utf-8"))
        else:
            if not (payload.get("transaction_payload") and payload.get("from")):
                self._set_response(404)
                self.wfile.write(
                    "transaction_payload or from address are missing".encode("utf-8")
                )

            plaintext_json = call_enclave_sign(16, 5000, payload)

            self._set_response()
            self.wfile.write(plaintext_json.encode("utf-8"))

def get_aws_session_token():
    http_ec2_client = client.HTTPConnection("169.254.169.254")
    http_ec2_client.request("GET", "/latest/meta-data/iam/security-credentials/")
    r = http_ec2_client.getresponse()

    instance_profile_name = r.read().decode()

    http_ec2_client = client.HTTPConnection("169.254.169.254")
    http_ec2_client.request(
        "GET",
        "/latest/meta-data/iam/security-credentials/{}".format(instance_profile_name),
    )
    r = http_ec2_client.getresponse()

    response = json.loads(r.read())

    credential = {
        "access_key_id": response["AccessKeyId"],
        "secret_access_key": response["SecretAccessKey"],
        "token": response["Token"],
    }

    return credential

def generate_data_key(masterKeyId):
    genDataKeyResponse = client_kms.generate_data_key(
        KeyId=masterKeyId,
        KeySpec="AES_256"
    )
    return genDataKeyResponse

def call_enclave_gen_private_key(cid, port, enclave_payload):
    master_key_id = enclave_payload["key_id"]

    dataKeyResponse = generate_data_key(master_key_id)
    encrypted_data_key = dataKeyResponse["CiphertextBlob"]

    payload = {}

    # Get EC2 instance metedata
    payload["credential"] = get_aws_session_token()
    payload["operation"] = "set_key"
    payload["encrypted_data_key"] = base64.b64encode(encrypted_data_key).decode()

    # Create a vsock socket object
    s = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)

    # Connect to the server
    s.connect((cid, port))

    # Send AWS credential to the server running in enclave
    # logging.info("payload: {}".format(payload))

    payloadDumpsEncode = str.encode(json.dumps(payload))
    # logging.info("payloadDumpsEncode: {}".format(payloadDumpsEncode))

    s.send(payloadDumpsEncode)

    # receive data from the server
    payload_processed = s.recv(1024).decode()
    logging.info("payload_processed: {}".format(payload_processed))

    if "error" in payload_processed:
        raise Exception(payload_processed)
    else:
        response = payload_processed

        print("response: {}".format(response))

    # close the connection
    s.close()

    return response

def call_enclave_sign(cid, port, enclave_payload):
    payload = {}
    # Get EC2 instance metedata
    payload["credential"] = get_aws_session_token()
    payload["transaction_payload"] = enclave_payload["transaction_payload"]
    payload["from"] = enclave_payload["from"]

    # Create a vsock socket object
    s = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)

    # Connect to the server
    s.connect((cid, port))

    # Send AWS credential to the server running in enclave
    s.send(str.encode(json.dumps(payload)))

    # receive data from the server
    payload_processed = s.recv(1024).decode()
    print("payload_processed: {}".format(payload_processed))

    # close the connection
    s.close()

    return payload_processed


def run(server_class=HTTPServer, handler_class=S, port=443):
    logging.basicConfig(level=logging.INFO)
    server_address = ("0.0.0.0", port)
    httpd = server_class(server_address, handler_class)
    logging.info("Starting httpd...\n")
    httpd.socket = ssl.wrap_socket(
        httpd.socket,
        server_side=True,
        certfile="/etc/pki/tls/certs/localhost.crt",
        ssl_version=ssl.PROTOCOL_TLS,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logging.info("Stopping httpd...\n")


if __name__ == "__main__":
    run()
