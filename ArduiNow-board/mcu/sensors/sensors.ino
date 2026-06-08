#include <DHT.h>

constexpr uint8_t DHT_PIN = 3;

#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(115200);
    dht.begin();

    Serial.println("DHT sensor test started.");
}

void loop() {
    const float humidity = dht.readHumidity();
    const float temperatureC = dht.readTemperature();

    if (isnan(humidity) || isnan(temperatureC)) {
        Serial.println("Failed to read from DHT sensor.");
        delay(2000);
        return;
    }

    Serial.print("Temperature: ");
    Serial.print(temperatureC, 1);
    Serial.print(" °C, Humidity: ");
    Serial.print(humidity, 1);
    Serial.println(" %");

    delay(2000);
}
