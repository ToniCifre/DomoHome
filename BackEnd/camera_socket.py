import logging
import jwt

from os import getenv
from pathlib import Path
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_httpauth import HTTPTokenAuth

from threading import Thread


def verify_auth_token(token):
    try:
        data = jwt.decode(token, getenv('SECRET_KEY') + request.remote_addr, algorithms=['HS512'])
    except:
        return None
    data.pop('exp', None)
    return data


class CameraSocket(Thread):
    ws_clients_connected = 0
    logger = logging.getLogger('CameraWebSocket')

    def __init__(self):
        Thread.__init__(self, daemon=True)
        self.logger.info('Init...')

        # initialization
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = getenv('SECRET_KEY')

        # extensions
        self.auth = HTTPTokenAuth(scheme='Bearer')
        self.io = SocketIO(self.app, path='cameraSocket', async_mode='gevent', upgradeTimeout=500,
                           cors_allowed_origins=["http://localhost:3000", "https://home.tonicifre.com"],
                           transports=["websocket"])


    def run(self):
        self.logger.info('Start')

        self.active_call_backs()

        self.io.run(self.app,
                    host=getenv('API_HOST'),
                    port=int(getenv('CAMERA_SOCKET_PORT')),
                    keyfile=Path(getenv('API_KEY_FILE')).resolve(),
                    certfile=Path(getenv('API_CERT_FILE')).resolve())

        self.logger.info('END')

    def emit(self, event, data):
        if self.ws_clients_connected != 0:
            self.io.emit(event, data)

    def active_call_backs(self):
        @self.io.on('connect')
        def connect():
            token = request.headers.get('Authorization')
            if not token:
                self.logger.info('Rejected client without token.')
                return False

            user = verify_auth_token(token.split(' ')[1])
            if not user:
                self.logger.info('Rejected client with incorrect token.')
                return False
            self.logger.info(f'Client -{user}- has connected camera')
            self.ws_clients_connected += 1

        @self.io.on("disconnect")
        def disconnect():
            self.ws_clients_connected -= 1

        @self.io.on_error_default
        def default_error_handler(e):
            self.logger.info(f'An error occurred: {e}')
