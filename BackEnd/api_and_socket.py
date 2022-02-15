import json
import logging
import time
import jwt
import requests

from os import getenv
from pathlib import Path
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_httpauth import HTTPTokenAuth
from werkzeug.security import check_password_hash

from db_controller import DBController, OrderError


def generate_auth_token(user_id, role, ip, expires_in=600):
    return jwt.encode({'id': user_id,
                       'role': role,
                       'exp': time.time() + expires_in},
                      getenv('SECRET_KEY') + ip,
                      algorithm='HS512')


def verify_auth_token(token):
    try:
        data = jwt.decode(token, getenv('SECRET_KEY') + request.remote_addr, algorithms=['HS512'])
    except:
        return None
    data.pop('exp', None)
    return data


class ApiAndSocket:
    ws_clients_connected = 0
    token_expire_in_seconds = 24 * 60 * 60
    logger_api = logging.getLogger('API')
    logger_websocket = logging.getLogger('WebSocket')

    def __init__(self, db: DBController):
        self.logger_api.info('Init...')
        self.logger_websocket.info('Init...')

        # initialization
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = getenv('SECRET_KEY')

        # extensions
        self.db = db
        self.ms = None
        self.ts = None
        self.auth = HTTPTokenAuth(scheme='Bearer')
        self.io = SocketIO(self.app, path='apiSocket', async_mode='gevent', upgradeTimeout=500,
                           cors_allowed_origins=["http://localhost:3000", "https://home.tonicifre.com"],
                           transports=["websocket"])

        CORS(self.app, resources={r"/api/*": {"origins": ["http://localhost:3000", 'https://home.tonicifre.com']}})

    def run(self):
        self.logger_api.info('Start')
        self.logger_websocket.info('Start')

        self.io.run(self.app,
                    host=getenv('API_HOST'),
                    port=int(getenv('API_PORT')),
                    keyfile=Path(getenv('API_KEY_FILE')).resolve(),
                    certfile=Path(getenv('API_CERT_FILE')).resolve())

        self.logger_api.info('END')
        self.logger_websocket.info('END')

    def set_mosquitto(self, ms):
        self.ms = ms

    def set_scheduler(self, ts):
        self.ts = ts

    def emit(self, event, data):
        if self.ws_clients_connected != 0:
            self.io.emit(event, data)

    def api_call_backs(self):
        # ===== AUTH =====
        @self.auth.verify_token
        def verify_token(token):
            user = verify_auth_token(token)
            if user is not None:
                user = self.db.user.get(user['id'])
                if user is not None:
                    g.user = user['name']
                    g.role = user['role']
            return user

        @self.auth.get_user_roles
        def get_user_roles(user):
            if user:
                return [user['role']]
            else:
                return []

        @self.app.route('/api/v1/auth/login', methods=['POST'])
        def login():
            username = password = None
            try:
                username = request.json.get('username')
                password = request.json.get('password')
            except AttributeError:
                pass
            if username is None or password is None:
                return 'Bad post petition.', 400

            user = self.db.user.get_pass(username)
            if not user or not check_password_hash(user['password_hash'], password):
                return 'Auth error.', 401

            ip = request.remote_addr
            browser = request.user_agent.browser
            platform = request.user_agent.platform
            version = request.user_agent.version and int(request.user_agent.version.split('.')[0])

            r = requests.get(f'http://ip-api.com/json/{ip}')
            if r.ok:
                try:
                    geolocation = json.loads(r.text)
                except:
                    self.db.user.add_login(username, ip, browser, version, platform)
                    self.logger_api.info(f'Error processing ip geolocation - {r.text}')
                else:
                    self.db.user.add_login(username, ip, browser, version, platform, geolocation)

            else:
                self.db.user.add_login(username, ip, browser, version, platform)
                self.logger_api.info(f'Error getting ip geolocation - {r.text}')

            token = generate_auth_token(user['name'], user['role'], request.remote_addr, self.token_expire_in_seconds)

            self.logger_api.info(f'User {username} has sign in.')
            return jsonify({'user': username,
                            'role': user['role'],
                            'token': token,
                            'duration': self.token_expire_in_seconds,
                            'exp': int(time.time()) + self.token_expire_in_seconds}), 201

        @self.app.route('/api/v1/auth/token')
        @self.auth.login_required
        def update_token():
            user = g.get('user')
            role = g.get('role')
            if user and (role is not None):
                token = generate_auth_token(user, role, request.remote_addr, self.token_expire_in_seconds)
                return jsonify({'user': user,
                                'role': role,
                                'token': token,
                                'duration': self.token_expire_in_seconds,
                                'exp': int(time.time()) + self.token_expire_in_seconds}), 201
            else:
                return 'No User registered.', 401

        # ==== USERS ====

        @self.app.route('/api/v1/users', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_user():
            name = request.json.get('name')
            passw = request.json.get('passw')
            role = request.json.get('role')
            if passw is None or role is None or name is None:
                return 'Bad post petition.', 400

            if self.db.user.exist(name):
                return 'User already exist.', 400

            if self.db.user.add(name, passw, role):
                return jsonify({'name': name, 'role': role}), 201
            else:
                return 'Error inserting in DB.', 400

        @self.app.route('/api/v1/users/<user_id>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_user(user_id):
            try:
                name = request.json.get('name')
                role = request.json.get('role')
            except AttributeError:
                return 'Bad post petition.', 400

            if not self.db.user.exist(user_id):
                return 'User dont exist.', 400

            if self.db.user.update(user_id, name, role):
                return 'ok', 201
            else:
                return 'Error updating DB.', 400

        @self.app.route('/api/v1/users/<user_id>/password', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_user_password(user_id):
            try:
                psw = request.json.get('psw')
            except AttributeError:
                return 'Bad post petition.', 400

            if not self.db.user.exist(user_id):
                return 'User dont exist.', 400

            if self.db.user.update_password(user_id, psw):
                return 'ok', 201
            else:
                return 'Error updating DB.', 400

        @self.app.route('/api/v1/users/<user_id>', methods=['DELETE'])
        @self.auth.login_required(role=0)
        def delete_user(user_id):
            if not self.db.user.exist(user_id):
                return 'User dont exist.', 400

            if self.db.user.num_admins() <= 1:
                return 'Cant remove all the admin users.', 400

            if self.db.user.delete(user_id):
                return 'ok', 201
            else:
                return 'Error Removing user from DB.', 400

        @self.app.route('/api/v1/users/name', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_users_name():
            return jsonify(self.db.user.get_names())

        @self.app.route('/api/v1/users', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_users():
            return jsonify(self.db.user.get_all())

        # ==== SENSORS ====

        @self.app.route('/api/v1/user/sensors/values/<group>', methods=['GET'])
        @self.auth.login_required
        def get_user_sensors_values_group_by(group):
            try:
                return self.db.sensor.get_all_values_by_user_group_by(g.user, group)
            except OrderError:
                return f"Cant group sensors by {group}", 402

        @self.app.route('/api/v1/user/sensors/show/<group>', methods=['GET'])
        @self.auth.login_required()
        def get_sensors_show_group_by(group):
            try:
                return self.db.sensor.get_all_show_group_by(g.user, group)
            except OrderError:
                return f"Cant group sensors by {group}", 402

        @self.app.route('/api/v1/sensors/type', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_sensors_group_by_type():
            return self.db.sensor.get_all_group_by_type()

        @self.app.route('/api/v1/actuators', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_actuators_info():
            return jsonify(self.db.actuator.get_all_info())

        @self.app.route('/api/v1/passives', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_passive_info():
            return jsonify(self.db.passive.get_all_info())

        @self.app.route('/api/v1/actives', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_actives_info():
            return jsonify(self.db.active.get_info())

        @self.app.route('/api/v1/cameras', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_cameras_info():
            return jsonify(self.db.camera.get_info())

        @self.app.route('/api/v1/user/<user>/sensors/<group>', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_user_sensors_group_by(user, group):
            try:
                return self.db.sensor.get_all_by_users_group_by(user, group)
            except OrderError:
                return f"Cant group sensors by {group}", 402

        @self.app.route('/api/v1/sensor/<sensor>/show/<int:show>', methods=['PUT'])
        @self.auth.login_required
        def update_sensors_show(sensor, show):
            if not self.db.user.have_sensor(g.user, sensor):
                return 'Don\'t have permission.', 401

            if self.db.user.update_show(sensor_id=sensor, user=g.user, show=show):
                return {'show': show}, 201
            else:
                return 'Error updating sensor', 500

        @self.app.route('/api/v1/user/<user>/sensor/<sensor>/<int:in_user>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_user_in_sensor(user, sensor, in_user):
            if in_user:
                if not self.db.user.add_sensor(user, sensor):
                    return 'Error updating user_sensor', 500
            else:
                if not self.db.user.delete_sensor(user, sensor):
                    return 'Error updating user_sensor', 500
            return {'in_user': in_user}, 201

        @self.app.route('/api/v1/update/<type>/<sensor_id>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_sensor(type, sensor_id):
            sensor = self.db.sensor.get(sensor_id)
            if sensor is None:
                return f'Sensor {sensor_id} don\'t exist.', 400

            sensor["name"] = request.form.get(f'name')
            sensor["room"] = request.form.get(f'room')
            if type == 'actuator':
                sensor["definition"] = request.form.get(f'definition')
            if type == 'passive':
                sensor["definition"] = request.form.get(f'definition')
                sensor["change_period"] = request.form.get(f'change_period')
            elif type == 'active':
                sensor["definition"] = request.form.get(f'definition')
                sensor["save_period"] = request.form.get(f'save_period')
                sensor["take_period"] = request.form.get(f'take_period')
            elif type == 'camera':
                sensor["film"] = request.form.get(f'film') == '1'
                sensor["min_framerate"], sensor["max_framerate"] = request.form.get(f'framerate').split(',')

            if self.db.sensor.update(sensor):
                self.logger_api.info(f'Sensor {sensor_id} whas updated - {sensor}')
                if type == 'passive':
                    self.ms.publish(topic=f'{sensor["device_id"]}/{sensor_id}/changePeriod',
                                    payload=sensor["change_period"])

                if type == 'active':
                    self.ms.active_save_period[sensor_id] = int(sensor["take_period"])
                    self.ms.publish(topic=f'{sensor["device_id"]}/{sensor_id}/takePeriod',
                                    payload=sensor["take_period"])

                elif type == 'camera':
                    self.ms.film[sensor_id] = int(sensor["film"])
                    self.ms.camera_frames[sensor_id]['min_framerate'] = int(sensor["min_framerate"])
                    self.ms.camera_frames[sensor_id]['max_framerate'] = int(sensor["max_framerate"])
                    self.ms.publish(topic=f'{sensor["device_id"]}/{sensor_id}/DetectMotion',
                                    payload=int(sensor["film"]))
                    self.ms.publish(topic=f'{sensor["device_id"]}/{sensor_id}/FrameRate',
                                    payload=sensor["min_framerate"])
                return 'OK', 200
            else:
                return "Error updating.", 400

        @self.app.route('/api/v1/delete_sensor/<sensor_id>', methods=['DELETE'])
        @self.auth.login_required(role=0)
        def delete_sensor(sensor_id):
            if not self.db.sensor.exist(sensor_id):
                return f'Sensor {sensor_id} don\'t exist.', 400

            if self.db.sensor.delete(sensor_id):
                return 'OK', 200
            else:
                return "Error removing sensor.", 501

        # ===== ROOMS =====
        @self.app.route('/api/v1/rooms', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_rooms():
            return jsonify(self.db.room.get_all())

        @self.app.route('/api/v1/rooms', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_room():
            try:
                room = request.json.get('room')
            except AttributeError:
                return 'Bad post petition.', 400

            if self.db.room.get(room):
                return 'This room already exist.', 400

            self.db.room.add(room)
            return 'ok'

        @self.app.route('/api/v1/rooms/<room>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_room(room):
            try:
                new_room = request.json.get('newRoom')
            except AttributeError:
                return 'Bad put petition.', 400

            if not self.db.room.get(room):
                return 'Room dont exist.', 401

            self.db.room.update(room=room, new_room=new_room)
            return 'ok'

        @self.app.route('/api/v1/rooms/<room>', methods=['DELETE'])
        @self.auth.login_required(role=0)
        def delete_room(room):
            if self.db.room.delete(room=room):
                return 'ok'
            return "Error deleting room", 400

        # ===== DEFINITION =====
        @self.app.route('/api/v1/actuator/definitions', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_actuator_definitions():
            return jsonify(self.db.actuator.get_definition())

        @self.app.route('/api/v1/passive/definitions', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_passive_definitions():
            return jsonify(self.db.passive.get_definition())

        @self.app.route('/api/v1/active/definitions', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_active_definitions():
            return jsonify(self.db.active.get_definition())

        @self.app.route('/api/v1/definitions', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_definitions():
            return {'active': self.db.active.get_definition(),
                    'actuator': self.db.actuator.get_definition(),
                    'passive': self.db.passive.get_definition()}

        @self.app.route('/api/v1/<type>/definitions', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_definition(type):
            name = request.json.get(f'definition')
            icon = request.json.get(f'icon')
            if type == 'active':
                self.db.active.add_definition(name, icon)
            elif type == 'actuator':
                self.db.actuator.add_definition(name, icon)
            elif type == 'passive':
                self.db.passive.add_definition(name, icon)

            return 'ok'

        @self.app.route('/api/v1/<type>/definitions/<definition>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_definition(type, definition):
            name = request.json.get(f'definition')
            icon = request.json.get(f'icon')
            if type == 'active':
                self.db.active.update_definition(definition, name, icon)
            elif type == 'actuator':
                self.db.actuator.update_definition(definition, name, icon)
            elif type == 'passive':
                self.db.passive.update_definition(definition, name, icon)

            return 'ok'

        @self.app.route('/api/v1/<type>/definitions/<definition>', methods=['DELETE'])
        @self.auth.login_required(role=0)
        def delete_definition(type, definition):
            if type == 'active':
                self.db.active.delete_definition(definition)
            elif type == 'actuator':
                self.db.actuator.delete_definition(definition)
            elif type == 'passive':
                self.db.passive.delete_definition(definition)

            return 'ok'

        # ===== TRIGGER =====
        @self.app.route('/api/v1/triggers', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_all_triggers():
            return jsonify(self.db.trigger.get_list())

        @self.app.route('/api/v1/trigger', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_trigger():
            try:
                triggers = []
                for p in range(int(request.form.get('nTrigges'))):
                    sensor_id = request.form.get(f'trigger-select-{p}')
                    sensor = self.db.sensor.get(sensor_id)
                    if not sensor:
                        return f'Sensor {sensor_id}: don\'t exist.', 400

                    if p > 0:
                        if sensor['type'] == 'active':
                            trigger = " " + request.form.get(f'trigger-union-{p}') + " " + \
                                      "#" + request.form.get(f'math-select-{p}') + request.form.get(
                                f'trigger-value-{p}')
                        else:
                            trigger = " " + request.form.get(f'trigger-union-{p}') + " " + \
                                      "#==" + request.form.get(f'math-select-{p}')
                    else:
                        if sensor['type'] == 'active':
                            trigger = "#" + request.form.get(f'math-select-{p}') + request.form.get(
                                f'trigger-value-{p}')
                        else:
                            trigger = f"#=={request.form.get(f'math-select-{p}')}"

                    triggers.append({'sensor_id': sensor_id, 'trigger': trigger})

                actions = []
                for p in range(int(request.form.get('nActions'))):
                    sensor_id = request.form.get(f'action-select-{p}')
                    timer = 0
                    value = request.form.get(f'action-value-{p}')
                    if value == 'timer':
                        hour = int(request.form.get(f'action-timer-{p}').split(':')[0])
                        minute = int(request.form.get(f'action-timer-{p}').split(':')[1])
                        timer = hour * 60 + minute
                        value = request.form.get(f'action-timer-value-{p}')

                    actions.append({'sensor_id': sensor_id, 'value': value, 'timer': timer})

            except AttributeError:
                return 'All inputs are requires.', 400

            if self.db.trigger.add(triggers, actions):
                self.logger_api.info(f'New Trigger - {(triggers, actions)}')
                self.ms.update_triggers()
                return 'OK', 200
            else:
                return "Error inserting into database", 400

        @self.app.route('/api/v1/triggers/<trigger_id>', methods=['DELETE'])
        @self.auth.login_required(role=0)
        def delete_triggers(trigger_id):
            if self.db.trigger.delete(trigger_id):
                self.ms.update_triggers()
                return 'ok', 200
            return 'Cant remove trigger from DB.'

        # ===== SCHEDULER =====

        @self.app.route('/api/v1/schedulers', methods=['GET'])
        @self.auth.login_required(role=0)
        def get_all_schedulers():
            return self.db.scheduler.get_all()

        @self.app.route('/api/v1/scheduler', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_scheduler():
            try:
                sensor_id = request.json.get('sensor')
                every = request.json.get('every')
                interval = request.json.get('interval')
                at = request.json.get('at')
                value = request.json.get('value')
            except AttributeError:
                return 'Bad post petition.', 400

            scheduler_id = self.db.scheduler.add(sensor_id, every, interval, at, value)
            if scheduler_id:
                sensor = self.db.sensor.get(sensor_id)
                if sensor is None:
                    return 'Sensor dont exist.', 401

                topic = f'{sensor["device_id"]}/{sensor_id}/set'
                self.ts.add_actuator_schedule(topic, int(value), every, int(interval), at, sensor_id, scheduler_id)
                return 'ok'
            else:
                return 'Cant insert Scheduler to database.'

        # ===== DEVICE =====
        @self.app.route('/api/v1/device', methods=['POST'])
        @self.auth.login_required(role=0)
        def add_device():
            errors = []
            device_id = request.form.get('device')
            if self.db.device.exist(device_id):
                errors.append(f'Device {device_id}, already exist.')

            sensors = []
            for p in range(int(request.form.get('nsensors'))):
                sensor_id = request.form.get(f'sensor_{p}')
                if self.db.sensor.exist(sensor_id):
                    errors.append(f'Sensor {sensor_id}: already exist.')
                    continue

                s_type = request.form.get(f'type_{p}')

                sensor = {"sensor_id": sensor_id,
                          "type": s_type,
                          "name": request.form.get(f'name_{p}'),
                          "show": request.form.get(f'show_{p}') == '1',
                          "room": request.form.get(f'room_{p}')}
                if s_type == 'actuator':
                    sensor["definition"] = request.form.get(f'definition_{p}')
                if s_type == 'passive':
                    sensor["definition"] = request.form.get(f'definition_{p}')
                    sensor["change_period"] = request.form.get(f'change_period_{p}')
                if s_type == 'active':
                    sensor["definition"] = request.form.get(f'definition_{p}')
                    sensor["save_period"] = request.form.get(f'save_period_{p}')
                    sensor["take_period"] = request.form.get(f'take_period_{p}')
                if s_type == 'camera':
                    sensor["film"] = request.form.get(f'film_{p}') == '1'
                    sensor["min_framerate"], sensor["max_framerate"] = request.form.get(f'framerate_{p}').split(',')
                sensors.append(sensor)

            if errors:
                return jsonify(errors), 409
            if self.db.device.add_device_with_sensors(device_id, sensors, g.user):
                self.logger_api.info(f'New device created - {device_id}')
                self.ms.add_new_device(device_id, sensors)
                return 'OK', 200
            else:
                return jsonify(["Error inserting into database"]), 400

        # ==== HOME =====
        @self.app.route('/api/v1/home/<home>/status/<int:status>', methods=['PUT'])
        @self.auth.login_required(role=0)
        def update_home_status(home, status):
            self.db.home.update_status(home, status)
            return jsonify('OK', 200)

        # ==== TEST =====
        @self.app.route('/api/v1/test')
        def test():
            return jsonify('OK', 200)

        @self.app.route('/api/v1/ip')
        def test_ip():
            print(request.user_agent)
            browser = request.user_agent.browser
            version = request.user_agent.version and int(request.user_agent.version.split('.')[0])
            platform = request.user_agent.platform
            uas = request.user_agent
            print(browser)
            print(version)
            print(platform)
            print(uas)

            # r = requests.get(f'http://ip-api.com/json/79.144.25.113')
            r = requests.get(f'http://ip-api.com/json/{request.remote_addr}')
            if r.ok:
                geolocation = json.loads(r.text)
                if geolocation['status'] == 'fail':
                    print(geolocation['message'])
                else:
                    print(geolocation)
            else:
                print(r.text)

            return jsonify(request.remote_addr, 201)

    def socket_call_backs(self):
        @self.io.on('connect')
        def connect():
            token = request.headers.get('Authorization')
            if not token:
                self.logger_websocket.info('Rejected client without token.')
                return False

            user = verify_auth_token(token.split(' ')[1])
            if not user:
                self.logger_websocket.info('Rejected client with incorrect token.')
                return False
            self.logger_websocket.info(f'Client -{user}- has connected')
            self.ws_clients_connected += 1

        @self.io.on("disconnect")
        def disconnect():
            self.ws_clients_connected -= 1

        @self.io.on('jumpActuator')
        def jump_actuator(data):
            self.ms.publish(data['topic'], data['value'])

        @self.io.on('timerActuator')
        def timer_actuator(data):
            hours = int(data['timer'].split(':')[0])
            minutes = int(data['timer'].split(':')[1])
            self.ms.publish(data['topic'], json.dumps({'state': data['state'], 'timer': hours * 60 + minutes}))

        @self.io.on('reset')
        def handle_message(topic):
            self.ms.publish(topic, 0)

        @self.io.on_error_default
        def default_error_handler(e):
            self.logger_websocket.info(f'An error occurred: {e}')
