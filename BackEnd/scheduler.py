import logging
import schedule

from gevent import sleep
from threading import Thread
from db_controller import DBController
from mosquitto_client import MosquittoSocket


class TaskScheduler(Thread):
    logger = logging.getLogger('Scheduler')

    def __init__(self, ms: MosquittoSocket, db: DBController):
        Thread.__init__(self, daemon=True)
        self.logger.info('Init...')

        self.ms = ms
        db = db

        schedule.every(20).seconds.do(ms.check_device_connection).tag('MQTT - Ping devices')
        schedule.every(1).hours.do(db.active.generate_history).tag('DB - Generate active history')

    def add_actuator_schedule(self, topic, status, every, interval, at, sensor_id, scheduler_id):
        if every == 'seconds':
            schedule.every(interval).seconds.do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'minutes':
            schedule.every(interval).minutes.do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'hours':
            schedule.every(interval).hours.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'days':
            schedule.every(interval).days.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'weeks':
            schedule.every(interval).weeks.do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)

        elif every == 'monday':
            schedule.every(interval).monday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'tuesday':
            schedule.every(interval).tuesday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'wednesday':
            schedule.every(interval).wednesday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'thursday':
            schedule.every(interval).thursday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'friday':
            schedule.every(interval).friday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'saturday':
            schedule.every(interval).saturday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)
        elif every == 'sunday':
            schedule.every(interval).sunday.at(at).do(self.ms.publish, topic=topic, payload=status)\
                .tag(sensor_id, scheduler_id)

        self.logger.info(f'Scheduler added evey {interval} {every} set to {status}')

    def run(self):
        self.logger.info('Start')

        while 1:
            n = schedule.idle_seconds()
            if n is None:
                self.logger.warning('No more jobs')
                sleep(60)
            elif n > 0:
                sleep(n)
            schedule.run_pending()
