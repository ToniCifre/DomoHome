import logging
import sqlite3

from pathlib import Path

from db_table import sql_create_tables

from models.home import Home
from models.user import User
from models.room import Room
from models.device import Device
from models.sensor import Sensor
from models.actuator import Actuator
from models.passive import Passive
from models.active import Active
from models.camera import Camera
from models.scheduler import Scheduler
from models.trigger import Trigger


class DBController:

    def __init__(self, db_file):
        logger = logging.getLogger('DB')

        try:
            db_file_exist = Path(Path(db_file).resolve()).is_file()
            conn = sqlite3.connect(Path(db_file).resolve(), isolation_level=None, uri=True)

        except Exception as e:
            logger.critical(f"Error creating DB connection. {e}")
            exit(0)
        else:
            logger.info("Connected.")

            conn.execute("PRAGMA foreign_keys = 1;")
            conn.execute("PRAGMA cache_size = -16000;")
            conn.execute("PRAGMA threads = 2;")

            aux_cursor = conn.cursor()
            aux_cursor.executescript(sql_create_tables)
            aux_cursor.close()

            select_cursor = conn.cursor()
            select_cursor.row_factory = sqlite3.Row

            self.home = Home(conn=conn, logger=logger, select_cursor=select_cursor)
            self.user = User(conn=conn, logger=logger, select_cursor=select_cursor)
            self.room = Room(conn=conn, logger=logger, select_cursor=select_cursor)
            self.device = Device(conn=conn, logger=logger, select_cursor=select_cursor)
            self.sensor = Sensor(conn=conn, logger=logger, select_cursor=select_cursor, device=self.device)
            self.actuator = Actuator(conn=conn, logger=logger, select_cursor=select_cursor)
            self.passive = Passive(conn=conn, logger=logger, select_cursor=select_cursor)
            self.active = Active(conn=conn, logger=logger, select_cursor=select_cursor)
            self.camera = Camera(conn=conn, logger=logger, select_cursor=select_cursor)
            self.trigger = Trigger(conn=conn, logger=logger, select_cursor=select_cursor)
            self.scheduler = Scheduler(conn=conn, logger=logger, select_cursor=select_cursor)

            if not db_file_exist:
                logger.info("Initial insert.")
                self.initial_inserts()

    def initial_inserts(self):
        self.user.add('admin', 'admin', 0)

        self.home.add('MyHome')

        self.room.add('Sala')
        self.room.add('Habitacio')
        self.room.add('Banyo')

        self.actuator.add_definition('Llum', 'lightbulb')
        self.actuator.add_definition('Led', 'flourescent')
        self.actuator.add_definition('Endoll', 'power')

        self.passive.add_definition('Porta', 'meeting_room')
        self.passive.add_definition('Finestra', 'sensor_window')
        self.passive.add_definition('PIR', 'sensors')

        self.active.add_definition('%', 'water_damage')
        self.active.add_definition('Cº', 'thermostat')




class OrderError(Exception):
    pass


# d = DBController('Test.db')
# device_status = d.device.get_status()
# device_sensors = d.sensor.get_all_group_by_device()
# sensor_values = d.sensor.get_values()
# triggers = d.trigger.get_grouped()
#
# print(device_status)
# print(device_sensors)
# print(sensor_values)
# print(triggers)
#
# triggers = d.trigger.get_grouped()
# for trigger in triggers:
#     print(trigger)

# print(d.trigger.get_grouped())
# print(d.camera.get_frame_rates('c'))
# print(d.generate_active_history())
# print(d.generate_active_history())
# print(d.get_camera_frames('c1'))
# d.toni()
# print(d.user.get_names())
# print(d.get_sensors_values_group_by_room('Toni'))
# print(d.get_sensors_values_group_by_type('Toni'))
# print(d.get_camera_device_value('dev4'))
# print(d.active.get_save_period('t1'))
# print(d.device.exist('ddev1'))
# print(d.sensor.exist('lamp1'))
# print(d.get_sensors_type_info())
# print(d.get_sensors_id())
# print(d.get_sensors_by_device())
# print(d.get_sensors_values_group_by_room())
# print(d.get_status())
# print(d.get_actuator_device_value('dev2'))
# converted_list = d.get_active_device_value('dev2')
# for key in converted_list:
#     print(key+':'+str(converted_list[key])+';')
# print(str(converted_list))
