# UNO Q 스마트 대시보드 로컬 MVP 설계

## 요약
- 목표는 **Arduino UNO Q 내부에서 Docker Compose로 실행되는 로컬 웹 대시보드 MVP**로 잡는다.
- 현재 JSX 초안은 UI 방향만 참고하고, 인코딩 깨짐과 JSX 오류가 있어 새 프로젝트로 재구성한다.
- 실제 센서/핀/버스는 아직 미정이므로, 1차 버전은 **더미 데이터 시뮬레이터 기반**으로 만들고 이후 실제 센서 어댑터로 교체 가능하게 한다.
- UNO Q 특성상 Debian Linux가 도는 Qualcomm Dragonwing QRB2210 쪽에서 웹/API/DB를 실행하고, 추후 STM32U585 MCU 쪽 센서 제어와 연결하는 구조로 둔다. 참고: [Qualcomm UNO Q](https://www.qualcomm.com/developer/hardware/arduino-uno-q), [Arduino UNO Q Docs](https://docs.arduino.cc/hardware/uno-q?queryID=2a0747cf1d0512f78ac99c684c20bd7c).

## 기술 스택
- 프론트엔드: **React + Vite + TypeScript + Tailwind CSS**
- UI/시각화: **lucide-react**, **Recharts**
- API 서버: **FastAPI + Python**
- 실시간 갱신: MVP는 **HTTP polling**, 이후 필요 시 WebSocket/SSE로 확장
- 데이터 저장: **SQLite**
- 배포/운영: **Docker Compose**
- 개발 품질: ESLint, Prettier, pytest, React Testing Library 또는 Playwright smoke test

## 핵심 구성
- `web` 서비스:
  - 대시보드, 센서 카드, 추세 차트, 장치 상태, 제어 패널, 이벤트 로그 화면 제공
  - 초안의 레이아웃 의도는 유지하되 텍스트와 컴포넌트는 정상 한국어/TypeScript로 재작성
  - API 실패, 로딩, 오프라인, 빈 데이터 상태를 화면에 표시
- `api` 서비스:
  - `/api/sensors/latest`: 최신 더미 센서값 반환
  - `/api/sensors/history`: 차트용 시계열 반환
  - `/api/controls`: LED, 팬, 로컬 전용, 알림 설정 조회/변경
  - `/api/device/health`: CPU, 메모리, 네트워크 등 장치 상태 반환
  - `/api/events`: 시스템 이벤트 로그 반환
- `simulator` 로직:
  - 온도, 습도, 조도, 공기질 값을 주기적으로 생성
  - 제어 상태 변경 이벤트를 SQLite에 기록
  - 나중에 실제 센서 드라이버로 바꾸기 쉽도록 `SensorProvider` 인터페이스를 둔다.
- 실제 하드웨어 연동 대비:
  - MVP에서는 `DummySensorProvider`만 구현
  - 이후 `ArduinoAppLabProvider`, `SerialProvider`, `I2CProvider` 같은 구현체를 추가할 수 있게 API 서버 내부 경계를 분리

## 프로젝트 구조
- `frontend/`: Vite React 앱
- `backend/`: FastAPI 앱, SQLite 모델, 더미 센서 provider
- `docker-compose.yml`: `frontend`, `backend` 서비스 정의
- `.env.example`: 포트, polling 간격, SQLite 경로, 모드 설정
- `README.md`: UNO Q에서 실행하는 개발/운영 절차

## 테스트 계획
- API:
  - 최신 센서값, 히스토리, 제어 상태 변경, 이벤트 로그 응답 테스트
  - 더미 데이터 범위와 timestamp 형식 검증
- 프론트엔드:
  - 대시보드 렌더링 smoke test
  - 센서 API 실패 시 fallback UI 확인
  - 제어 토글 클릭 시 API 호출 및 상태 반영 확인
- 운영:
  - `docker compose up`으로 보드/개발 PC에서 실행 확인
  - 브라우저에서 대시보드 접속, polling 갱신, 차트 표시 확인

## 명시적 가정
- 1차 버전은 **외부 접속, 사용자 계정, 클라우드 동기화, 푸시 알림, AI 기능**을 포함하지 않는다.
- 실제 센서 모델과 연결 방식이 정해지기 전까지 모든 데이터는 더미 데이터로 생성한다.
- UNO Q의 리소스를 고려해 DB는 PostgreSQL이 아니라 SQLite로 시작한다.
- Docker Compose를 기본 운영 방식으로 사용하되, 추후 리소스 문제가 있으면 systemd 직접 실행으로 전환할 수 있게 서비스 경계를 단순하게 유지한다.
