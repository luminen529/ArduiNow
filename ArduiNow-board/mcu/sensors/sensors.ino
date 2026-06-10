#include <DHT.h>

constexpr uint8_t DHT_PIN = 3;
constexpr uint8_t AIR_QUALITY_PIN = A0;

#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(115200);
    dht.begin();

    Serial.println("Arduino sensor stream started.");
}

void loop() {
    const float humidity = dht.readHumidity();
    const float temperatureC = dht.readTemperature();
    const int airQualityRaw = analogRead(AIR_QUALITY_PIN);
    const int airQuality = map(airQualityRaw, 0, 1023, 100, 0);

    if (isnan(humidity) || isnan(temperatureC)) {
        Serial.println("Failed to read from DHT sensor.");
        delay(2000);
        return;
    }

    Serial.print("Temperature: ");
    Serial.print(temperatureC, 1);
    Serial.print(" C, Humidity: ");
    Serial.print(humidity, 1);
    Serial.print(" %, AirQualityRaw: ");
    Serial.print(airQualityRaw);
    Serial.print(", AirQuality: ");
    Serial.print(airQuality);
    Serial.println(" %");

    delay(2000);
}
