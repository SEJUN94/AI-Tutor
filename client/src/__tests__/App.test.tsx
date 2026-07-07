import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Home from '../App'; // App.tsx에 포함된 컴포넌트나 전체 App 구조 검증

// Axios 및 브라우저 API 모킹
vi.mock('axios');

// Web Speech API 및 AudioContext 가상 모킹
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
};
vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);
vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
  resume: vi.fn(),
  close: vi.fn(),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 512,
    frequencyBinCount: 256,
    getByteTimeDomainData: vi.fn(),
  })),
})));

describe('AI Tutor 스피킹 튜터 클라이언트 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. 홈 화면이 렌더링되고 OpenAI API Key 누락 메시지가 정상 표시된다', async () => {
    // API GET 요청 모킹: 멤버십 없음
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        membership: null
      }
    });

    render(<Home />);

    // AI Tutor 타이틀 감지
    expect(screen.getByText('AI 스피킹 튜터 멤버십')).toBeInTheDocument();
    
    // API Key 안내 경고 감지
    expect(screen.getByText(/실제 음성 비서 작동을 위해 OpenAI API Key/)).toBeInTheDocument();
    
    // 멤버십 미보유 대시보드 메시지 감지
    await waitFor(() => {
      expect(screen.getByText('활성화된 AI Tutor 멤버십이 없습니다.')).toBeInTheDocument();
    });
  });

  it('2. OpenAI API Key를 입력하면 로컬 스토리지에 저장되고 대화방 버튼 에러 가이드가 바뀐다', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        membership: {
          id: 1,
          user_id: 1,
          permissions: ['chatting'],
          expiration_date: new Date(Date.now() + 86400000).toISOString(),
          active: true
        }
      }
    });

    render(<Home />);

    // API Key 입력창에 값 입력
    const keyInput = screen.getByPlaceholderText('sk-proj-...');
    fireEvent.change(keyInput, { target: { value: 'sk-test-secret-key-123' } });

    // 저장 버튼 클릭
    const saveButton = screen.getByText('저장');
    fireEvent.click(saveButton);

    // localStorage에 저장 확인
    expect(localStorage.getItem('openai_api_key')).toBe('sk-test-secret-key-123');

    // 키가 설정되어 있습니다 안내 확인
    await waitFor(() => {
      expect(screen.getByText(/OpenAI API Key가 설정되어 있습니다/)).toBeInTheDocument();
    });
  });

  it('3. 대화 권한(chatting)이 있는 활성 멤버십 보유 시 대화방 이동 버튼이 활성화된다', async () => {
    // 로컬 스토리지에 키 세팅
    localStorage.setItem('openai_api_key', 'sk-test-secret-key-123');

    // 활성 멤버십(chatting 권한 보유) 모킹
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        membership: {
          id: 1,
          user_id: 1,
          permissions: ['chatting'],
          expiration_date: new Date(Date.now() + 86400000).toISOString(),
          active: true
        }
      }
    });

    render(<Home />);

    // 대화방 이동 버튼 활성화 상태 검증
    await waitFor(() => {
      const chatButton = screen.getByRole('button', { name: /AI 튜터와 대화하기/ });
      expect(chatButton).toBeEnabled();
      expect(chatButton).not.toHaveStyle({ cursor: 'not-allowed' });
    });
  });

  it('4. 대화 권한이 없거나 활성화되지 않은 멤버십 보유 시 대화방 이동 버튼이 비활성화된다', async () => {
    localStorage.setItem('openai_api_key', 'sk-test-secret-key-123');

    // 비활성 멤버십(학습 전용 권한만 보유) 모킹
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        membership: {
          id: 1,
          user_id: 1,
          permissions: ['learning'],
          expiration_date: new Date(Date.now() + 86400000).toISOString(),
          active: true
        }
      }
    });

    render(<Home />);

    // 대화방 이동 버튼 비활성화 및 경고 텍스트 확인
    await waitFor(() => {
      const chatButton = screen.getByRole('button', { name: /AI 튜터와 대화하기/ });
      expect(chatButton).toBeDisabled();
      expect(screen.getByText('대화(chatting) 권한이 있는 멤버십이 필요합니다.')).toBeInTheDocument();
    });
  });
});
