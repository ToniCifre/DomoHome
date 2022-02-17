from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row


class Camera:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def update_film(self, camera, film):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE camera SET film=? WHERE sensor_id==?;", (film, camera))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t update film camera {camera} - {e}')
            status = False
        cursor.close()
        return status

    def get_initial_config(self, camera_id):
        query = self._select_cursor.execute("select film, min_framerate from camera where sensor_id=?",
                                            (camera_id,)).fetchone()
        if query:
            return dict(query)
        return None

    def get_frames(self, sensor_id):
        query = self._select_cursor.execute("select * from camera where sensor_id = ?;", (sensor_id,)).fetchone()
        if query:
            return {'min_framerate': query['min_framerate'], 'max_framerate': query['max_framerate']}
        return {}

    def get_info(self):
        query = self._select_cursor.execute("select * from camera INNER JOIN sensor using(sensor_id);").fetchall()
        return [dict(camera) for camera in query]

    def can_film(self, sensor_id):
        query = self._select_cursor.execute("select film from camera where sensor_id = ?;",
                                            (sensor_id,)).fetchone()
        if query:
            return query[0]
        else:
            return -1