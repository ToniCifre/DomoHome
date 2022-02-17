from time import time
from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Actuator:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add_definition(self, definition, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO actuator_definition VALUES (?,?)", (definition, icon))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t insert actuator definition with values {(definition, icon)} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def update(self, room, new_room):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE room SET name=? WHERE name=?", (new_room, room))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t upfate room {room} with value {new_room}  - {e}')
        cursor.close()

    def update_value(self, sensor_id, value):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute(f"UPDATE actuator SET value = ? WHERE sensor_id = ?", (value, sensor_id))
            cursor.execute("commit")

            cursor.execute("begin")
            now = int(time())
            try:
                cursor.execute("INSERT INTO actuator_history VALUES (?,?,?)", (sensor_id, value, now))
                cursor.execute("commit")
            except Error as e:
                self.logger.error(f'Actuator {sensor_id}, cant insert history to {(sensor_id, value, now)} - {e}')
                cursor.execute("rollback")

        except Error as e:
            self.logger.error(f'Actuator {sensor_id}, cant update value to {value} - {e}')
            cursor.execute("rollback")

        cursor.close()

    def update_definition(self, definition, name, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE actuator_definition SET definition=?, icon=? WHERE definition=?",
                           (name, icon, definition))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update active definition with values {(definition, name, icon)}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def delete_definition(self, definition):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM actuator_definition WHERE definition=?", (definition,))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t delete active definition with values {definition}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def get_value(self, actuator_id):
        query = self._select_cursor.execute("select value from actuator where sensor_id=?",
                                            (actuator_id,)).fetchone()
        if query:
            return query['value']
        else:
            return None

    def get_all_info(self):
        query = self._select_cursor.execute("""
                select * from actuator
                    INNER JOIN actuator_definition using(definition)
                    INNER JOIN sensor using(sensor_id);
            """).fetchall()
        return [dict(actuator) for actuator in query]

    def get_definition(self):
        query = self._select_cursor.execute("select * from actuator_definition;").fetchall()
        return [dict(d) for d in query]
