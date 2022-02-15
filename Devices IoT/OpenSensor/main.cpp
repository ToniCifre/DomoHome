#include <Arduino.h>

#define DEBUG
//#define ICACHE_RAM_ATTR

#ifdef DEBUG
 #define DEBUG_PRINT(x)         Serial.print(x);
 #define DEBUG_PRINTLN(x)        Serial.println(x);
 #define DEBUG_PRINTF(x, ...)   Serial.printf(x,  __VA_ARGS__);
 #define SERIAL_BEGIN(x)        Serial.begin(x); delay(50);
#else
 #define DEBUG_PRINT(x)
 #define DEBUG_PRINTLN(x)
 #define DEBUG_PRINTF(x, ...)
 #define SERIAL_BEGIN(x)
#endif

#include <ArduinoOTA.h>

#include "LittleFS.h"
#include <WiFiManager.h> 
#include <ArduinoJson.h> 

#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <string>
#include "secrets.h"

#define device "ESP-01-003"
#define sensor "OpenSensor"
#define type "passive"

// WiFi Credentials
const char* ssid = "SSID";
const char* password = "PASS";

// MQTT
char*        mqtt_host = "192.168.3.3";
unsigned int mqtt_port = 8883;
char*        mqtt_user = "toni";
char*        mqtt_pass = "tonipass";

char topic_write[50];
char topic_frequency_change[50];

// Sensor variables
unsigned int change_period    = 10 * 1000;

//Pins
int           flash_mode_pin = 0;
int           sensor_pin = 2;
volatile byte current_state = LOW;
byte          last_state = LOW;

// FS variables
bool connected = false;
bool shouldSaveConfig = false;


BearSSL::WiFiClientSecure wifiClient;
PubSubClient client(mqtt_host, mqtt_port, wifiClient);


void saveConfigCallback () {
  DEBUG_PRINTLN("[FS] Should save config")
  shouldSaveConfig = true;
}

void resetValues(){
  delay(2000);
  ESP.eraseConfig();
  delay(2000);
  ESP.restart();
  delay(2000);
}

void setupSpiffs(){
  if (LittleFS.begin()) {
    if (LittleFS.exists("/config.json")) {
      File configFile = LittleFS.open("/config.json", "r");
      if (configFile) {
        DEBUG_PRINTLN("FS] Opened config file.")
        size_t size = configFile.size();
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonDocument doc(1024);
        deserializeJson(doc, buf.get());

        serializeJson(doc, Serial);

        if (!doc.containsKey("mqtt_host") || !doc.containsKey("mqtt_port") ||
            !doc.containsKey("mqtt_user") || !doc.containsKey("mqtt_pass") || 
            !doc.containsKey("device") || !doc.containsKey("sensor")){
          resetValues();
        }
        
        strcpy(mqtt_host, doc["mqtt_host"]);
        mqtt_port = doc["mqtt_port"];
        strcpy(mqtt_user, doc["mqtt_user"]);
        strcpy(mqtt_pass, doc["mqtt_pass"]);
        strcpy(device, doc["device"]);
        strcpy(sensor, doc["sensor"]);
        
      }
    }else {
      DEBUG_PRINTLN("[FS] /config.json dint exist.")
    }
  } else {
    DEBUG_PRINTLN("[FS] failed to mount FS")
  }
}

void setInitialParameters(const char json[]){
  DynamicJsonDocument doc(512);
  deserializeJson(doc, json);

  DEBUG_PRINT("[Initial] Initial Parameters -> ")
  DEBUG_PRINTLN(json);

  String output = "";
  serializeJson(doc, output);

  if (doc.containsKey(sensor)) {
    ArduinoJson6185_91::DynamicJsonDocument sensor_doc = doc[sensor];

    if (sensor_doc.containsKey("change_period")) {
      change_period = doc[sensor]["change_period"].as<int>() * 1000;
    }else DEBUG_PRINTLN("[Initial] change_period error")

    if (sensor_doc.containsKey("value")){
      if (sensor_doc["value"] == 1) last_state = LOW;
      else if (sensor_doc["value"] == 0) last_state = HIGH;
    }else{ DEBUG_PRINTLN("[Initial] value error")}
  }

  doc.clear();
  DEBUG_PRINT("change_period: ")
  DEBUG_PRINTLN(change_period)
  connected = true;
}

