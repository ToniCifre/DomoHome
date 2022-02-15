from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row

class Scheduler:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):
        
        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add(self, sensor_id, every, interval, at, value):
        schedule_id = None
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO scheduler (sensor_id, every, interval, at, value) VALUES (?,?,?,?,?)",
                           (sensor_id, every, interval, at, value))
            cursor.execute("commit")
            schedule_id = cursor.lastrowid
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert scheduler with value {(sensor_id, every, interval, at, value)}  - {e}')
        cursor.close()
        return schedule_id

    def update(self, sensor_id, every, interval, at, value):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE room SET every=?, interval=?, at=?, value=? WHERE sensor_id=?",
                           (every, interval, at, value, sensor_id))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t update scheduler with value {(every, interval, at, value, sensor_id)}  - {e}')
        cursor.close()

    def get_all(self):
        query = self._select_cursor.execute("select * from scheduler").fetchall()
        return [dict(res) for res in query]

    def get_all_from_sensor(self, sensor_id):
        query = self._select_cursor.execute("select * from scheduler where sensor_id=?", (sensor_id,)).fetchall()
        return [dict(res) for res in query]
