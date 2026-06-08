# ArduiNow UNO Q Smart Dashboard

Arduino UNO Q에서 실행하는 로컬 온도 센서 대시보드입니다. FastAPI 백엔드가 센서 값을 API로 제공하고, React 대시보드가 HTTP polling으로 최신 온도를 표시합니다.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Recharts, lucide-react
- Backend: FastAPI, Python, SQLite
- Runtime: Docker Compose 또는 로컬 Python/Node 실행

## Run

```powershell
Copy-Item ArduiNow-dashboard\.env.example ArduiNow-dashboard\.env
Set-Location ArduiNow-dashboard
docker compose up --build
```

- Web: <http://localhost:5173>
- API: <http://localhost:8000/docs>

## 온도 센서 연결

`ArduiNow-board/mcu/sensors/sensors.ino`는 DHT 센서 값을 시리얼로 출력합니다. 백엔드에서 이 값을 읽으려면 `.env`를 아래처럼 바꿉니다.

```env
SENSOR_PROVIDER=serial_dht
SERIAL_PORT=COM3
SERIAL_BAUDRATE=115200
```

`SERIAL_PORT`는 Windows 장치 관리자 또는 Arduino IDE에서 보이는 포트로 바꿔야 합니다. 예: `COM4`.

데모 데이터로 실행하려면 `SENSOR_PROVIDER=dummy`를 유지하면 됩니다.

## 웹 페이지 수정 방법

- 화면 구성 수정: `ArduiNow-dashboard/frontend/src/App.tsx`
- API 호출 수정: `ArduiNow-dashboard/frontend/src/api.ts`
- 스타일 수정: `ArduiNow-dashboard/frontend/src/styles.css`
- 백엔드 센서 읽기 수정: `ArduiNow-dashboard/backend/app/providers.py`
- 환경 변수 수정: `ArduiNow-dashboard/.env`

프론트엔드만 로컬로 확인할 때:

```powershell
Set-Location ArduiNow-dashboard\frontend
npm install
npm run dev
```

백엔드만 로컬로 실행할 때:

```powershell
Set-Location ArduiNow-dashboard\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## API

- `GET /api/sensors/latest`
- `GET /api/sensors/history`
- `GET /api/device/health`
- `GET /api/ping`
