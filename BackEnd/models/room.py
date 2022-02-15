from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Room:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):
        
        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    # ===== ROOM =====
    def add(self, room):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO room VALUES (?)", (room,))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert room with value {room}  - {e}')
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

    def delete(self, room):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM room where name=?;", (room,))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t delete room {room} - {e}')
            status = False
        cursor.close()
        return status

    def get_all(self):
        query = self._select_cursor.execute("select name from room").fetchall()
        return [room[0] for room in query]

    def get(self, room_id):
        query = self._select_cursor.execute("select name from room where name=?", (room_id,)).fetchall()
        return [room[0] for room in query]
