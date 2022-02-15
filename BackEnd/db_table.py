sql_create_tables = """
        CREATE TABLE IF NOT EXISTS user (
                    name varchar(25) PRIMARY KEY NOT NULL,
                    password_hash varchar(128) NOT NULL,
                    role integer NOT NULL CHECK (rolE IN (0, 1, 2))
                );

        CREATE TABLE IF NOT EXISTS room (name varchar(25) PRIMARY KEY);

        CREATE TABLE IF NOT EXISTS device (
                    device_id varchar(25) NOT NULL PRIMARY KEY,
                    connect BOOLEAN NOT NULL CHECK (connect IN (0, 1)) DEFAULT 1,
                    home integer DEFAULT 1,
                    FOREIGN KEY (home) REFERENCES home (id) ON UPDATE CASCADE ON DELETE CASCADE
                );

        CREATE TABLE IF NOT EXISTS sensor (
                    sensor_id varchar(25) PRIMARY KEY,
                    name varchar(25) NOT NULL,
                    type varchar(7) CHECK( type IN ('actuator', 'passive', 'active', 'camera', 'energy')) NOT NULL,
                    device_id varchar(25) NOT NULL,
                    room varchar(25) NOT NULL,
                    FOREIGN KEY (room) REFERENCES room (name) ON UPDATE CASCADE ON DELETE CASCADE,
                    FOREIGN KEY (device_id) REFERENCES device (device_id) ON UPDATE CASCADE ON DELETE CASCADE
                    
                );

        CREATE TABLE IF NOT EXISTS user_sensor (
                    user_id integer NOT NULL,
                    sensor_id varchar(25) NOT NULL,
                    show BOOLEAN NOT NULL CHECK (show IN (0, 1)),
                    PRIMARY KEY(user_id, sensor_id),
                    FOREIGN KEY (user_id) REFERENCES user (name) ON UPDATE CASCADE,
                    FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );

        CREATE TABLE IF NOT EXISTS actuator_definition (
                    definition varchar(25) PRIMARY KEY NOT NULL,
                    icon varchar(25) NOT NULL
                );
        CREATE TABLE IF NOT EXISTS actuator (
                    sensor_id varchar(25) PRIMARY KEY REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE,
                    value BOOLEAN NOT NULL CHECK (value IN (0, 1)),
                    definition varchar(25) NOT NULL,
                    FOREIGN KEY (definition) REFERENCES actuator_definition (definition) ON UPDATE CASCADE ON DELETE CASCADE
                );
        CREATE TABLE IF NOT EXISTS actuator_history (
                    sensor_id varchar(25),
                    value BOOLEAN NOT NULL CHECK (value IN (0, 1)),
                    date integer NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES actuator (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );
                
        CREATE TABLE IF NOT EXISTS passive_definition (
                    definition varchar(25) PRIMARY KEY NOT NULL,
                    icon varchar(25) NOT NULL
                );
        CREATE TABLE IF NOT EXISTS passive (
                    sensor_id varchar(25) PRIMARY KEY REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE,
                    value BOOLEAN NOT NULL CHECK (value IN (0, 1)),
                    change_period integer NOT NULL,
                    definition varchar(25) NOT NULL,
                    FOREIGN KEY (definition) REFERENCES passive_definition (definition) ON UPDATE CASCADE ON DELETE CASCADE
                );
        CREATE TABLE IF NOT EXISTS passive_history (
                    sensor_id varchar(25),
                    value BOOLEAN NOT NULL CHECK (value IN (0, 1)),
                    date integer NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES passive (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );

        CREATE TABLE IF NOT EXISTS active_definition (
                    definition varchar(25) PRIMARY KEY NOT NULL,
                    icon varchar(25)
                );
        CREATE TABLE IF NOT EXISTS active (
                    sensor_id varchar(25) PRIMARY KEY REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE,
                    save_period integer NOT NULL,
                    take_period integer NOT NULL,
                    definition varchar(25) NOT NULL,
                    FOREIGN KEY (definition) REFERENCES active_definition (definition) ON UPDATE CASCADE ON DELETE CASCADE
                );
        CREATE TABLE IF NOT EXISTS active_history (
                    sensor_id varchar(25),
                    max real NOT NULL,
                    min real NOT NULL,
                    mean real NOT NULL,
                    samples int NOT NULL,
                    date varchar(15) NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES active (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );
        CREATE INDEX IF NOT EXISTS index_active_history_date ON active_history (date);

        CREATE TABLE IF NOT EXISTS active_daily_history (
                    sensor_id varchar(25),
                    value real NOT NULL,
                    date integer NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES active (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );

        CREATE TABLE IF NOT EXISTS camera (
                    sensor_id varchar(25) PRIMARY KEY REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE,
                    film BOOLEAN NOT NULL CHECK (film IN (0, 1)),
                    min_framerate integer NOT NULL,
                    max_framerate integer NOT NULL
                );

        CREATE TABLE IF NOT EXISTS camera_history (
                    sensor_id varchar(25) NOT NULL,
                    name varchar(50) NOT NULL,
                    date integer NOT NULL,
                    FOREIGN KEY (sensor_id) REFERENCES camera (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
                );
        
        CREATE TABLE IF NOT EXISTS trigger (
                    id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                    active BOOLEAN NOT NULL CHECK (active IN (0, 1))
                );
        
        CREATE TABLE IF NOT EXISTS trigger_sensor (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                trigger_id varchar(25) NOT NULL,
                sensor_id varchar(25) NOT NULL,
                trigger varchar(25) NOT NULL,
                FOREIGN KEY (trigger_id) REFERENCES trigger (id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
            );
        CREATE INDEX IF NOT EXISTS index_trigger_sensor_trigger_id ON trigger_sensor (trigger_id);
        
        CREATE TABLE IF NOT EXISTS trigger_action (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                trigger_id varchar(25) NOT NULL,
                sensor_id varchar(25) NOT NULL,
                value integer NOT NULL,
                timer integer DEFAULT 0,
                FOREIGN KEY (trigger_id) REFERENCES trigger (id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
            );
        CREATE INDEX IF NOT EXISTS index_trigger_action_trigger_id ON trigger_action (trigger_id);
        
        CREATE TABLE IF NOT EXISTS info_login (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_name varchar(25),
                ip varchar(40) NOT NULL,
                browser varchar(10),
                version integer,
                os varchar(10),
                country varchar(25),
                countryCode varchar(3),
                regionName varchar(55),
                city varchar(55),
                zip integer,
                lat real,
                lon real,
                org varchar(55),
                date integer NOT NULL,
                FOREIGN KEY (user_name) REFERENCES user (name) ON UPDATE CASCADE ON DELETE CASCADE
            );
        CREATE INDEX IF NOT EXISTS index_info_login_ip ON info_login (ip);
        
        CREATE TABLE IF NOT EXISTS scheduler (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                sensor_id varchar(25) NOT NULL,
                every varchar(25) NOT NULL,
                interval integer NOT NULL ,
                at varchar(25) NOT NULL,
                value BOOLEAN NOT NULL CHECK (value IN (0, 1)),
                FOREIGN KEY (sensor_id) REFERENCES actuator (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
            );
        CREATE INDEX IF NOT EXISTS index_scheduler_sensor_id ON scheduler (sensor_id) ;
        
        CREATE TABLE IF NOT EXISTS routine (
                    id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                    user integer NOT NULL,
                    FOREIGN KEY (user) REFERENCES user (name) ON UPDATE CASCADE
                );
        CREATE TABLE IF NOT EXISTS routine_action (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                routine varchar(25) NOT NULL,
                sensor varchar(25) NOT NULL,
                value integer NOT NULL,
                timer integer DEFAULT 0,
                FOREIGN KEY (routine) REFERENCES routine (id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY (sensor) REFERENCES sensor (sensor_id) ON UPDATE CASCADE ON DELETE CASCADE
            );
        
         CREATE TABLE IF NOT EXISTS home (
                id INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT,
                name varchar(15) not null,
                status integer DEFAULT 0
            );
        CREATE INDEX IF NOT EXISTS index_home_name ON home (name) ;
    """