//========= Wifi =========
void setWifiParameters(){ 
  WiFiManager wm;
  
  wm.setSaveConfigCallback(saveConfigCallback);

  auto aux_port = String(mqtt_port);
  WiFiManagerParameter custom_mqtt_host("host", "mqtt host", mqtt_host, 40);
  WiFiManagerParameter custom_mqtt_port("port", "mqtt port", aux_port.c_str(), 40);
  WiFiManagerParameter custom_mqtt_user("user", "mqtt user", mqtt_user, 40);
  WiFiManagerParameter custom_mqtt_pass("pass", "mqtt pass", mqtt_pass, 40);

  WiFiManagerParameter custom_device_id("device", "device id", device, 40);
  WiFiManagerParameter custom_sensor_id("sensor", "sensor id", sensor, 40);

  wm.addParameter(&custom_mqtt_host);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_mqtt_user);
  wm.addParameter(&custom_mqtt_pass);
  wm.addParameter(&custom_device_id);
  wm.addParameter(&custom_sensor_id);

  if (!wm.autoConnect(device, "password")) {
    DEBUG_PRINTLN("[WIFI] failed to connect and hit timeout.")
    delay(3000);
    ESP.restart();
    delay(5000);
  }
  DEBUG_PRINTLN("[WIFI] Connected.")

  //read updated parameters
  strcpy(mqtt_host, custom_mqtt_host.getValue());
  mqtt_port = atoi(custom_mqtt_port.getValue());
  strcpy(mqtt_user, custom_mqtt_user.getValue());
  strcpy(mqtt_pass, custom_mqtt_pass.getValue());
  strcpy(device, custom_device_id.getValue());
  strcpy(sensor, custom_sensor_id.getValue());

  //save the custom parameters to FS
  if (shouldSaveConfig) {
    DEBUG_PRINTLN("[FS] saving config.")
    DynamicJsonDocument doc(1024);
    doc["mqtt_host"] = mqtt_host;
    doc["mqtt_port"] = mqtt_port;
    doc["mqtt_user"] = mqtt_user;
    doc["mqtt_pass"] = mqtt_pass;
    doc["device"] = device;
    doc["sensor"] = sensor;

    File configFile = LittleFS.open("/config.json", "w");
    if (!configFile) {
      DEBUG_PRINTLN("[FS] failed to open config file for writing.")
    }
    serializeJson(doc, Serial);
    serializeJson(doc, configFile);
    configFile.close();

    shouldSaveConfig = false;
  }
  
  String(String(device) + '/' + String(sensor) + String("/value")).toCharArray(topic_write, 50);
  String(String(device) + "/" + String(sensor) + "/changePeriod").toCharArray(topic_frequency_change, 50);
}

//========= Set Time =========
void getTime() {
  DEBUG_PRINT("[TIME] Synchronizing time using NTP ")
  configTime(1 * 3600, 0, "es.pool.ntp.org");
  time_t now = time(nullptr);
  while (now < 1000) {
    delay(500);
    DEBUG_PRINT("*");
    now = time(nullptr);
  }
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  
  DEBUG_PRINTLN("")
  DEBUG_PRINT("[TIME] Current time: ")
  DEBUG_PRINTLN(asctime(&timeinfo))
}

//========= Load MQTT Certs =========
void loadcerts() {
  DEBUG_PRINTLN("[MQTT] Loading Certificates.");

  BearSSL::X509List *rootCert = new BearSSL::X509List(SERVER_CERT);
  BearSSL::X509List *clientCert = new BearSSL::X509List(CLIENT_CERT);
  BearSSL::PrivateKey *clientKey = new BearSSL::PrivateKey(CLIENT_KEY);

  wifiClient.setTrustAnchors(rootCert);

  wifiClient.setClientRSACert(clientCert, clientKey);
}

