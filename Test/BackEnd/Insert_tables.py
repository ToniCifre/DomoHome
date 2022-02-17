import random
import sqlite3
from datetime import datetime
from pathlib import Path

from db_controller import DBController

db_file = 'Test.db'

db = DBController(db_file)

db.user.add('root', 'toor', 0)
db.user.add('test', 'test', 1)

db.home.add('MyHome')

db.room.add('Sala')
db.room.add('Habitacio')
db.room.add('Banyo')

# ======================================================

db.actuator.add_definition('Llum', 'lightbulb')
db.actuator.add_definition('Led', 'flourescent')
db.actuator.add_definition('Power', 'power')
db.actuator.add_definition('Extractor', 'air')

db.device.add_device_with_sensors('dev1',
     [
         {"sensor_id": 'l1', "type": "actuator", "name": 'led1', "show": 1, "room": 'Sala', "definition": 'Led'},
         {"sensor_id": 'l2', "type": "actuator", "name": 'led2', "show": 1, "room": 'Sala', "definition": 'Led'},
         {"sensor_id": 'l3', "type": "actuator", "name": 'llum1', "show": 1, "room": 'Sala', "definition": 'Llum'},
         {"sensor_id": 'tv1', "type": "actuator", "name": 'TV-plug', "show": 1, "room": 'Sala', "definition": 'Power'}
     ],
     'root'
     )
db.device.add_device_with_sensors('dev2',
     [
         {"sensor_id": 'l5', "type": "actuator", "name": 'led', "show": 1, "room": 'Habitacio', "definition": 'Led'},
         {"sensor_id": 'l6', "type": "actuator", "name": 'llum', "show": 1, "room": 'Habitacio', "definition": 'Llum'}
     ],
     'root'
     )
db.device.add_device_with_sensors('dev3',
     [
         {"sensor_id": 'l7', "type": "actuator", "name": 'led1', "show": 1, "room": 'Banyo', "definition": 'Led'},
         {"sensor_id": 'e1', "type": "actuator", "name": 'extractor', "show": 1, "room": 'Banyo', "definition": 'Extractor'},
     ],
     'root'
     )
db.user.add_sensor('test', 'l1', 1)
db.user.add_sensor('test', 'l2', 1)
db.user.add_sensor('test', 'l7', 1)

# ======================================================

db.passive.add_definition('Porta', 'meeting_room')
db.passive.add_definition('Finestra', 'meeting_room')
db.passive.add_definition('PIR', 'sensors')

db.device.add_device_with_sensors('dev4',
     [
         {"sensor_id": 'p1', "type": "passive", "name": 'Porta', "show": 1, "room": 'Sala', "definition": 'Porta', 'change_period':30},
         {"sensor_id": 'p2', "type": "passive", "name": 'Finestra', "show": 1, "room": 'Sala', "definition": 'Finestra', 'change_period':30},
         {"sensor_id": 'p3', "type": "passive", "name": 'PIR', "show": 1, "room": 'Sala', "definition": 'PIR', 'change_period':30},
     ],
     'root'
     )
db.user.add_sensor('test', 'p1', 1)
db.user.add_sensor('test', 'p2', 1)
# ======================================================

db.active.add_definition('%', 'water_damage')
db.active.add_definition('Cº', 'thermostat')

db.device.add_device_with_sensors('dev5',
     [
         {"sensor_id": 't1', "type": "active", "name": 'Temp', "show": 1, "room": 'Sala', "definition": 'Cº','take_period': 5, 'save_period': 3},
         {"sensor_id": 'h1', "type": "active", "name": 'Humi', "show": 1, "room": 'Sala', "definition": '%','take_period': 5, 'save_period': 3}
     ],
     'root'
     )
db.device.add_device_with_sensors('dev6',
     [
         {"sensor_id": 'h2', "type": "active", "name": 'Humi', "show": 1, "room": 'Banyo', "definition": '%','take_period': 5, 'save_period': 3}
     ],
     'root'
     )
db.user.add_sensor('test', 't1', 1)
db.user.add_sensor('test', 'h1', 1)
# ======================================================

db.device.add_device_with_sensors('dev7',
                                  [
{"sensor_id": f'c1', "type": "camera", "name": 'cam', "show": 0, "room": 'Sala', 'film': 0, 'min_framerate': 10, 'max_framerate': 15},
{"sensor_id": f'c2', "type": "camera", "name": 'cam', "show": 0, "room": 'Sala', 'film': 0, 'min_framerate': 10, 'max_framerate': 15},
{"sensor_id": f'c3', "type": "camera", "name": 'cam', "show": 0, "room": 'Habitacio', 'film': 0, 'min_framerate': 10, 'max_framerate': 15}
                                  ]
                                  , 'root')
db.user.add_sensor('test', 'c1', 1)
# ======================================================
conn = sqlite3.connect(Path(db_file).resolve(), isolation_level=None, uri=True)
cursor = conn.cursor()


now = int(datetime.now().replace(second=0).timestamp())

time = now - (1 * 60 * 60 * 24*30)
status = [True, False, True]
while time < now:
    if random.random() < 0.1:
        sensor = random.randint(1, 3)
        status[sensor-1] = not status[sensor-1]
        cursor.execute("INSERT INTO passive_history VALUES (?,?,?)", (f'p{sensor}', status[sensor-1], time))

    time += 5 * 60


# ======================================================

time = now - (1 * 60 * 60 * 24)
t = 15
h = 50
h2 = 80
while time < now:
    t += random.uniform(-1, 1.1)
    h += random.uniform(-1, 1.1)
    h2 += random.uniform(-1, 1.1)
    cursor.execute("INSERT INTO active_daily_history (sensor_id, value, date) VALUES (?,?,?)",
                   ('t1', round(t, 2), time))
    cursor.execute("INSERT INTO active_daily_history (sensor_id, value, date) VALUES (?,?,?)",
                   ('h1', round(h, 2), time))
    cursor.execute("INSERT INTO active_daily_history (sensor_id, value, date) VALUES (?,?,?)",
                   ('h2', round(h2, 2), time))
    time += 5 * 60

cursor.close()

