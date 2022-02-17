from time import time
from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Active:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add_history(self, sensor_id, max_values, min_value, avg_value, samples, date):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO active_history VALUES (?,?,?,?,?,?)",
                           (sensor_id, max_values, min_value, avg_value, samples, date))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t insert active history with values '
                              f'{(sensor_id, max_values, min_value, avg_value, samples, date)} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def add_definition(self, definition, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO active_definition VALUES (?,?)", (definition, icon))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t insert active definition with values {(definition, icon)}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def add_daily_history(self, sensor_id, value):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            now = int(time())
            cursor.execute("INSERT INTO active_daily_history VALUES (?,?,?)", (sensor_id, value, now))

            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t insert active daily history with values {(sensor_id, value)} - {e}')
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

    def update_history(self, sensor_id, max_values, min_value, avg_value, samples, date):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("""UPDATE active_history SET max=max(max,?), min=min(min,?), 
                                                        mean=(mean*samples+?)/(samples+?), samples=samples+?
                                    WHERE sensor_id=? and date=?;""",
                           (max_values, min_value, avg_value*samples, samples, samples, sensor_id, date))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update active history with values '
                              f'{(sensor_id, max_values, min_value, avg_value, samples, date)} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def update_definition(self, definition, name, icon):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE active_definition SET definition=?, icon=? WHERE definition=?",
                           (name, icon, definition))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update active definition with values {(definition, name, icon)}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def delete_daily_history(self, sensor_id, date):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("""
                   DELETE FROM active_daily_history WHERE sensor_id=? and date < ?;
                   """, (sensor_id, date))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t delete active_daily_history of sensor {sensor_id} in {date} - {e}')
        cursor.close()

    def delete_definition(self, definition):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM active_definition WHERE definition=?", (definition,))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t delete active definition with values {definition}  - {e}')
            cursor.execute("rollback")
        cursor.close()

    def generate_history(self):
        date = time() - 24 * 60 * 60
        query = self._select_cursor.execute("""
            select sensor_id, date(date,'unixepoch','localtime' ) as string_date,
                max(value) as max, min(value) as min, avg(value) as mean, count(*) as samples
                from active_daily_history
                    where date < ?
                    group by sensor_id, date(date,'unixepoch','localtime' );
        """, (date,)).fetchall()

        res = [dict(a) for a in query]
        for r in res:
            history = self._select_cursor.execute("select * from active_history where sensor_id=? and date=?;",
                                                  (r['sensor_id'], r['string_date'])).fetchone()
            if history:
                self.update_history(r['sensor_id'], r['max'], r['min'], r['mean'], r['samples'], r['string_date'])
            else:
                self.add_history(r['sensor_id'], r['max'], r['min'], r['mean'], r['samples'], r['string_date'])

            self.delete_daily_history(r['sensor_id'], date)

    def get_take_period(self, active_id):
        query = self._select_cursor.execute("select take_period from active where sensor_id=?",
                                            (active_id,)).fetchone()
        if query:
            return query['take_period']
        else:
            return None

    def get_save_period(self, sensor_id):
        query = self._select_cursor.execute("select save_period from active where sensor_id ==?;",
                                            (sensor_id,)).fetchone()
        res = -1
        if query:
            res = query['save_period']
        return res

    def get_info(self):
        query = self._select_cursor.execute("""
                select * from active
                    LEFT JOIN active_definition using(definition)
                    LEFT JOIN sensor using(sensor_id);
            """).fetchall()
        return [dict(active) for active in query]

    def get_definition(self):
        query = self._select_cursor.execute("select * from active_definition;").fetchall()
        return [dict(d) for d in query]