//========= MQTT =========
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  std::string message = "";
  for (unsigned int i = 0; i < length; i++) {
    message+=(char)payload[i];
  }
  DEBUG_PRINTF("[MQTT] Message recived -> %s \n", message.c_str());

  if (String(topic) == "ping") client.publish("ping/ack", device);
  else if(String(topic) ==  topic_frequency_change) change_period = atoi(message.c_str()) * 1000;
  else if(String(topic) ==  String(device)+"/reset") resetValues();
  else if(String(topic) == String(device)+"/logged") setInitialParameters(message.c_str());

}

void mqttConnect() {
  int retri = 0;
  client.setCallback(mqttCallback);
  DEBUG_PRINTLN("[MQTT] Connecting with broker...")
  while (!client.connect(device, mqtt_user, mqtt_pass)) {
    if (retri > 60) resetValues();
    DEBUG_PRINT("[MQTT] failed, rc=");
    DEBUG_PRINTLN(client.state());
    DEBUG_PRINTLN("[MQTT] Retry in 10 seconds.")
    delay(10000);
    retri++;
  }
  DEBUG_PRINTLN("[MQTT] Connected")
}

void mqttReconnect() {
  if (client.connect(device, mqtt_user, mqtt_pass)) {
    client.subscribe("ping");
    client.subscribe(topic_frequency_change);
    client.subscribe((String(device)+"/reset").c_str());
  }
}

void mqttInitialConfig(){
  client.subscribe((String(device)+"/logged").c_str());
  client.subscribe((String(device)+"/reset").c_str());

  String topic = String(device)+"/login";
  String msn="";

  DynamicJsonDocument doc(512);
  doc[sensor] = type;
  serializeJson(doc, msn);


  while ( !connected ){
    DEBUG_PRINTF("[MQTT] Logging to broker -> %s - %s \n", topic.c_str(), msn.c_str())

    client.publish(topic.c_str(), msn.c_str());
    
    unsigned int c = 0;
    while (c < 10 && !connected ){
      client.loop();
      delay(1000);
      c++;
    }
  }

  doc.clear();

  client.unsubscribe((String(device)+"/logged").c_str());
  client.subscribe("ping");
  client.subscribe(topic_frequency_change);
}

//========= Set pind =========
IRAM_ATTR void handle_sensor_change() {
  current_state = digitalRead(sensor_pin);
}
void pins_config(){
  //DEBUG_PRINTLN("Setting up GPIO0 as GND for sensor")
  //pinMode(flash_mode_pin, OUTPUT);
  //digitalWrite(flash_mode_pin, LOW);

  DEBUG_PRINTLN("Setting up GPIO2 as sensor input")
  pinMode(sensor_pin, INPUT_PULLUP);
  current_state = digitalRead(sensor_pin);
  attachInterrupt(digitalPinToInterrupt(sensor_pin), handle_sensor_change, CHANGE);

  SERIAL_BEGIN(115200);
}

void setup(){
  pins_config();

  delay(3000);
  setupSpiffs();
  delay(1000);

  setWifiParameters();
  delay(5000);
  
  getTime();
  delay(500);

  loadcerts();
  delay(500);

  DEBUG_PRINTLN("==== Start with config parameters ====")
  DEBUG_PRINTLN(mqtt_host)
  DEBUG_PRINTLN(mqtt_port)
  DEBUG_PRINTLN(mqtt_pass)
  DEBUG_PRINTLN(device)
  DEBUG_PRINTLN(sensor)

  mqttConnect();

  mqttInitialConfig();
  delay(500);

}

unsigned long last_wifi_connect = 0;
unsigned long last_mqtt_connect = 0;
unsigned long last_state_change = 0;

void loop() {
  if (WiFi.status() != WL_CONNECTED && last_wifi_connect < millis()) {
    WiFi.reconnect();
    last_wifi_connect = millis() + 10000;  
  }else if (!client.loop()){
    if(last_mqtt_connect < millis()) {
      mqttReconnect();
      last_mqtt_connect = millis() + 10000;  
    }
  }
  else {

    if (current_state != last_state) {
      if (current_state == LOW && last_wifi_connect == 0 ) client.publish(topic_write, "1");
      else last_wifi_connect = millis();  
      
      last_state = current_state;
    }

    if(current_state == HIGH && last_wifi_connect != 0 && millis() - last_wifi_connect > change_period){
        client.publish(topic_write, "0");
        last_wifi_connect = 0;
    }

    delay(500);
  }
}