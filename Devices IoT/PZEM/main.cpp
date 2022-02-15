#include <Arduino.h>
#define DEBUG

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

#include "LittleFS.h"
#include <WiFiManager.h> 
#include <ArduinoJson.h> 

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <PZEM004Tv30.h>
#include <SoftwareSerial.h>

#include <time.h>
#include <string>
#include "secrets.h"

#if defined(ESP32)
    #error "Software Serial is not supported on the ESP32"
#endif

#define device "ESP-01-004"
#define sensor "PZEM-4t"
#define sensor_type "energy"

// WiFi Credentials
const char* ssid = "SSID";
const char* password = "PASS";

// MQTT
char*        mqtt_host = "192.168.3.3";
unsigned int mqtt_port = 8883;
char*        mqtt_user = "toni";
char*        mqtt_pass = "tonipass";

char topic_read[50];
char topic_write[50];

// Sensor variables
float lastTempValue = 0;
unsigned int frequency = 5;

// FS variables
bool connected = false;
bool shouldSaveConfig = false;

// Pins 
#define PZEM_RX_PIN 3
#define PZEM_TX_PIN 1

SoftwareSerial pzemSWSerial(1, 3);
PZEM004Tv30 pzem;

BearSSL::WiFiClientSecure wifiClient;
PubSubClient client(mqtt_host, mqtt_port, wifiClient);


void setInitialParameters(const char json[]){
  DynamicJsonDocument doc(512);
  deserializeJson(doc, json);

  if (doc.containsKey(sensor)) frequency = doc[sensor];

  doc.clear();

  DEBUG_PRINTLN("delayPerSamples:");
  DEBUG_PRINTLN(frequency);

  connected = true;
}

// ================== Wifi Manager ==================
void saveConfigCallback () {
  DEBUG_PRINTLN("Should save config");
  shouldSaveConfig = true;
}

void resetValues(){
  DEBUG_PRINTLN( LittleFS.format() );
  delay(2000);
  
  ESP.eraseConfig();
  delay(2000);
 
  ESP.restart();
}

void setupSpiffs(){
  if (LittleFS.begin()) {
    if (LittleFS.exists("/config.json")) {
      File configFile = LittleFS.open("/config.json", "r");
      if (configFile) {
        DEBUG_PRINTLN("FS] opened config file.");
        size_t size = configFile.size();
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonDocument doc(1024);
        deserializeJson(doc, buf.get());
        serializeJson(doc, Serial);

        if (!doc.containsKey("mqtt_host") || !doc.containsKey("mqtt_port") ||
            !doc.containsKey("mqtt_user") || !doc.containsKey("mqtt_pass") || 
            !doc.containsKey("device")    || !doc.containsKey("sensor")){
          resetValues();
        }

        strcpy(mqtt_host, doc["mqtt_host"]);
        mqtt_port = doc["mqtt_port"];
        strcpy(mqtt_user, doc["mqtt_user"]);
        strcpy(mqtt_pass, doc["mqtt_pass"]);
        strcpy(device, doc["device"]);
        strcpy(sensor, doc["sensor"]);

        doc.clear();
      }
    }else {
      DEBUG_PRINTLN("[FS] /config.json dint exist.");
    }
  } else {
    DEBUG_PRINTLN("[FS] failed to mount FS");
  }
}

void set_wifi_parameters(){ 
  WiFiManager wm;
  
  wm.setSaveConfigCallback(saveConfigCallback);

  auto aux_port = String(mqtt_port);
  WiFiManagerParameter custom_mqtt_host("host", "mqtt host", mqtt_host, 40);
  WiFiManagerParameter custom_mqtt_port("port", "mqtt port", aux_port.c_str(), 40);
  WiFiManagerParameter custom_mqtt_user("user", "mqtt user", mqtt_user, 40);
  WiFiManagerParameter custom_mqtt_pass("pass", "mqtt pass", mqtt_pass, 40);

  WiFiManagerParameter custom_device_id("device", "device id", device, 40);
  WiFiManagerParameter custom_sensor("sensor", "Sensor temperatura", sensor, 40);

  wm.addParameter(&custom_mqtt_host);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_mqtt_user);
  wm.addParameter(&custom_mqtt_pass);
  wm.addParameter(&custom_device_id);
  wm.addParameter(&custom_sensor);

  if (!wm.autoConnect(device, password)) {
    DEBUG_PRINTLN("[WIFI] failed to connect and hit timeout");
    delay(3000);
    ESP.restart();
    delay(5000);
  }
  DEBUG_PRINTLN("[WIFI] connected.");

  //read updated parameters
  strcpy(mqtt_host, custom_mqtt_host.getValue());
  mqtt_port = atoi(custom_mqtt_port.getValue());
  strcpy(mqtt_user, custom_mqtt_user.getValue());
  strcpy(mqtt_pass, custom_mqtt_pass.getValue());
  strcpy(device, custom_device_id.getValue());
  strcpy(sensor, custom_sensor.getValue());

  //save the custom parameters to FS
  if (shouldSaveConfig) {
    DEBUG_PRINTLN("[FS] saving config.");
    DynamicJsonDocument doc(1024);
    doc["mqtt_host"] = mqtt_host;
    doc["mqtt_port"] = mqtt_port;
    doc["mqtt_user"] = mqtt_user;
    doc["mqtt_pass"] = mqtt_pass;
    doc["device"] = device;
    doc["sensor"] = sensor;

    File configFile = LittleFS.open("/config.json", "w");
    if (!configFile) {
      DEBUG_PRINTLN("[FS] failed to open config file for writing.");
    }
    serializeJson(doc, Serial);
    serializeJson(doc, configFile);
    configFile.close();
    doc.clear();
    shouldSaveConfig = false;
  }
  
  String(String(device) + '/' + String(sensor) + String("/value")).toCharArray(topic_write, 50);
  String(String(device) + '/' + String(sensor) + String("/takePeriod")).toCharArray(topic_read, 50);

}

