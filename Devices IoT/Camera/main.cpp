#include <Arduino.h>
#include "esp_camera.h"
#include <ArduinoJson.h> 
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include <string>
#include <map>
#include <base64.h>
#include "secrets.h"
#include "fd_forward.h"

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define MQTT_MAX_PACKET_SIZE 16384
#define MQTT_VERSION MQTT_VERSION_3_1_1


//PIXFORMAT_JPEG; PIXFORMAT_RGB565
//FRAMESIZE_QVGA (320 x 240)
//FRAMESIZE_CIF (352 x 288)
//FRAMESIZE_VGA (640 x 480)
//FRAMESIZE_SVGA (800 x 600)
#include <eloquentarduino/vision/io/decoders/Red565RandomAccessDecoder.h>
#include <eloquentarduino/vision/processing/downscaling/Downscaler.h>
#include <eloquentarduino/vision/processing/MotionDetector.h>

#define FRAME_SIZE FRAMESIZE_QVGA
#define PIXFORMAT PIXFORMAT_JPEG
#define W 320
#define H 240
const uint16_t w = 32;
const uint16_t h = 24;
#define DIFF_THRESHOLD 15
#define MOTION_THRESHOLD 0.15

// WiFi Credentials
const char* ssid = "DomoHome";
const char* password = "73puitMypki5";

// MQTT
char* mqtt_host = "192.168.3.3";
unsigned int mqtt_port = 8883;
char* mqtt_user = "toni";
char* mqtt_pass = "tonipass";

#define device "CamSala1"
#define sensor "cam-124"
#define type   "camera"

#define topic_frame_Rate device "/" sensor "/FrameRate"
#define topic_detect_motion device "/" sensor "/DetectMotion"

#define topic_write_frame device "/" sensor "/frame"
#define topic_write_move device "/" sensor "/move"


using namespace Eloquent::Vision;
IO::Decoders::Red565RandomAccessDecoder decoder;
Processing::Downscaling::Center<W / w, H / h> strategy;
Processing::Downscaling::Downscaler<W, H, w, h> downscaler(&decoder, &strategy);
Processing::MotionDetector<w, h> motion;

uint8_t downscaled[w * h];

WiFiClientSecure wifiClient;
PubSubClient client(mqtt_host, mqtt_port, wifiClient);


int frames = 1;
bool detectMotion = true;

bool connected = false;

static const unsigned long CHECK_MOVE_INTERVAL = 2500;
static unsigned long lastCheckTime = 0;


void setInitialParameters(const char json[]){
  DynamicJsonDocument doc(512);
  deserializeJson(doc, json);

  if (doc.containsKey(sensor)) {
    ArduinoJson6184_91::DynamicJsonDocument sensor_doc = doc[sensor];
    if (sensor_doc.containsKey("min_framerate")) frames = doc[sensor]["min_framerate"];
    if (sensor_doc.containsKey("film")) detectMotion = doc[sensor]["film"];
  }

  doc.clear();

  Serial.println("Initial Parameters:");
  Serial.println(frames);
  Serial.println(detectMotion);

  connected = true;
}

// ==== WIFI ====
void wifi_connect(){
  if (WiFi.status() != WL_CONNECTED) {
    Serial.print("[WIFI] Connecting to ");
    Serial.println(ssid);

    delay(10);
    Serial.println("[WIFI] begin to ");
    WiFi.begin(ssid, password);
    Serial.println("[WIFI] begind ");

    while (WiFi.status() != WL_CONNECTED) {
      Serial.println("*");

      delay(1000);
    }
    Serial.println();
    Serial.print("[WiFi] Connected with IP address: ");
    Serial.println(WiFi.localIP());
  }
}

// ==== CAMMERA ====
void setupCamera(){
const camera_config_t config = {
        .pin_pwdn = PWDN_GPIO_NUM,
        .pin_reset = RESET_GPIO_NUM,
        .pin_xclk = XCLK_GPIO_NUM,
        .pin_sscb_sda = SIOD_GPIO_NUM,
        .pin_sscb_scl = SIOC_GPIO_NUM,
        .pin_d7 = Y9_GPIO_NUM,
        .pin_d6 = Y8_GPIO_NUM,
        .pin_d5 = Y7_GPIO_NUM,
        .pin_d4 = Y6_GPIO_NUM,
        .pin_d3 = Y5_GPIO_NUM,
        .pin_d2 = Y4_GPIO_NUM,
        .pin_d1 = Y3_GPIO_NUM,
        .pin_d0 = Y2_GPIO_NUM,
        .pin_vsync = VSYNC_GPIO_NUM,
        .pin_href = HREF_GPIO_NUM,
        .pin_pclk = PCLK_GPIO_NUM,
        .xclk_freq_hz = 20000000,
        .ledc_timer = LEDC_TIMER_0,
        .ledc_channel = LEDC_CHANNEL_0,
        .pixel_format = PIXFORMAT,
        .frame_size = FRAME_SIZE,
        .jpeg_quality = 10,
        .fb_count = 2,
    };

    esp_err_t err = esp_camera_init(&config);
    Serial.printf("esp_camera_init: 0x%x\n", err);

    sensor_t *s = esp_camera_sensor_get();
    s->set_framesize(s, FRAME_SIZE);
    s->set_pixformat(s, PIXFORMAT);
}

