export type SensorReading = {
  timestamp: string;
  temperature: number;
  humidity: number;
  light: number;
  air_quality: number;
};

export type ControlState = {
  light: boolean;
  fan: boolean;
  local_only: boolean;
  alerts: boolean;
};

export type DeviceHealth = {
  cpu_load: number;
  memory_usage: number;
  network_quality: number;
  model: string;
  server_status: string;
};

export type EventLog = {
  id: number;
  level: string;
  title: string;
  detail: string;
  timestamp: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  latestSensor: () => request<SensorReading>("/api/sensors/latest"),
  sensorHistory: () => request<SensorReading[]>("/api/sensors/history?limit=48"),
  controls: () => request<ControlState>("/api/controls"),
  updateControls: (state: ControlState) =>
    request<ControlState>("/api/controls", {
      method: "POST",
      body: JSON.stringify(state),
    }),
  health: () => request<DeviceHealth>("/api/device/health"),
  events: () => request<EventLog[]>("/api/events?limit=12"),
};
