from time import time
from logging import Logger
from sqlite3 import Connection, Cursor, Error, Row
from werkzeug.security import generate_password_hash


class User:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add(self, name, pwd, role):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")

        pwd_hash = generate_password_hash(pwd)
        try:
            cursor.execute("INSERT INTO user VALUES (?,?,?)", (name, pwd_hash, role))
            cursor.execute("commit")
        except Error as e:
            status = False
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert user with values {(name, pwd_hash, role)} - {e}')
        cursor.close()
        return status

    def add_sensor(self, user_id, sensor_id, show=True):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO user_sensor VALUES (?,?,?)", (user_id, sensor_id, show))
            cursor.execute("commit")
        except Error as e:
            status = False
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert sensor {sensor_id} to user {user_id} - {e}')
        cursor.close()
        return status

    def add_login(self, user_name, ip, browser, version, os, geolocation=None):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            now = int(time())
            if geolocation is None:
                cursor.execute("INSERT INTO info_login (user_name, ip, browser, version, os, date) VALUES (?,?,?,?,?,?)"
                               , (user_name, ip, browser, version, os, now))

            elif geolocation['status'] == 'fail':
                cursor.execute("""INSERT INTO info_login (user_name, ip, browser, version, os, country, date) 
                                                VALUES (?,?,?,?,?,?,?)""",
                               (user_name, ip, browser, version, os, geolocation['message'], now))

            else:
                cursor.execute("""INSERT INTO info_login (user_name, ip, browser, version, os, country, countryCode,
                                                    regionName, city, zip, lat, lon, org, date) 
                                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                               (
                                   user_name, ip, browser, version, os,
                                   geolocation['country'], geolocation['countryCode'], geolocation['regionName'],
                                   geolocation['city'], geolocation['zip'], geolocation['lat'], geolocation['lon'],
                                   geolocation['as'],
                                   now
                               ))

            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert trigger with add_login '
                              f'{(user_name, ip, browser, version, os, geolocation)} - {e}')
        cursor.close()

    def update(self, user_id, name, role):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute(f"UPDATE user SET name=?, role=? WHERE name = ?", (name, role, user_id))
            cursor.execute("commit")
            self.logger.error(f'user {user_id} has updated to {(name, role, user_id)}')

        except Error as e:
            self.logger.error(f'user {user_id} cant update to {(name, role, user_id)} - {e}')
            cursor.execute("rollback")
            status = False

        cursor.close()
        return status

    def update_password(self, user_id, pwd):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        pwd_hash = generate_password_hash(pwd)
        try:
            cursor.execute(f"UPDATE user SET password_hash = ? WHERE name = ?", (pwd_hash, user_id))
            cursor.execute("commit")
            self.logger.error(f'user {user_id} has updated his password')

        except Error as e:
            self.logger.error(f'user {user_id} cant update password - {e}')
            cursor.execute("rollback")
            status = False

        cursor.close()
        return status

    def update_show(self, sensor_id, user, show):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute(f"UPDATE user_sensor SET show = ? WHERE sensor_id = ? and user_id = ?",
                           (show, sensor_id, user))
            cursor.execute("commit")
        except Error as e:
            self.logger.error(f'Sensor {sensor_id} for user {user}, cant update show value to {show} - {e}')
            cursor.execute("rollback")
            status = False

        cursor.close()
        return status

    def delete(self, user_id):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM user where name=?;", (user_id,))
            cursor.execute("commit")
            self.logger.error(f'User {user_id} removed.')
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t delete user {user_id} - {e}')
            status = False
        cursor.close()
        return status

    def delete_sensor(self, user_id, sensor_id):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM user_sensor WHERE user_id = ? and sensor_id = ?;", (user_id, sensor_id))
            cursor.execute("commit")
        except Error as e:
            status = False
            cursor.execute("rollback")
            self.logger.error(f'Can\'t delete sensor {sensor_id} to user {user_id} - {e}')
        cursor.close()
        return status

    def get(self, name):
        query = self._select_cursor.execute("select name, role from user where name==?;", (name,)).fetchone()
        if query:
            return dict(query)
        return None

    def get_pass(self, name):
        query = self._select_cursor.execute("select * from user where name==?;", (name,)).fetchone()
        if query:
            return dict(query)
        return None

    def get_all(self):
        query = self._select_cursor.execute("select name, role from user;").fetchall()
        return [dict(res) for res in query]

    def get_names(self):
        query = self._select_cursor.execute("select name from user;").fetchall()
        return [res[0] for res in query]

    def num_admins(self):
        query = self._select_cursor.execute("select count(*) as count from user where role==0;", ).fetchone()
        if query:
            return query['count']
        return -1

    def exist(self, name):
        if self._conn.execute("select 1 from user where name=?;", (name,)).fetchone():
            return True
        return False

    def have_sensor(self, user, sensor):
        if self._conn.execute("select 1 from user_sensor where user_id=? and sensor_id=?;", (user, sensor)).fetchone():
            return True
        else:
            return False