// ================== Synchronizing Time ==================
void getTime() {
  DEBUG_PRINT("[TIME] Synchronizing time using NTP");
  configTime(1 * 3600, 0, "es.pool.ntp.org");
  time_t now = time(nullptr);
  while (now < 1000) {
    delay(500);
    DEBUG_PRINT("*");
    now = time(nullptr);
  }
  DEBUG_PRINTLN("");
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  DEBUG_PRINT("[TIME] Current time: ");
  DEBUG_PRINTLN(asctime(&timeinfo));
}

// ================== BearSSL ==================
void loadcerts() {
  BearSSL::X509List *rootCert = new BearSSL::X509List(SERVER_CERT);
  BearSSL::X509List *clientCert = new BearSSL::X509List(CLIENT_CERT);
  BearSSL::PrivateKey *clientKey = new BearSSL::PrivateKey(CLIENT_KEY);

  wifiClient.setTrustAnchors(rootCert);

  wifiClient.setClientRSACert(clientCert, clientKey);
}

// ================== MQTT ==================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  std::string message = "";
  for (unsigned int i = 0; i < length; i++) {
    message+=(char)payload[i];
  }

  if (String(topic) == "ping") client.publish("ping/ack", device);
  else if(String(topic) == topic_read) frequency = atol(message.c_str());
  else if(String(topic) ==  String(device)+"/reset") resetValues();
  else if(String(topic) == String(device)+"/logged") setInitialParameters(message.c_str());
}

void mqttConnect() {
  int retri = 0;
  client.setCallback(mqttCallback);
  DEBUG_PRINTLN("[MQTT] Connecting with broker...");
  while (!client.connect(device, mqtt_user, mqtt_pass)) {
    if (retri > 60) resetValues();
    DEBUG_PRINT("[MQTT] failed, rc=");
    DEBUG_PRINTLN(client.state());
    delay(10000);
    retri++;
  }
  DEBUG_PRINTLN("[MQTT] connected");
}

void mqttReconnect() {
  if (client.connect(device, mqtt_user, mqtt_pass)) {
    client.subscribe("ping");
    client.subscribe(topic_read);
    client.subscribe((String(device)+"/reset").c_str());
  }
}

void mqttInitialConfig(){
  //client.subscribe((String(device)+"/logged").c_str());
  client.subscribe((String(device)+"/reset").c_str());

  //String topic = String(device)+"/login";
  //String msn="";
//
  //DynamicJsonDocument doc(512);
  //doc[sensor] = sensor_type;
  //serializeJson(doc, msn);
//
  //while ( !connected ){
  //  DEBUG_PRINTLN("Logging...");
  //  
  //  DEBUG_PRINTLN(topic);
  //  DEBUG_PRINTLN(msn);
//
  //  client.publish(topic.c_str(), msn.c_str());
  //  
  //  unsigned int c = 0;
  //  while (c < 10 && !connected ){
  //    client.loop();
  //    delay(1000);
  //    c++;
  //  }
  //}
//
  //doc.clear();
  //
  //client.unsubscribe((String(device)+"/logged").c_str());
  client.subscribe("ping");
  client.subscribe(topic_read);
}

void pins_config(){
  SERIAL_BEGIN(115200);
}

void setup(){
  pins_config();

  delay(3000);
  setupSpiffs();
  delay(1000);

  set_wifi_parameters();
  delay(5000);
  
  getTime();
  delay(500);

  loadcerts();
  delay(500);

  mqttConnect();

  mqttInitialConfig();
  delay(500);

  pzem = PZEM004Tv30(pzemSWSerial);
}

unsigned long last_time_update = 0;
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
 
  }else if (!client.connected()) {
      mqttReconnect();
      if (!client.connected()) delay(5000);
  
  } else {
    DEBUG_PRINTLN("1...");
    client.loop();

    if ((millis() - last_time_update) > (frequency * 1000)){
      last_time_update = millis();

      //client.publish(topic_write, String(pzem.readAddress()).c_str());

      // Read the data from the sensor
      float voltage = pzem.voltage();
      float current = pzem.current();
      float power = pzem.power();
      float energy = pzem.energy();
      float frequency = pzem.frequency();
      float pf = pzem.pf();
      if(isnan(voltage))          voltage = -1;
      else if (isnan(current))    current = -1;
      else if (isnan(power))      power = -1;
      else if (isnan(energy))     energy = -1;
      else if (isnan(frequency))  frequency = -1;
      else if (isnan(pf))         pf = -1;

      DynamicJsonDocument doc(1024);
      doc["voltage"] = voltage;
      doc["current"] = current;
      doc["power"] = power;
      doc["energy"] = energy;
      doc["frequency"] = frequency;
      doc["pf"] = pf;

      String msn;
      serializeJson(doc, msn);
      client.publish(topic_write, msn.c_str());
    }
    
    delay(1000);
  }

}



