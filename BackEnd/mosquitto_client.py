import json
import logging
import ssl

import numpy as np
import paho.mqtt.client as mqtt

from os import getenv
from time import time
from pathlib import Path
from datetime import datetime
from cv2 import VideoWriter, VideoWriter_fourcc, imdecode, waitKey, imshow

from camera_socket import CameraSocket
from db_controller import DBController
from api_and_socket import ApiAndSocket


class MosquittoSocket:
    logger = logging.getLogger('MQTT')

    def __init__(self, ws: ApiAndSocket, cs: CameraSocket, db: DBController):
        self.logger.info('Init...')

        self.client = mqtt.Client(client_id=getenv('MQTT_CLIENT'),
                                  userdata=None,
                                  protocol=mqtt.MQTTv5,
                                  transport="tcp")

        self.client.username_pw_set(getenv('MQTT_USERNAME'), password=getenv('MQTT_PASSWORD'))

        self.client.tls_set(ca_certs=Path(getenv('MQTT_CA_FILE')).resolve(),
                            certfile=Path(getenv('MQTT_CERT_FILE')).resolve(),
                            keyfile=Path(getenv('MQTT_KEY_FILE')).resolve(),
                            tls_version=ssl.PROTOCOL_TLS_CLIENT)

        self.client.tls_insecure_set(True)

        self.ws = ws
        self.cs = cs
        self.db = db

        # General Cache
        self.device_status = self.db.device.get_status()
        self.device_status_ping = self.device_status.copy()
        self.device_sensors = self.db.sensor.get_all_group_by_device()
        self.sensor_values = self.db.sensor.get_values()
        self.triggers = self.db.trigger.get_grouped()

        # Active Cache
        self.active_save_period = {}
        self.active_last_time_save = {}

        # CAM Cache
        self.film = {}
        self.filming_time = {}
        self.camera_frames = {}
        self.video_capture = {}
        self.film_time_in_seconds = 30
        self.frequency_frame_resend = 1 / 30  # second / FPS
        self.last_frames_resend = time()

    def __connect__(self):
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        try:
            self.logger.info(f'Connecting with broker {getenv("MQTT_SERVER")}:{getenv("MQTT_PORT")}.')
            self.client.connect(getenv('MQTT_SERVER'), int(getenv('MQTT_PORT')))

        except OSError as e:
            self.logger.critical(f'Error connecting - {e}')
            exit(0)

    def on_connect(self, client, userdata, flags, reasonCode, properties):
        if reasonCode == 0:
            res = client.subscribe("$SYS/broker/chen_list")
            if res[0] != mqtt.MQTT_ERR_SUCCESS:
                raise RuntimeError("[MQTT] The client is not connected")
            self.logger.info("Connected with broker")

        if reasonCode == 1:
            raise RuntimeError("[MQTT] connection failed: incorrect protocol version")
        if reasonCode == 2:
            raise RuntimeError("[MQTT] connection failed: invalid client identifier")
        if reasonCode == 3:
            raise RuntimeError("[MQTT] connection failed: server unavailable")
        if reasonCode == 4:
            raise RuntimeError("[MQTT] connection failed: bad app_id or access_key")
        if reasonCode == 5:
            raise RuntimeError("[MQTT] connection failed: not authorised")

    def on_disconnect(self, client, userdata, reason_code):
        if reason_code != 0:
            self.logger.info("Unexpected disconnection.")
        else:
            self.logger.info("Disconnected.")

    def publish(self, topic, payload):
        self.logger.debug(f'Emitting to {topic} value -> {payload} ')
        self.client.publish(topic, payload)

    def run(self):
        self.logger.info('Starting...')

        self.__connect__()

        self.client.subscribe('ping/ack', 0)
        self.client.subscribe('+/login', 0)
        self.client.message_callback_add('ping/ack', self.ping_device)
        self.client.message_callback_add('+/login', self.login_device)

        self.active_save_period['PIR-MOVE-01'] = 10
        self.active_last_time_save['PIR-MOVE-01'] = 0
        self.client.subscribe('ESP-01-MOVE/PIR-MOVE-01/value', 0)
        self.client.message_callback_add('ESP-01-MOVE/PIR-MOVE-01/value', self.active_value)

        for sensor in self.db.sensor.get_all():
            self.listen_sensor(sensor['device_id'], sensor['type'], sensor['sensor_id'])

        self.client.loop_start()
        self.logger.info('Loop Start')

    #  ========== PING DEVICES ==========
    def ping_device(self, client, userdata, msg):
        device = msg.payload.decode("utf-8")
        self.logger.debug(f'Pong {device}')
        if device in self.device_status:
            self.device_status[device] = 1

    def check_device_connection(self):
        for device in self.device_status:
            if device not in self.device_status_ping:
                self.device_status_ping[device] = not self.device_status[device]

            if self.device_status_ping[device] != self.device_status[device]:
                for sensor in self.device_sensors[device]:
                    self.ws.emit(f'{sensor}/connStatus', self.device_status[device])
                self.device_status_ping[device] = self.device_status[device]
                self.db.device.update_connection(device_id=device, status=self.device_status[device])
                self.logger.debug(f'Device {device} connected status -> {self.device_status[device]}')

        for key in self.device_status:
            self.device_status[key] = 0

        self.client.publish('ping', 0)

    #  ========== LOGIN ==========

    def listen_sensor(self, device, s_type, sensor):
        self.logger.debug(f'Listening {device}/{sensor}')
        if s_type == 'actuator':
            self.client.subscribe(f'{device}/{sensor}/value', 1)
            self.client.message_callback_add(f'{device}/{sensor}/value', self.actuator_value)
        elif s_type == 'passive':
            self.client.subscribe(f'{device}/{sensor}/value', 1)
            self.client.message_callback_add(f'{device}/{sensor}/value', self.passive_value)
        elif s_type == 'active':
            save_period = self.db.active.get_save_period(sensor)
            if save_period != -1:
                self.active_save_period[sensor] = save_period
                self.active_last_time_save[sensor] = 0
                self.client.subscribe(f'{device}/{sensor}/value', 1)
                self.client.message_callback_add(f'{device}/{sensor}/value', self.active_value)
        elif s_type == 'camera':
            self.film[sensor] = self.db.camera.can_film(sensor)
            self.filming_time[sensor] = 0
            self.camera_frames[sensor] = self.db.camera.get_frames(sensor)
            self.video_capture[sensor] = None
            self.client.subscribe(f'{device}/{sensor}/frame', 0)
            self.client.message_callback_add(f'{device}/{sensor}/frame', self.cam_values)
            self.client.subscribe(f'{device}/{sensor}/move', 1)
            self.client.message_callback_add(f'{device}/{sensor}/move', self.cam_move_detection)

    def login_device(self, client, userdata, msg):
        device = msg.topic.split('/')[0]
        try:
            sensors = json.loads(msg.payload.decode("utf-8"))
        except:
            self.logger.warning(f'Device {device} dont parse appropriated parameters - {msg.payload}.')
        else:
            if self.db.device.exist(device):
                response = {}
                for sensor in sensors:
                    if sensors[sensor] == 'actuator':
                        response[sensor] = self.db.actuator.get_value(sensor)

                    elif sensors[sensor] == 'passive':
                        response[sensor] = self.db.passive.get_initial_config(sensor)

                    elif sensors[sensor] == 'active':
                        response[sensor] = self.db.active.get_take_period(sensor)

                    elif sensors[sensor] == 'camera':
                        response[sensor] = self.db.camera.get_initial_config(sensor)

                    else:
                        self.logger.warning(f'Sensor type {sensors[sensor]} of device {device} dont exist.')
                        return

                self.logger.info(f'Device {device} Logged with parameters {json.dumps(response)}.')
                self.client.publish(device + "/logged", json.dumps(response))

                self.device_status[device] = True
                self.db.device.update_connection(device_id=device, status=1)
                for sensor in sensors:
                    self.ws.emit(f'{sensor}/connStatus', 1)

            else:  # New Device
                self.logger.info(f'Device {device} asking for register with values: {sensors}')
                self.ws.emit('newDevice', {device: sensors})

    def add_new_device(self, device_id, sensors):
        sensors_list = []
        for sensor in sensors:
            self.listen_sensor(device_id, sensor['type'], sensor['sensor_id'])
            sensors_list.append(sensor['sensor_id'])
        self.device_status[device_id] = 1
        self.device_sensors[device_id] = sensors_list

    #  ========== Check Triggering ==========

    def check_trigger(self, sensor, value):
        for trigger in self.triggers:
            if sensor in trigger['trigger_sensors']:
                print(f'have trigger {sensor} - {value}')

                trigger_form = trigger['trigger']
                for t_sensor in trigger['trigger_sensors']:
                    if self.sensor_values[t_sensor] is None:
                        return
                    trigger_form = trigger_form.replace('#', str(self.sensor_values[t_sensor]), 1)

                if eval(trigger_form):
                    if trigger['active']:
                        for action in trigger['actions']:

                            if action['a_type'] == 'actuator':
                                if action['timer'] != 0:
                                    self.publish(f'{action["device_id"]}/{action["action_sensor"]}/timer',
                                                 json.dumps({'state': action["value"], 'timer': action['timer']}))
                                else:
                                    self.publish(f'{action["device_id"]}/{action["action_sensor"]}/set', action["value"])

                            elif action['a_type'] == 'camera':
                                if self.video_capture[sensor] is None:
                                    self.video_capture[sensor] = VideoWriter(
                                        f'videos/{datetime.now().strftime("%A-%d-%B-%Y_%H:%M:%S%p")}.avi',
                                        VideoWriter_fourcc(*"MJPG"), 15, (320, 240))

                                if not self.film[action["action_sensor"]] and self.db.camera.update_film(
                                        action["action_sensor"], 1):
                                    self.film[action["action_sensor"]] = True

                                self.filming_time[sensor] = time() + self.film_time_in_seconds

                                self.publish(f'{action["device_id"]}/{action["action_sensor"]}/DetectMotion', 1)
                                self.publish(f'{action["device_id"]}/{action["action_sensor"]}/FrameRate',
                                             self.camera_frames[action["action_sensor"]]['max_framerate'])

                        if trigger['type_active']:
                            self.db.trigger.update_active(trigger['id'], 0)
                            trigger['active'] = 0

                elif not trigger['active']:
                    self.db.trigger.update_active(trigger['id'], 1)
                    trigger['active'] = 1

    def update_triggers(self):
        self.triggers = self.db.trigger.get_grouped()

    #  ========== ACTUATOR DEVICES ==========

    def actuator_value(self, client, userdata, msg):
        sensor = msg.topic.split('/')[1]
        try:
            value = int(msg.payload)
        except ValueError as e:
            self.logger.warning(f'Actuator send an invalid value - {e}')
            return

        self.ws.emit(f'{sensor}/set', value)

        self.sensor_values[sensor] = value
        self.db.actuator.update_value(sensor, value)

        self.check_trigger(sensor, value)

    #  ========== PASSIVE DEVICES ==========

    def passive_value(self, client, userdata, msg):
        sensor = msg.topic.split('/')[1]
        try:
            value = int(msg.payload)
        except ValueError as e:
            self.logger.warning(f'Passive send an invalid value - {e}')
            return
        self.logger.debug(f'Device {sensor} status -> {value}')

        self.ws.emit(f'{sensor}/set', value)

        self.sensor_values[sensor] = value
        self.db.passive.update_value(sensor, value)

        self.check_trigger(sensor, value)
    #  ========== ACTIVE DEVICES ==========

    def active_value(self, client, userdata, msg):
        sensor = msg.topic.split('/')[1]
        self.logger.warning(msg.payload)
        # try:
        #     value = float(msg.payload)
        # except ValueError as e:
        #     self.logger.warning(f'Active send an invalid value - {msg.payload} - {e}')
        #     return
        #
        # if self.active_last_time_save[sensor] < time():
        #     self.ws.emit(f'{sensor}/add', value)
        #     self.db.active.add_daily_history(sensor, value)
        #     self.logger.debug(f'sensor {sensor} - Add value to daily history : {value}')
        #     self.active_last_time_save[sensor] = time() + self.active_save_period[sensor] * 60
        # else:
        #     self.ws.emit(f'{sensor}/actual', value)
        #
        # self.sensor_values[sensor] = value
        # self.check_trigger(sensor, value)

    #  ========== CAM DEVICES ==========
    def cam_move_detection(self, client, userdata, message):
        device, sensor = message.topic.split('/')[0:2]
        self.logger.info(f'Cam {sensor} detect move {message.payload}')

        if self.film[sensor]:
            if self.video_capture[sensor] is None:
                self.video_capture[sensor] = VideoWriter(
                    f'videos/{datetime.now().strftime("%A-%d-%B-%Y_%H:%M:%S%p")}.avi',
                    VideoWriter_fourcc(*"MJPG"), 15, (320, 240))

            self.filming_time[sensor] = time() + self.film_time_in_seconds
            client.publish(f'{device}/{sensor}/FrameRate', self.camera_frames[sensor]['max_framerate'])

        self.sensor_values[sensor] = 1
        self.check_trigger(sensor, 1)

    def cam_values(self, client, userdata, message):
        device, sensor, _ = message.topic.split('/')

        if time() - self.last_frames_resend > self.frequency_frame_resend:
            self.cs.emit(device + '/' + sensor + '/frame', message.payload)
            self.last_frames_resend = time()

        if self.film[sensor]:
            try:
                if self.filming_time[sensor] > time():
                    jpg_as_np = np.frombuffer(message.payload, dtype=np.uint8)
                    img = imdecode(jpg_as_np, flags=1)
                    self.video_capture[sensor].write(img)
                    # imshow(sensor, img)
                    # waitKey(10)
                elif self.filming_time[sensor] != 0:
                    client.publish(f'{device}/{sensor}/FrameRate', self.camera_frames[sensor]['min_framerate'])
                    self.filming_time[sensor] = 0
                    self.video_capture[sensor].release()
                    del self.video_capture[sensor]
                    self.video_capture[sensor] = None

                    self.sensor_values[sensor] = 0
                    self.check_trigger(sensor, 0)

            except Exception as e:
                self.logger.warning(f'saving video - {e}')
