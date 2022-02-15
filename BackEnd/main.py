import logging

from os import getenv
from pathlib import Path
from dotenv import load_dotenv
from gevent.monkey import patch_all
patch_all()

from scheduler import TaskScheduler
from db_controller import DBController
from api_and_socket import ApiAndSocket
from camera_socket import CameraSocket
from mosquitto_client import MosquittoSocket


def set_logging():
    from datetime import datetime
    date_time = datetime.now().strftime("%m-%d-%Y")
    logging.basicConfig(level=int(getenv('LOG_LEVEL')),
                        format='%(asctime)s %(levelname)-8s %(name)-12s %(message)s',
                        datefmt='%d-%m-%y %H:%M:%S',
                        handlers=[
                            logging.FileHandler(Path(f"{getenv('LOG_PATH')}/{date_time}_logfile.log").resolve()),
                            logging.StreamHandler()
                        ]
                        )
    logging.getLogger('geventwebsocket.handler').setLevel(logging.ERROR)


if __name__ == '__main__':
    load_dotenv(Path('.env.dev').resolve())
    # load_dotenv(Path('.env').resolve())
    set_logging()

    logging.info('Start Main.')

    db = DBController(getenv('SQLITE_FILE'))

    ws = ApiAndSocket(db)
    cs = CameraSocket()
    ms = MosquittoSocket(ws, cs, db)
    ts = TaskScheduler(ms, db)

    ws.set_mosquitto(ms)
    ws.set_scheduler(ts)
    ws.api_call_backs()
    ws.socket_call_backs()

    ms.run()
    cs.start()
    ts.start()
    ws.run()
    logging.info('Finish Application.')
