# Ringle AI Tutor - AI Membership & Speech Tutoring Application

이 프로젝트는 Ruby on Rails 기반의 백엔드와 Vite React + TypeScript 기반의 프론트엔드를 결합하여 구현한 **Ringle AI 튜터 멤버십 관리 및 실시간 영어 회화 트레이닝 웹 애플리케이션**입니다.

브라우저 내장 Web Speech API와 OpenAI API를 융합한 **이중 하이브리드 인공지능 엔진**과 **로컬 오디오 RMS 분석 VAD**를 탑재하여 요금 장벽과 통신 딜레이를 혁신적으로 최소화한 회화 학습 UX를 제공합니다.

---

## 1. 기술 스택 및 설계 선정 배경

### Backend (Ruby on Rails + SQLite)
- **Ruby on Rails (API Mode)**: 생산성 높은 Rails 프레임워크를 기반으로 멤버십 비즈니스 도메인과 어드민 강제 관리 API를 빠르게 설계했습니다.
- **SQLite3**: 로컬 테스트 가벼움과 데이터 영구 보존의 균형을 맞추기 위해 사용했습니다.
- **RSpec**: API 기능 및 비즈니스 모델(구독 일수 누적 연장, 권한 병합)의 엄격한 단위 및 통합 테스트를 위해 적용했습니다.

### Frontend (Vite + React + TypeScript)
- **Vite React (TS)**: 최첨단 프론트엔드 빌드 도구인 Vite를 사용해 타입 세이프하고 번들링 속도가 빠른 컴포넌트 환경을 구축했습니다.
- **Vanilla CSS (Glassmorphism)**: 팝업과 컴포넌트 전체에 세련된 다크 Glassmorphism 스타일을 직접 적용해, 모던하고 미래지향적인 네온 컬러 중심의 비주얼 디자인을 극대화했습니다.

### AI API 및 오디오 엔지니어링 (Hybrid Dual Engine)
- **Speech-to-Text (STT)**: 
  - **1순위 (로컬 브라우저)**: 브라우저 내장 `SpeechRecognition` 엔진을 백그라운드로 실행해, 통신 딜레이(0초)를 실현하고 Whisper 전송 비용을 없앴습니다.
  - **2순위 (OpenAI Whisper-1)**: 로컬 인식이 원활하지 않거나 비어 있을 시, MediaRecorder 수집 바이너리를 OpenAI Whisper API로 연계 구동하도록 2중 보안을 설계했습니다.
- **Text-to-Speech (TTS)**:
  - **1순위 (OpenAI TTS-1)**: `alloy` 음색을 이용해 고품질 자동 영어 리딩 사운드를 송출합니다.
  - **2순위 (브라우저 SpeechSynthesis)**: API Key 만료, 결제 크레딧 부족, 혹은 오토플레이 보안 정책 차단 발생 시 브라우저 내장 무료 음성 합성 엔진으로 자동 폴백(Fallback)되어 영어 음성이 언제나 100% 정상 출력되도록 설계했습니다.
- **VAD (Voice Activity Detection)**: 
  - 외부 WASM 다운로드 리스크 없이 **Web Audio API**를 사용해 로컬 오디오 데시벨(RMS)을 실시간 추적합니다.
  - 음압에 맞춰 하단 Waveform 애니메이션이 동적으로 물결치며, 유저가 말을 멈추면 **2.5초 뒤 침묵을 감지해 자동으로 답변을 확정/제출**합니다.
  - 마이크가 켜진 채로 15초간 아무런 대화가 감지되지 않으면 마이크를 자동 종료하는 오남용 방지 가드가 내장되어 있습니다.

---

## 2. 로컬 실행 방법 (Quick Start)

### 윈도우 Cmd 환경에서 직접 구동하기

#### [백엔드 API 서버 기동]
프로젝트 루트 디렉토리(`\Ringle-AI`)에서 실행합니다:
```cmd
:: 1. 컨테이너 이미지 빌드
podman build -t ringle-ai-web .

:: 2. 데이터베이스 마이그레이션 실행
podman run --rm -v \Ringle-AI:/app:Z ringle-ai-web bundle exec rails db:migrate

:: 3. 테스트 시드 데이터 적재 (유저 ID 1번 생성)
podman run --rm -v \Ringle-AI:/app:Z ringle-ai-web bundle exec rails db:seed

:: 4. Rails API 서버 구동 (포트 3000)
podman run -it --name ringle-backend --rm -v \Ringle-AI:/app:Z -p 3000:3000 localhost/ringle-ai-web bundle exec rails server -b 0.0.0.0
```

#### [프론트엔드 개발 서버 기동]
새 창을 열어 `client` 디렉토리(`\Ringle-AI\client`)로 이동한 후 실행합니다:
```bash
# 1. 의존성 모듈 설치
npm install

# 2. Vite React 개발 서버 실행 (포트 5173)
npm run dev
```

브라우저에서 **[http://localhost:5173](http://localhost:5173)** 으로 접속하여 테스트를 체험하세요.

---

## 3. 테스트 및 검증 방법

### 1) 백엔드 Rails API 테스트 (RSpec)
데이터베이스 멤버십 활성 여부 판단 로직, 기간 만료 시 차단, 구독 시 기존 권한 결합 및 기한 누적 추가, 어드민 제어 컨트롤러 기능을 26개 예제를 통해 엄격히 테스트합니다.
- 실행 명령어:
  ```bash
  podman run --rm -v \Ringle-AI:/app:Z localhost/ringle-ai-web bundle exec rspec
  ```
- 검증 결과: `26 examples, 0 failures` (100% 통과 완료)

### 2) 프론트엔드 React UI 테스트 (Vitest + React Testing Library)
홈 화면 렌더링, 로컬 스토리지 API Key 바인딩, 멤버십 미보유 및 대화(chatting) 권한 만료 상태에 따른 '/chat' 대화방 진입 가드 비활성화 로직을 Mocking하여 안정적으로 검증합니다.
- 실행 명령어 (client 디렉토리):
  ```bash
  npm run test
  ```
- 검증 결과: `4 passed (4 tests)` (100% 통과 완료)
