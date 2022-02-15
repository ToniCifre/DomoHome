#include <Arduino.h>

#include "LittleFS.h"
#include <WiFiManager.h> 
#include <ArduinoJson.h> 

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>
#include <string>
#include "secrets.h"
#include <map>

// WiFi Credentials
#define password "password"

// MQTT
char* mqtt_host = "192.168.3.3";
unsigned int mqtt_port = 8883;
char* mqtt_user = "toni";
char* mqtt_pass = "tonipass";

#define device "TempAndHumi"
#define sensor_temp "Temperatura"
#define sensor_humi "Humedad"
#define sensor_temp_tipe "active"
#define sensor_humi_tipe "active"

char topic_read_temp_period[50];
char topic_read_humi_period[50];
char topic_write_temp[50];
char topic_write_humi[50];

#define DHTTYPE DHT11
#define DHTPIN  2

DHT dht(DHTPIN, DHTTYPE);

unsigned int frequencyTemp = 10;
unsigned int frequencyHumi = 10;

float lastTempValue = 0;
float lastHumiValue = 0;

bool connected = false;

bool shouldSaveConfig = false;

BearSSL::WiFiClientSecure wifiClient;
PubSubClient client(mqtt_host, mqtt_port, wifiClient);


void setInitialParameters(const char json[]){
  DynamicJsonDocument doc(512);
  deserializeJson(doc, json);

  if (doc.containsKey(sensor_temp)) frequencyTemp = doc[sensor_temp];
  if (doc.containsKey(sensor_humi)) frequencyHumi = doc[sensor_humi];

  doc.clear();

  Serial.println("delayPerSamples:");
  Serial.println(frequencyTemp);
  Serial.println(frequencyHumi);

  connected = true;
}

// ================== Wifi Manager ==================
void saveConfigCallback () {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}

void resetValues(){
  Serial.println( LittleFS.format() );
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
        Serial.println("FS] opened config file.");
        size_t size = configFile.size();
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonDocument doc(1024);
        deserializeJson(doc, buf.get());
        serializeJson(doc, Serial);

        if (!doc.containsKey("mqtt_host") || !doc.containsKey("mqtt_port") ||
            !doc.containsKey("mqtt_user") || !doc.containsKey("mqtt_pass") || 
            !doc.containsKey("device") || 
            !doc.containsKey("sensor_temp") || !doc.containsKey("sensor_temp")){
          resetValues();
        }

        strcpy(mqtt_host, doc["mqtt_host"]);
        mqtt_port = doc["mqtt_port"];
        strcpy(mqtt_user, doc["mqtt_user"]);
        strcpy(mqtt_pass, doc["mqtt_pass"]);
        strcpy(device, doc["device"]);
        strcpy(sensor_temp, doc["sensor_temp"]);
        strcpy(sensor_humi, doc["sensor_humi"]);
        
      }
    }else {
      Serial.println("[FS] /config.json dint exist.");
    }
  } else {
    Serial.println("[FS] failed to mount FS");
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
  WiFiManagerParameter custom_sensor_temp("sensor_temp", "Sensor temperatura", sensor_temp, 40);
  WiFiManagerParameter custom_sensor_humi("sensor", "Sensor humitat", sensor_humi, 40);

  wm.addParameter(&custom_mqtt_host);
  wm.addParameter(&custom_mqtt_port);
  wm.addParameter(&custom_mqtt_user);
  wm.addParameter(&custom_mqtt_pass);
  wm.addParameter(&custom_device_id);
  wm.addParameter(&custom_sensor_temp);
  wm.addParameter(&custom_sensor_humi);

  if (!wm.autoConnect(device, password)) {
    Serial.println("[WIFI] failed to connect and hit timeout");
    delay(3000);
    ESP.restart();
    delay(5000);
  }
  Serial.println("[WIFI] connected.");

  //read updated parameters
  strcpy(mqtt_host, custom_mqtt_host.getValue());
  mqtt_port = atoi(custom_mqtt_port.getValue());
  strcpy(mqtt_user, custom_mqtt_user.getValue());
  strcpy(mqtt_pass, custom_mqtt_pass.getValue());
  strcpy(device, custom_device_id.getValue());
  strcpy(sensor_temp, custom_sensor_temp.getValue());
  strcpy(sensor_humi, custom_sensor_humi.getValue());

  //save the custom parameters to FS
  if (shouldSaveConfig) {
    Serial.println("[FS] saving config.");
    DynamicJsonDocument doc(1024);
    doc["mqtt_host"] = mqtt_host;
    doc["mqtt_port"] = mqtt_port;
    doc["mqtt_user"] = mqtt_user;
    doc["mqtt_pass"] = mqtt_pass;
    doc["device"] = device;
    doc["sensor_temp"] = sensor_temp;
    doc["sensor_humi"] = sensor_humi;

    File configFile = LittleFS.open("/config.json", "w");
    if (!configFile) {
      Serial.println("[FS] failed to open config file for writing.");
    }
    serializeJson(doc, Serial);
    serializeJson(doc, configFile);
    configFile.close();

    shouldSaveConfig = false;
  }
  
  String(String(device) + '/' + String(sensor_temp) + String("/value")).toCharArray(topic_write_temp, 50);
  String(String(device) + '/' + String(sensor_temp) + String("/takePeriod")).toCharArray(topic_read_temp_period, 50);
  String(String(device) + '/' + String(sensor_humi) + String("/value")).toCharArray(topic_write_humi, 50);
  String(String(device) + '/' + String(sensor_humi) + String("/takePeriod")).toCharArray(topic_read_humi_period, 50);

}

