from itertools import groupby
from logging import Logger
from operator import itemgetter
from sqlite3 import Connection, Cursor, Error, Row
from time import time

from models.device import Device


class OrderError(Exception):
    pass


class Sensor:
    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor, device: Device):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

        self.device = device

    def update(self, sensor: dict):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE sensor SET name=?, room=? WHERE sensor_id=?;",
                           (sensor["name"], sensor["room"], sensor["sensor_id"]))
            if sensor['type'] == 'actuator':
                cursor.execute("UPDATE actuator SET definition=? WHERE sensor_id=?",
                               (sensor["definition"], sensor["sensor_id"]))
            if sensor['type'] == 'passive':
                cursor.execute("UPDATE passive SET definition=?, change_period=? WHERE sensor_id=?",
                               (sensor["definition"], sensor["change_period"], sensor["sensor_id"]))
            elif sensor['type'] == 'active':
                cursor.execute("UPDATE active SET save_period=?, take_period=?, definition=? WHERE sensor_id==?;",
                               (sensor["save_period"], sensor["take_period"],
                                sensor["definition"], sensor["sensor_id"]))
            elif sensor['type'] == 'camera':
                cursor.execute("UPDATE camera SET film=?, min_framerate=?, max_framerate=? WHERE sensor_id==?;",
                               (sensor["film"], sensor["min_framerate"], sensor["max_framerate"], sensor["sensor_id"]))

            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t update sensor with values {sensor} - {e}')
            status = False
        cursor.close()
        return status

    def delete(self, sensor_id):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            sensor = self.get(sensor_id)
            cursor.execute("DELETE FROM sensor where sensor_id=?;", (sensor_id,))
            cursor.execute("commit")

            query = self._select_cursor.execute("select * from sensor where device_id=?;"
                                                , (sensor['device_id'],)).fetchone()
            if not query:
                self.device.delete(sensor['device_id'])

        except Error as e:
            cursor.execute("rollback")
            status = False
            self.logger.error(f'Can\'t sensor device {sensor_id} - {e}')
        cursor.close()
        return status

    def get_all(self):
        query = self._select_cursor.execute("select * from sensor").fetchall()
        return [dict(sensor) for sensor in query]

    def get(self, sensor_id):
        query = self._select_cursor.execute("select * from sensor where sensor_id=?", (sensor_id,)).fetchone()
        if query:
            return dict(query)
        else:
            return None

    def get_values(self):
        query = self._select_cursor.execute("""
            select sensor_id, value from sensor
                INNER join (
                    select sensor_id, value from actuator union
                    select sensor_id, value from passive union
                    select sensor_id, 0 from camera union
                    select sensor_id, null from active
                ) using (sensor_id)
            """).fetchall()
        return {res['sensor_id']: res['value'] for res in [dict(x) for x in query]}

    def get_all_group_by_device(self):
        query = self._select_cursor.execute("select * from sensor;").fetchall()
        res = {}
        if query:
            for group, items in groupby(query, itemgetter('device_id')):
                res[group] = []
                for item in items:
                    res[group].append(item['sensor_id'])

        return res

    def get_all_group_by_type(self):
        query = self._select_cursor.execute("select * from sensor order by type;").fetchall()
        sensors = [dict(x) for x in query]
        return {k: list(v) for k, v in groupby(sensors, itemgetter('type'))}

    def __get_active_daily_history(self, user):
        query = self._select_cursor.execute("""
                        select * from active_daily_history JOIN(
                            select sensor_id from user_sensor where user_id==? and show
                        )using(sensor_id) order by sensor_id, date;
            """, (user,)).fetchall()
        day_history = {}
        for k, v in groupby(query, itemgetter('sensor_id')):
            day_history[k] = []
            for e in v:
                s = dict(e)
                del s['sensor_id']
                day_history[k].append(s)

        return day_history

    def __get_passive_daily_history(self, user):
        query = self._select_cursor.execute("""
                    select * from passive_history JOIN(
                        select sensor_id from user_sensor where user_id==? and show
                    )using(sensor_id)
                    where date > ?
                    order by sensor_id, date;
            """, (user, int(time()) - 60 * 60 * 24)).fetchall()
        day_history = {}
        for k, v in groupby(query, itemgetter('sensor_id')):
            day_history[k] = []
            for e in v:
                s = dict(e)
                del s['sensor_id']
                day_history[k].append(s)

        return day_history

    def __get_user_sensors_values(self, user, order='room'):
        if order != 'room' and order != 'type' and order != 'device_id':
            raise OrderError(f'Value for sensors order - {order} - not is valid.')
        query = self._select_cursor.execute("""
                select * from sensor
                    INNER JOIN ( select sensor_id from user_sensor where user_id==? and show) using(sensor_id)
                    INNER JOIN device using(device_id)
                    LEFT JOIN (
                        select sensor_id, definition, value, icon from actuator INNER JOIN actuator_definition using(definition)
                        union
                        select sensor_id, definition, value, icon from passive INNER JOIN passive_definition using(definition)
                        union
                        select sensor_id, definition, null, icon from active INNER JOIN active_definition using(definition)
                    )using(sensor_id)
                order by {}, name
            """.format(order), (user,)).fetchall()
        sensors = [dict(x) for x in query]
        if sensors:
            active_day_history = self.__get_active_daily_history(user)
            passive_day_history = self.__get_passive_daily_history(user)
            for sensor in sensors:
                if sensor['type'] == 'active' and sensor['sensor_id'] in active_day_history:
                    sensor['value'] = active_day_history[sensor['sensor_id']]
                elif sensor['type'] == 'passive' and sensor['sensor_id'] in passive_day_history:
                    sensor['value'] = passive_day_history[sensor['sensor_id']]

        return sensors

    def get_all_values_by_user_group_by(self, user, group):
        sensors = self.__get_user_sensors_values(user, group)

        return {k: list(v) for k, v in groupby(sensors, itemgetter(group))}

    def get_all_show_group_by(self, user, group):
        if group != 'room' and group != 'type' and group != 'device_id':
            raise OrderError(f'Value for sensors order - {group} - not is valid.')
        query = self._select_cursor.execute("""
                select * from sensor
                    INNER JOIN ( select sensor_id, show from user_sensor where user_id==? ) using(sensor_id)
                    LEFT JOIN (
                        select sensor_id, definition, icon from actuator INNER join actuator_definition using(definition)
                        union select sensor_id, definition, icon from passive INNER JOIN passive_definition using(definition)
                        union select sensor_id, definition, icon from active INNER JOIN active_definition using(definition)
                    )using(sensor_id)
                order by {}, sensor_id;
            """.format(group), (user,)).fetchall()

        return {k: list(v) for k, v in groupby([dict(x) for x in query], itemgetter(group))}

    def __get_sensors_users(self, user, order='room'):
        if order != 'room' and order != 'type' and order != 'device_id':
            raise OrderError(f'Value for sensors order - {order} - not is valid.')
        query = self._select_cursor.execute("""
                select sensor.*, ac.icon,IFNULL(inUser, 0) as inUser from sensor
                    LEFT JOIN (select sensor_id, 1 as inUser from user_sensor where user_id==?) using(sensor_id)
                    LEFT JOIN (
                        select sensor_id, icon from actuator INNER JOIN actuator_definition using(definition)
                        union
                        select sensor_id, icon from active INNER JOIN active_definition using(definition)
                    ) as ac using(sensor_id)
                order by {}, sensor_id;
            """.format(order), (user,)).fetchall()
        return [dict(x) for x in query]

    def get_all_by_users_group_by(self, user, group):
        sensors = self.__get_sensors_users(user, group)

        return {k: list(v) for k, v in groupby(sensors, itemgetter(group))}

    def exist(self, sensor_id):
        if self._conn.execute("select 1 from sensor where sensor_id=?;", (sensor_id,)).fetchone():
            return True
        return False
