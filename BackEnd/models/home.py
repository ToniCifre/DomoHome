from time import time
from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Home:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add(self, name):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO home (name) VALUES (?)", (name,))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert new Home - {e}')
        cursor.close()

    def update_status(self, home, status):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE home SET status=? WHERE id=?;",
                           (status, home))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Can\'t update Home status to {status} - {e}')
            cursor.execute("rollback")
        cursor.close()

    def delete(self, home):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM home WHERE id=?;", (home,))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t delete Home {home} - {e}')
        cursor.close()

    def get(self, home):
        query = self._select_cursor.execute("select * from home where id ==?;", (home,)).fetchone()
        if query:
            return dict(query)
        return None

    def get_status(self, home):
        query = self._select_cursor.execute("select status from home where id ==?;", (home,)).fetchone()
        if query:
            return query['status']
        return None

    def get_all(self):
        query = self._select_cursor.execute("select * from home").fetchall()
        return [dict(home) for home in query]
