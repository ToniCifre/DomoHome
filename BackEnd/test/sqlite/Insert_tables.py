import random
import sqlite3
from datetime import datetime
from pathlib import Path

from db_controller import DBController

db_file = '../../Test.db'

db = DBController(db_file)

db.user.add('Toni', 'Cifre', 0)
db.user.add('Alex', 'Rios', 1)
db.user.add('Miquel', 'Gustran', 0)

db.home.add('MyHome')

db.room.add('Sala')
db.room.add('Habitacio')
db.room.add('Banyo')

# ======================================================

db.actuator.add_definition('Llum', 'lightbulb')
db.actuator.add_definition('Led', 'flourescent')

db.device.add_device_with_sensors('dev1',
     [
         {"sensor_id": 'l1', "type": "actuator", "name": 'led1', "show": 1, "room": 'Sala', "definition": 'Led'},
         {"sensor_id": 'l2', "type": "actuator", "name": 'led2', "show": 1, "room": 'Sala', "definition": 'Led'},
         {"sensor_id": 'l3', "type": "actuator", "name": 'llum1', "show": 1, "room": 'Sala',"definition": 'Llum'},
         {"sensor_id": 'l4', "type": "actuator", "name": 'llum2', "show": 1, "room": 'Sala',"definition": 'Llum'}
     ],
     'Toni'
     )
db.user.add_sensor('Miquel', 'l1', 1)
db.user.add_sensor('Miquel', 'l2', 1)

# ======================================================

db.passive.add_definition('Porta', 'meeting_room')
db.passive.add_definition('Finestra', 'meeting_room')
db.passive.add_definition('PIR', 'sensors')

db.device.add_device_with_sensors('dev2',
     [
         {"sensor_id": 'p1', "type": "passive", "name": 'Porta', "show": 1, "room": 'Sala', "definition": 'Porta', 'change_period':30},
         {"sensor_id": 'p2', "type": "passive", "name": 'Finestra', "show": 1, "room": 'Sala', "definition": 'Finestra', 'change_period':30},
         {"sensor_id": 'p3', "type": "passive", "name": 'PIR', "show": 1, "room": 'Sala', "definition": 'PIR', 'change_period':30},
     ],
     'Toni'
     )
# ======================================================

db.active.add_definition('%', 'water_damage')
db.active.add_definition('Cº', 'thermostat')

db.device.add_device_with_sensors('dev3',
     [
         {"sensor_id": 't1', "type": "active", "name": 'Temp', "show": 1, "room": 'Sala', "definition": 'Cº','take_period': 5, 'save_period': 3},
         {"sensor_id": 'h1', "type": "active", "name": 'Humi', "show": 1, "room": 'Sala', "definition": '%','take_period': 5, 'save_period': 3}
     ],
     'Toni'
     )
# ======================================================

sensors = [
    {"sensor_id": f'c{i}', "type": "camera", "name": 'cam', "show": 0, "room": 'Banyo', 'film': 0, 'min_framerate': 10, 'max_framerate': 15}
        for i in range(30)]
db.device.add_device_with_sensors('dev4', sensors, 'Toni')

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
t = 10
h = 10
while time < now:
    t += random.uniform(-1, 1.1)
    h += random.uniform(-1, 1.1)
    cursor.execute("INSERT INTO active_daily_history (sensor_id, value, date) VALUES (?,?,?)",
                   ('t1', round(t, 2), time))
    cursor.execute("INSERT INTO active_daily_history (sensor_id, value, date) VALUES (?,?,?)",
                   ('h1', round(h, 2), time))
    time += 5 * 60

cursor.close()

