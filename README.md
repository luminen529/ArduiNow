# ArduiNow UNO Q Smart Dashboard

Arduino UNO Q에서 로컬로 실행하는 스마트 대시보드 MVP입니다. 현재 하드웨어 센서가 확정되지 않았으므로 FastAPI 백엔드가 더미 센서 데이터를 생성하고, React 대시보드가 HTTP polling으로 값을 갱신합니다.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Recharts, lucide-react
- Backend: FastAPI, Python, SQLite
- Runtime: Docker Compose

## Run

```powershell
Copy-Item .env.example .env
docker compose up --build
```

- Web: <http://localhost:5173>
- API: <http://localhost:8000/docs>

## API

- `GET /api/sensors/latest`
- `GET /api/sensors/history`
- `GET /api/controls`
- `POST /api/controls`
- `GET /api/device/health`
- `GET /api/events`

## Hardware Integration Path

`backend/app/providers.py`의 `SensorProvider` 인터페이스를 기준으로 실제 센서 구현을 추가합니다. MVP는 `DummySensorProvider`만 사용합니다. 추후 Arduino App Lab, serial, I2C/Qwiic 기반 provider를 같은 인터페이스로 연결하면 프론트엔드와 API 계약은 유지됩니다.
