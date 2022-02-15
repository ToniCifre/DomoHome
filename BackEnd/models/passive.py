from time import time
from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Passive:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add_definition(self, definition, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO passive_definition VALUES (?,?)", (definition, icon))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t insert passive definition with values {(definition, icon)} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def update_value(self, sensor_id, value):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute(f"UPDATE passive SET value = ? WHERE sensor_id = ?", (value, sensor_id))
            cursor.execute("commit")

            cursor.execute("begin")
            now = int(time())
            try:
                cursor.execute("INSERT INTO passive_history VALUES (?,?,?)", (sensor_id, value, now))
                cursor.execute("commit")
            except Error as e:
                self.logger.error(f'Passive {sensor_id}, cant insert history to {(sensor_id, value, now)} - {e}')
                cursor.execute("rollback")

        except Error as e:
            self.logger.error(f'passive {sensor_id}, cant update value to {value} - {e}')
            cursor.execute("rollback")

        cursor.close()

    def update_definition(self, definition, name, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE passive_definition SET definition=?, icon=? WHERE definition=?",
                           (name, icon, definition))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update passive definition with values {(definition, name, icon)}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def delete_definition(self, definition):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM passive_definition WHERE definition=?", (definition,))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t delete passive definition with values {definition}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def get_value(self, passive_id):
        query = self._select_cursor.execute("select value from passive where sensor_id=?", (passive_id,)).fetchone()
        if query:
            return query['value']
        return None

    def get_initial_config(self, active_id):
        query = self._select_cursor.execute("select value, change_period from passive where sensor_id=?",
                                            (active_id,)).fetchone()
        if query:
            return dict(query)
        return None

    def get_all_info(self):
        query = self._select_cursor.execute("""
                select * from passive
                    INNER JOIN passive_definition using(definition)
                    INNER JOIN sensor using(sensor_id);
            """).fetchall()
        return [dict(passive) for passive in query]

    def get_definition(self):
        query = self._select_cursor.execute("select * from passive_definition;").fetchall()
        return [dict(d) for d in query]