// ================== Synchronizing Time ==================
void getTime() {
  Serial.print("[TIME] Synchronizing time using NTP");
  configTime(1 * 3600, 0, "es.pool.ntp.org");
  time_t now = time(nullptr);
  while (now < 1000) {
    delay(500);
    Serial.print("*");
    now = time(nullptr);
  }
  Serial.println("");
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.print("[TIME] Current time: ");
  Serial.println(asctime(&timeinfo));
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
  else if(String(topic) == topic_read_temp_period) frequencyTemp = atol(message.c_str());
  else if(String(topic) == topic_read_humi_period) frequencyHumi = atol(message.c_str());
  else if(String(topic) ==  String(device)+"/reset") resetValues();
  else if(String(topic) == String(device)+"/logged") setInitialParameters(message.c_str());
}

void mqttConnect() {
  int retri = 0;
  client.setCallback(mqttCallback);
  Serial.println("[MQTT] Connecting with broker...");
  while (!client.connect(device, mqtt_user, mqtt_pass)) {
    if (retri > 60) resetValues();
    Serial.print("[MQTT] failed, rc=");
    Serial.println(client.state());
    delay(10000);
    retri++;
  }
  Serial.println("[MQTT] connected");
}

void mqttReconnect() {
  if (client.connect(device, mqtt_user, mqtt_pass)) {
    client.subscribe("ping");
    client.subscribe(topic_read_temp_period);
    client.subscribe(topic_read_humi_period);
    client.subscribe((String(device)+"/reset").c_str());
  }
}

void mqttInitialConfig(){
  client.subscribe((String(device)+"/logged").c_str());
  client.subscribe((String(device)+"/reset").c_str());

  String topic = String(device)+"/login";
  String msn="";

  DynamicJsonDocument doc(512);
  doc[sensor_temp] = sensor_temp_tipe;
  doc[sensor_humi] = sensor_humi_tipe;
  serializeJson(doc, msn);

  while ( !connected ){
    Serial.println("Logging...");
    
    Serial.println(topic);
    Serial.println(msn);

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
  client.subscribe(topic_read_temp_period);
  client.subscribe(topic_read_humi_period);
}

void pins_config(){
  dht.begin(); 

  Serial.begin(115200);
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
}

unsigned long actual_temp_time = 0;
unsigned long actual_humi_time = 0;
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
 
  }else if (!client.connected()) {
      mqttReconnect();
      if (!client.connected()) delay(5000);
  
  } else {
    client.loop();

    if ((millis() - actual_temp_time) > (frequencyTemp * 1000)){
      actual_temp_time = millis();
      float temp = dht.readTemperature();
      if(!isnan(temp) && lastTempValue != temp) {
        lastTempValue = temp;
        client.publish(topic_write_temp, String(temp).c_str());
      }
    }

    if ((millis() - actual_humi_time) > (frequencyHumi * 1000)){
      actual_humi_time = millis();
      float humi = dht.readHumidity();
      if (!isnan(humi) && lastHumiValue != humi) {
        lastHumiValue = humi;
        client.publish(topic_write_humi, String(humi).c_str());
      }
    }
    
    delay(1000);
  }

}



