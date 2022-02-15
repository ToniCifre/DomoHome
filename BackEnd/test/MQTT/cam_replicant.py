import base64
import ssl

import paho.mqtt.client as mqtt
from cv2 import cv2
from os import getenv
from time import sleep
from dotenv import load_dotenv
import random

load_dotenv()


def on_connect(client, userdata, flags, rc, properties):
    if rc == 0:
        res = client.subscribe("$SYS/broker/chen_list")
        if res[0] != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError("the client is not connected")
        print("[MQTT] Connected with broker")
    else:
        raise RuntimeError(f'connection failed: rc code = {rc}')

def on_disconnect(self, userdata, reason_code):
    if reason_code != 0:
        print(f"Unexpected disconnection.{reason_code}")
    else:
        print("Disconnected.")


print('[Mosquitto] starting...')
client = mqtt.Client(client_id='Camera_Replicant',  userdata=None, protocol=mqtt.MQTTv5,
                     transport="tcp")
client.username_pw_set(getenv('MQTT_USERNAME'), password=getenv('MQTT_PASSWORD'))

client.tls_set(ca_certs='../../certs/mqtt/ca.crt',
               certfile='../../certs/mqtt/client.crt',
               keyfile='../../certs/mqtt/client.key')
client.tls_insecure_set(True)

client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.connect(getenv('MQTT_SERVER'), int(getenv('MQTT_PORT')))
print('[Mosquitto] Conected...')

client.loop_start()

print('start')

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit()

n_cams = 15
fps = 12.5
l = list(range(15, 30))
while 1:
    ret, frame = cap.read()
    frame = cv2.resize(frame, (320, 240))
    _, buffer_img = cv2.imencode('.jpg', frame)
    b = buffer_img.tobytes()
    for i in l:
        client.publish(f'dev4/c{i}/frame', b, 0)
        sleep((1/fps)/n_cams)

print('[Mosquitto] End...')
