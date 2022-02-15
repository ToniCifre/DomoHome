from itertools import groupby
from logging import Logger
from operator import itemgetter
from sqlite3 import Connection, Cursor, Error, Row


class Trigger:

    def __init__(self, conn: Connection, logger: Logger, select_cursor: Cursor):

        self.logger = logger
        self._conn = conn

        self._select_cursor = select_cursor
        self._select_cursor.row_factory = Row

    def add(self, triggers, actions):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("INSERT INTO trigger (active) VALUES (?)", (1,))
            trigger_id = cursor.lastrowid

            for trigger in triggers:
                cursor.execute("INSERT INTO trigger_sensor (trigger_id, sensor_id, trigger) VALUES (?,?,?)",
                               (trigger_id, trigger['sensor_id'], trigger['trigger']))

            for action in actions:
                cursor.execute("INSERT INTO trigger_action (trigger_id, sensor_id, value, timer) VALUES (?,?,?,?)",
                               (trigger_id, action['sensor_id'], action['value'], action['timer']))

            cursor.execute("commit")
        except Error as e:
            status = False
            cursor.execute("rollback")
            self.logger.error(f'Can\'t insert trigger with values {(triggers, actions)} - {e}')
        cursor.close()
        return status

    def update_active(self, trigger_id: int, active: int):
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("UPDATE trigger SET active=? WHERE id=?;", (active, trigger_id))
            cursor.execute("commit")
        except Error as e:
            cursor.execute("rollback")
            self.logger.error(f'Can\'t update active trigger with id {trigger_id} to {active} - {e}')
        cursor.close()

    def delete(self, trigger_id: int):
        status = True
        cursor = self._conn.cursor()
        cursor.execute("begin")
        try:
            cursor.execute("DELETE FROM trigger WHERE id=?;", (trigger_id,))
            cursor.execute("commit")
        except Error as e:
            status = False
            cursor.execute("rollback")
            self.logger.error(f'Can\'t remove trigger with id {trigger_id} - {e}')
        cursor.close()
        return status

    def get_grouped(self):
        trigger_query = self._select_cursor.execute("""
            select t.id, ts.sensor_id, t.active, ts.trigger, sts.type as t_type from trigger as t
                join trigger_sensor ts on t.id = ts.trigger_id
                join sensor sts on sts.sensor_id = ts.sensor_id
            """).fetchall()
        action_query = self._select_cursor.execute("""
            select t.id, ta.sensor_id as action_sensor, ta.value, ta.timer, sta.type as a_type, sta.device_id from trigger as t
                    join trigger_action ta on t.id = ta.trigger_id
                    join sensor sta on sta.sensor_id = ta.sensor_id
            """).fetchall()

        triggers_group = {k: list(v) for k, v in groupby([dict(x) for x in trigger_query], itemgetter('id'))}
        actions_group = {k: list(v) for k, v in groupby([dict(x) for x in action_query], itemgetter('id'))}

        triggers = []
        for k in actions_group:
            trigger = {'id': k,
                       'active': triggers_group[k][0]['active'],
                       'trigger_sensors': [trigger['sensor_id'] for trigger in triggers_group[k]],
                       'trigger': ' '.join([trigger['trigger'] for trigger in triggers_group[k]]),
                       'type_active': any('active' == trigger['t_type'] for trigger in triggers_group[k]),
                       'actions': actions_group[k]}
            triggers.append(trigger)

        return triggers

    def get_list(self):
        trigger_query = self._select_cursor.execute("""
            select t.id, ts.id, ts.sensor_id, ts.trigger from trigger as t
                join trigger_sensor ts on t.id = ts.trigger_id
                join sensor sts on sts.sensor_id = ts.sensor_id
            """).fetchall()
        action_query = self._select_cursor.execute("""
            select t.id, ta.id, ta.sensor_id, ta.value, ta.timer from trigger as t
                    join trigger_action ta on t.id = ta.trigger_id
                    join sensor sta on sta.sensor_id = ta.sensor_id
            """).fetchall()

        triggers_group = {k: list(v) for k, v in groupby([dict(x) for x in trigger_query], itemgetter('id'))}
        actions_group = {k: list(v) for k, v in groupby([dict(x) for x in action_query], itemgetter('id'))}

        triggers = []
        for k in actions_group:
            trigger = {
                       'trigger': triggers_group[k],
                       'actions': actions_group[k]}
            triggers.append(trigger)

        return triggers

