from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Device:
    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add_device_with_sensors(self, device_id: str, sensors: list, user: str):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO device (device_id) VALUES (?)", (device_id,))
            for sensor in sensors:
                cursor.execute("INSERT INTO sensor VALUES (?,?,?,?,?)",
                               (sensor["sensor_id"], sensor["name"], sensor['type'], device_id, sensor["room"]))
                if sensor['type'] == 'actuator':
                    cursor.execute("INSERT INTO actuator VALUES (?,?,?)",
                                   (sensor["sensor_id"], 0, sensor["definition"]))
                if sensor['type'] == 'passive':
                    cursor.execute("INSERT INTO passive VALUES (?,?,?,?)",
                                   (sensor["sensor_id"], 0, sensor["change_period"], sensor["definition"]))
                elif sensor['type'] == 'active':
                    cursor.execute("INSERT INTO active VALUES (?,?,?,?)", (
                        sensor["sensor_id"], sensor["save_period"], sensor["take_period"], sensor["definition"]))
                elif sensor['type'] == 'camera':
                    cursor.execute("INSERT INTO camera VALUES (?,?,?,?)", (
                        sensor["sensor_id"], sensor["film"], sensor["min_framerate"], sensor["max_framerate"]))

                cursor.execute("INSERT INTO user_sensor VALUES (?,?,?)", (user, sensor["sensor_id"], sensor["show"]))

            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert device {device_id} and sensors with values '
                              f'{sensors} to user {user} - {e}')
            status = False
        cursor.close()
        return status

    def update_connection(self, device_id, status):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE device SET connect = ? WHERE device_id = ?", (status, device_id))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update device connection status with values {(status, device_id)} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def delete(self, device_id):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM device where device_id=?;", (device_id,))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            status = False
            self.logger.error(f'Can\'t delete device {device_id} - {e}')
        cursor.close()
        return status

    def get_all(self):
        query = self._select_cursor.execute("select * from device").fetchall()
        return [room[0] for room in query]

    def get(self, device_id):
        query = self._select_cursor.execute("select * from device where device_id=?", (device_id,)).fetchone()
        if query:
            return dict(query)
        else:
            return None

    def get_status(self):
        query = self._select_cursor.execute("select device_id, connect from device;").fetchall()
        return {r['device_id']: r['connect'] for r in query}

    def exist(self, device_id):
        if self._conn.execute("select 1 from device where device_id=?;", (device_id,)).fetchone():
            return True
        return False