// ==== Synchronizing time====
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

// ==== Certificates ====
void loadcerts() {
  wifiClient.setCertificate(CLIENT_CERT);
  wifiClient.setPrivateKey(CLIENT_KEY);
  wifiClient.setCACert(CA_CERT);

  Serial.println("[TLS] Certificates Loaded");
}

// ===== MQTT =====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  std::string message = "";
  for (unsigned int i = 0; i < length; i++) {
    message+=(char)payload[i];
  }

  if (String(topic) == "ping") client.publish("ping/ack", device);
  else if(String(topic) == topic_frame_Rate) frames = atol(message.c_str());
  else if(String(topic) == topic_detect_motion) detectMotion = message == "1";
  else if(String(topic) == String(device)+"/logged") setInitialParameters(message.c_str());
}

void mqttConnect() {
  int retri = 0;
  client.setCallback(mqttCallback);
  Serial.println("[MQTT] Connecting with broker...");
  while (!client.connect(device, mqtt_user, mqtt_pass)) {
    if (retri > 60) ESP.restart();
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
    client.subscribe(topic_frame_Rate);
    client.subscribe(topic_detect_motion);
  }
}

void mqtt_initial_config(){
  client.setBufferSize(MQTT_MAX_PACKET_SIZE);
  
  client.subscribe((String(device)+"/logged").c_str());
  client.subscribe((String(device)+"/reset").c_str());

  String topic = String(device)+"/login";
  String msn="";

  DynamicJsonDocument doc(512);
  doc[sensor] = type;
  serializeJson(doc, msn);

  while ( !connected ){
    Serial.println("Logging...");
 
    client.publish(topic.c_str(), msn.c_str());
    
    unsigned int c = 0;
    while (c < 10 && !connected ){
      client.loop();
      delay(1000);
      c++;
    }
  }

  client.unsubscribe((String(device)+"/logged").c_str());
  client.subscribe("ping");
  client.subscribe(topic_frame_Rate);
  client.subscribe(topic_detect_motion);
}


void pins_config(){
  Serial.begin(115200);
}

void setup(){
  pins_config();
  delay(3000);

  wifi_connect();
  delay(500);
  
  getTime();
  delay(500);

  loadcerts();
  delay(500);

  mqttConnect();

  setupCamera();
  
  mqtt_initial_config();
  delay(500);

  motion.setDiffThreshold(DIFF_THRESHOLD);
  // set how many pixels (in percent) should change to be considered as motion
  motion.setMotionThreshold(MOTION_THRESHOLD);
  // prevent consecutive triggers
  motion.setDebounceFrames(2);
}

void pic_and_send(){
  camera_fb_t *frame = esp_camera_fb_get();
  client.publish(topic_write_frame,frame->buf, frame->len);
  //client.publish(topic_write_frame, base64::encode(frame->buf, frame->len).c_str());
  
  if(detectMotion && millis() - lastCheckTime >= CHECK_MOVE_INTERVAL){
    lastCheckTime += millis();
  
    dl_matrix3du_t *image_matrix = dl_matrix3du_alloc(1, frame->width, frame->height, 3);    
    if(fmt2rgb888(frame->buf, frame->len, frame->format, image_matrix->item)){

      downscaler.downscale(image_matrix->item, downscaled);
      motion.detect(downscaled);

      if (motion.triggered()) {
          client.publish(topic_write_move, "1");
      } 
    }
    dl_matrix3du_free(image_matrix);
  }
  esp_camera_fb_return(frame);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
 
  }else if (!client.connected()) {
    mqttReconnect();
    if (!client.connected()) delay(5000);
  
  } else {
    client.loop();

    delay(1000/frames);
    pic_and_send();
    
  }
}





