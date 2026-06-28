import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  CreditCard, 
  Mic, 
  MicOff, 
  Play, 
  Volume2, 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  PlusCircle, 
  CheckCircle,
  Clock,
  Key,
  Info
} from 'lucide-react';

const BACKEND_API = "http://localhost:3000/api/v1";
const USER_ID = 1; // 테스트용 고정 유저 ID

// 영어 회화 학습 유도용 System Prompt
const SYSTEM_PROMPT = 
  "You are Toby, an empathetic, professional English tutor from Ringle. " +
  "Your goal is to help the user practice English conversational speaking. " +
  "Engage in a natural dialogue, keep your responses concise (2-3 sentences max), " +
  "correct minor grammar mistakes gently if necessary, and always prompt the user with a natural follow-up question to keep the conversation flowing.";

interface Membership {
  id: number;
  user_id: number;
  permissions: string[];
  expiration_date: string;
  active: boolean;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  audioUrl?: string; // TTS 재생용 파일 URL
}

// ----------------------------------------------------
// [공통] 대화 화면 진입 가드 (Membership Guard)
// ----------------------------------------------------
interface GuardProps {
  children: React.ReactElement;
  hasAccess: boolean;
  loading: boolean;
}

const MembershipGuard: React.FC<GuardProps> = ({ children, hasAccess, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#020617' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '5px solid rgba(99, 102, 241, 0.2)', borderTop: '5px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#94A3B8' }}>멤버십 정보를 확인하는 중입니다...</p>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return hasAccess ? children : <Navigate to="/" replace />;
};

// ----------------------------------------------------
// [화면 1] 홈 화면 (Home Component)
// ----------------------------------------------------
const Home: React.FC<{ membership: Membership | null; fetchStatus: () => void }> = ({ membership, fetchStatus }) => {
  const navigate = useNavigate();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>(['learning', 'chatting']);
  const [adminDays, setAdminDays] = useState(30);
  const [showToast, setShowToast] = useState<string | null>(null);
  
  // OpenAI API Key 관리 상태
  const [apiKey, setApiKey] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key') || '';
    setApiKey(savedKey);
    if (!savedKey) {
      setShowKeyForm(true);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey.trim());
    triggerToast("OpenAI API Key가 성공적으로 저장되었습니다.");
    setShowKeyForm(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    triggerToast("OpenAI API Key가 삭제되었습니다.");
    setShowKeyForm(true);
  };

  // 멤버십 구매 (Mock 결제 연동)
  const purchaseMembership = async (planType: string) => {
    setPurchaseLoading(planType);
    try {
      await axios.post(`${BACKEND_API}/payments/purchase_membership`, {
        user_id: USER_ID,
        plan_type: planType
      });
      triggerToast(`${planType === 'all-in-one' ? '올인원' : planType === 'chatting_only' ? '대화 전용' : '학습 전용'} 멤버십 결제 성공!`);
      fetchStatus();
    } catch (error: any) {
      console.error(error);
      triggerToast(error.response?.data?.error || "결제 처리 중 에러가 발생했습니다.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  // 어드민 강제 부여
  const handleAdminAssign = async () => {
    setAdminLoading(true);
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + adminDays);
      
      await axios.post(`${BACKEND_API}/admin/users/${USER_ID}/membership`, {
        membership: {
          permissions: adminPermissions,
          expiration_date: expiry.toISOString()
        }
      });
      triggerToast("어드민 권한으로 멤버십이 강제 부여되었습니다.");
      fetchStatus();
    } catch (error: any) {
      console.error(error);
      triggerToast("부여 중 오류 발생: " + (error.response?.data?.errors?.join(', ') || error.message));
    } finally {
      setAdminLoading(false);
    }
  };

  // 어드민 강제 삭제
  const handleAdminRevoke = async () => {
    setAdminLoading(true);
    try {
      await axios.delete(`${BACKEND_API}/admin/users/${USER_ID}/membership`);
      triggerToast("어드민 권한으로 멤버십이 삭제되었습니다.");
      fetchStatus();
    } catch (error: any) {
      console.error(error);
      triggerToast(error.response?.data?.error || "삭제 중 오류 발생");
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePermissionToggle = (perm: string) => {
    setAdminPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const hasChattingPermission = !!(membership?.active && membership.permissions.includes('chatting'));
  const hasSavedKey = !!localStorage.getItem('openai_api_key');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }} className="fade-in">
      {/* 토스트 알림 */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #6366F1', color: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px' }} className="fade-in">
          <CheckCircle size={20} color="#10B981" />
          <span>{showToast}</span>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 16px', borderRadius: '30px', color: '#A5B4FC', fontWeight: '500', fontSize: '0.9rem', marginBottom: '16px' }}>
          <Sparkles size={14} />
          <span>Ringle AI Tutor System</span>
        </div>
        <h1 className="title-large" style={{ margin: '0 0 10px 0' }}>AI 스피킹 튜터 멤버십</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          실제 OpenAI API 연동 및 VAD 침묵 감지가 내장된 실시간 스피킹 트레이너입니다.
        </p>
      </div>

      {/* API Key 설정 패널 */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '30px', border: hasSavedKey ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Key color={hasSavedKey ? "#10B981" : "#EF4444"} size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>OpenAI API Key 설정</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                {hasSavedKey 
                  ? "OpenAI API Key가 설정되어 있습니다. (보안을 위해 로컬 스토리지에만 저장됩니다)" 
                  : "실제 음성 비서 작동을 위해 OpenAI API Key(sk-...)를 등록해 주세요."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowKeyForm(prev => !prev)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            {showKeyForm ? "닫기" : "설정 변경"}
          </button>
        </div>

        {showKeyForm && (
          <form onSubmit={handleSaveKey} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="fade-in">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#fff',
                  fontWeight: '600',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              >
                저장
              </button>
              {hasSavedKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  키 삭제
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} />
              <span>본인 소유의 OpenAI API Key가 필요하며, Whisper STT, GPT-4o, TTS-1 요금이 호출 건수에 따라 청구될 수 있습니다.</span>
            </p>
          </form>
        )}
      </div>

      {/* 대시보드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px' }}>
        {/* 현재 멤버십 보유 현황 */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="title-medium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User color="#6366F1" />
                <span>나의 멤버십 현황</span>
              </h2>
              <span style={{ 
                background: membership?.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: membership?.active ? '#10B981' : '#EF4444',
                border: `1px solid ${membership?.active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {membership?.active ? '이용 가능' : '이용 만료'}
              </span>
            </div>

            {membership ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '6px' }}>보유 중인 대화/분석 권한</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {membership.permissions.map(perm => (
                      <span key={perm} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#A5B4FC', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500' }}>
                        {perm === 'learning' ? '📚 학습(learning)' : perm === 'chatting' ? '💬 대화(chatting)' : '📊 분석(analysis)'}
                      </span>
                    ))}
                    {membership.permissions.length === 0 && (
                      <span style={{ color: '#EF4444', fontSize: '0.85rem' }}>부여된 권한이 없습니다.</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8' }}>
                  <Clock size={16} color="#64748B" />
                  <span style={{ fontSize: '0.9rem' }}>
                    만료 기한: <strong style={{ color: '#F8FAFC' }}>{new Date(membership.expiration_date).toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8' }}>
                <ShieldAlert size={40} color="#64748B" style={{ marginBottom: '12px' }} />
                <p>활성화된 Ringle AI 멤버십이 없습니다.</p>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '6px' }}>하단의 요금제 결제를 통해 즉시 멤버십을 획득하세요.</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '30px' }}>
            <button
              onClick={() => navigate('/chat')}
              disabled={!hasChattingPermission || !hasSavedKey}
              style={{
                width: '100%',
                background: (hasChattingPermission && hasSavedKey)
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' 
                  : 'rgba(255, 255, 255, 0.05)',
                color: (hasChattingPermission && hasSavedKey) ? '#fff' : '#64748B',
                cursor: (hasChattingPermission && hasSavedKey) ? 'pointer' : 'not-allowed',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (hasChattingPermission && hasSavedKey) ? '0 10px 20px rgba(99, 102, 241, 0.25)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>AI 튜터와 대화하기</span>
              <Sparkles size={16} />
            </button>
            {(!hasChattingPermission || !hasSavedKey) && (
              <p style={{ color: '#EF4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <ShieldAlert size={12} />
                <span>
                  {!hasSavedKey 
                    ? "OpenAI API Key 등록이 필요합니다." 
                    : "대화(chatting) 권한이 있는 멤버십이 필요합니다."}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 어드민 시뮬레이터 */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 className="title-medium" style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert color="#F59E0B" />
            <span>어드민 멤버십 통제 시뮬레이터</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px' }}>
            관리자 기능 API를 호출하여 멤버십 권한을 강제로 임의 부여하거나 파괴할 수 있습니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0, 0, 0, 0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>강제 부여할 권한 조합 선택:</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['learning', 'chatting', 'analysis'].map(perm => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: adminPermissions.includes(perm) ? '#F8FAFC' : '#64748B' }}>
                    <input 
                      type="checkbox" 
                      checked={adminPermissions.includes(perm)}
                      onChange={() => handlePermissionToggle(perm)}
                      style={{ accentColor: '#6366F1' }}
                    />
                    <span>{perm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>이용 기한 설정 (일 단위):</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="number" 
                  value={adminDays} 
                  onChange={(e) => setAdminDays(Number(e.target.value))}
                  min={-30}
                  max={365}
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', width: '80px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>일간 유효 (음수 설정 시 만료 테스트 가능)</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={handleAdminAssign}
                disabled={adminLoading}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#A5B4FC',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <PlusCircle size={14} />
                <span>강제 부여/수정</span>
              </button>
              <button
                onClick={handleAdminRevoke}
                disabled={adminLoading}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#FCA5A5',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>멤버십 강제 삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 요금제 결제 섹션 */}
      <div style={{ marginTop: '40px' }}>
        <h2 className="title-medium" style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <CreditCard color="#6366F1" />
          <span>Ringle AI 요금제 구독 (Mock PG 연동)</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {/* 학습 전용 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #6366F1' }}>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1.2rem', margin: '0 0 8px 0' }}>학습 전용 패키지</p>
              <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '16px' }}>기본 영어 학습 콘텐츠 제공</p>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#F8FAFC', marginBottom: '20px' }}>₩10,000<span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '400' }}> / 30일</span></p>
              
              <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '0.85rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>📚 학습(learning) 기능 권한 부여</li>
                <li>❌ 대화(chatting) 및 AI 튜터 미포함</li>
                <li>❌ 상세 스피킹 분석 미포함</li>
              </ul>
            </div>

            <button
              onClick={() => purchaseMembership('learning_only')}
              disabled={purchaseLoading !== null}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              {purchaseLoading === 'learning_only' ? '결제 요청 중...' : '구독하기'}
            </button>
          </div>

          {/* 대화 전용 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #10B981', background: 'rgba(16, 185, 129, 0.02)' }}>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1.2rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>대화 실전 패키지</span>
                <span style={{ background: '#10B981', color: '#000', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>인기</span>
              </p>
              <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '16px' }}>AI 튜터와 무제한 영어 프리토킹</p>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#F8FAFC', marginBottom: '20px' }}>₩15,000<span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '400' }}> / 30일</span></p>
              
              <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '0.85rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>💬 대화(chatting) 기능 권한 부여</li>
                <li>🤖 실시간 피드백 AI 튜터 Toby 지원</li>
                <li>❌ 상세 에디터 분석 미포함</li>
              </ul>
            </div>

            <button
              onClick={() => purchaseMembership('chatting_only')}
              disabled={purchaseLoading !== null}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              {purchaseLoading === 'chatting_only' ? '결제 요청 중...' : '구독하기'}
            </button>
          </div>

          {/* 올인원 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #F59E0B' }}>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1.2rem', margin: '0 0 8px 0' }}>종합 올인원 마스터</p>
              <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '16px' }}>Ringle AI의 모든 핵심 기능 포함</p>
              <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#F8FAFC', marginBottom: '20px' }}>₩30,000<span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '400' }}> / 30일</span></p>
              
              <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '0.85rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>📚 학습 + 💬 대화 + 📊 분석 모두 활성화</li>
                <li>🤖 실시간 AI 튜터 Toby & 맞춤 피드백</li>
                <li>📈 주간 정밀 회화 성장 리포트 제공</li>
              </ul>
            </div>

            <button
              onClick={() => purchaseMembership('all-in-one')}
              disabled={purchaseLoading !== null}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              {purchaseLoading === 'all-in-one' ? '결제 요청 중...' : '구독하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// [화면 2] 대화 화면 (Chat Component - 실효 API 연동)
// ----------------------------------------------------
const Chat: React.FC = () => {
  const navigate = useNavigate();
  
  // 상태 변수
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I'm Toby, your Ringle AI tutor. Let's practice English speaking today. What topic would you like to discuss?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // STT or LLM 응답 대기 상태
  const [processingStatus, setProcessingStatus] = useState(''); // 진행 현황 메시지
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 ~ 100 마이크 오디오 음압
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  
  // VAD(음성 감지) & 침묵 감지용 타이머
  const [vadState, setVadState] = useState<'IDLE' | 'SPEAKING' | 'SILENT_WAITING'>('IDLE');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // OpenAI API Key
  const apiKey = localStorage.getItem('openai_api_key') || '';

  // 오디오 API 관련 Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // 음성 출력을 위한 HTMLAudioElement 레퍼런스 관리 (기존 재생 중단용)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // VAD 침묵 타이머 Ref
  const silenceTimerRef = useRef<any>(null);
  const silenceCountIntervalRef = useRef<any>(null);
  
  // 오남용 방지: 15초 동안 아무 소리도 감지되지 않으면 녹음 해제
  const absoluteSilenceTimerRef = useRef<any>(null);
  
  // 스크롤 동기화 Ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 실시간 로컬 STT를 위한 SpeechRecognition 레퍼런스
  const recognitionRef = useRef<any>(null);
  const recognitionTextRef = useRef<string>('');

  // 마이크 노이즈 필터 기준치 (VAD 스레스홀드)
  const VAD_THRESHOLD = 0.015;
  const SILENCE_LIMIT_SEC = 2.5; // 2.5초 이상 침묵 시 자동 완료

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 첫 진입 시 AI 인삿말 자동 리딩 (TTS API 연동)
    if (messages.length === 1 && messages[0].sender === 'ai') {
      synthesizeAndPlayTTS(messages[0].text, 0);
    }

    return () => {
      // 컴포넌트 언마운트 시 모든 오디오 및 리액션 클린업
      cleanupAudioAndVAD();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanupAudioAndVAD = () => {
    // TTS 중지
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    
    // 브라우저 합성 중지
    window.speechSynthesis.cancel();
    
    // 오디오 컨텍스트 닫기
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    // 마이크 스트림 트랙 중지
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // 애니메이션 프레임 중지
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 타이머 클리어
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceCountIntervalRef.current) clearInterval(silenceCountIntervalRef.current);
    if (absoluteSilenceTimerRef.current) clearTimeout(absoluteSilenceTimerRef.current);

    // 실시간 STT 중지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // ----------------------------------------------------
  // [브라우저 내장 TTS 백업] SpeechSynthesis 사용
  // ----------------------------------------------------
  const playBrowserTTS = (text: string, messageIndex: number) => {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    // 영어 원어민 보이스 검색
    const voices = window.speechSynthesis.getVoices();
    const engVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
    if (engVoice) {
      utterance.voice = engVoice;
    }

    utterance.onstart = () => {
      setCurrentlyPlayingIndex(messageIndex);
    };
    utterance.onend = () => {
      setCurrentlyPlayingIndex(null);
    };
    utterance.onerror = (e) => {
      console.error("브라우저 내장 TTS 재생 실패:", e);
      setCurrentlyPlayingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ----------------------------------------------------
  // [AI 서비스 1] OpenAI TTS (Text-to-Speech) API 연동 (실패 시 로컬 TTS 폴백)
  // ----------------------------------------------------
  const synthesizeAndPlayTTS = async (text: string, messageIndex: number) => {
    // 기존 재생 중인 사운드가 있다면 정지
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setCurrentlyPlayingIndex(null);
    }
    window.speechSynthesis.cancel();

    // 이미 생성된 오디오 캐시 URL이 있으면 즉시 재생
    if (messages[messageIndex]?.audioUrl) {
      if (currentlyPlayingIndex === messageIndex) {
        setCurrentlyPlayingIndex(null);
        return;
      }
      playLocalAudio(messages[messageIndex].audioUrl!, messageIndex);
      return;
    }

    if (!apiKey) {
      // API Key가 없으면 브라우저 로컬 내장 TTS 구동
      playBrowserTTS(text, messageIndex);
      return;
    }

    setCurrentlyPlayingIndex(messageIndex);
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy"
        })
      });

      if (!response.ok) throw new Error("OpenAI TTS API 호출 에러");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // 캐시 주입
      setMessages(prev => {
        const next = [...prev];
        if (next[messageIndex]) {
          next[messageIndex].audioUrl = audioUrl;
        }
        return next;
      });

      playLocalAudio(audioUrl, messageIndex);

    } catch (error) {
      console.warn("OpenAI TTS 실패로 브라우저 내장 TTS 로컬 엔진으로 폴백 재생합니다:", error);
      // 로컬 음성 엔진으로 자동 전환
      playBrowserTTS(text, messageIndex);
    }
  };

  const playLocalAudio = (url: string, index: number) => {
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setCurrentlyPlayingIndex(index);

    audio.play().catch(err => {
      console.warn("HTML5 Audio Autoplay 차단 감지, 브라우저 로컬 스피치로 폴백 재생:", err);
      // 자동 재생 정책 우회를 위해 스피치 API 폴백 구동
      playBrowserTTS(messages[index]?.text || "", index);
    });

    audio.onended = () => {
      setCurrentlyPlayingIndex(null);
    };
    audio.onerror = () => {
      setCurrentlyPlayingIndex(null);
    };
  };

  // ----------------------------------------------------
  // [VAD 기능] Web Audio API 기반 오디오 RMS VAD 구현
  // ----------------------------------------------------
  const startRecording = async () => {
    if (isProcessing) return;
    cleanupAudioAndVAD();
    
    // 브라우저 오디오 시스템 언락 (Autoplay 정책 우회 활성화)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    audioChunksRef.current = [];
    setVolumeLevel(0);
    setVadState('IDLE');
    setSilenceCountdown(null);
    recognitionTextRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. MediaRecorder 세팅
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 데이터 누수가 생기지 않도록 150ms 딜레이 후 STT 전송을 보장하는 타이밍 해결
        setTimeout(() => {
          processSTTAndLLM();
        }, 150);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // 2. Web Audio Analyser VAD 프로세서 세팅
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let hasSpokenOnce = false;

      // 15초 절대 침묵 오남용 제한 타이머 설정
      absoluteSilenceTimerRef.current = setTimeout(() => {
        if (!hasSpokenOnce) {
          stopRecordingGracefully(true);
        }
      }, 15000);

      // 3. 브라우저 실시간 웹 스피치 인식(STT) 병행 기동 ( Whisper 실패 우려 보완 및 레이턴시 0초 지원 )
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim().length > 0) {
            recognitionTextRef.current = currentText;
            hasSpokenOnce = true; // 소리가 안 나도 텍스트가 캡처되면 말한 것으로 인식
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("SpeechRecognition 경고 (Whisper API로 백업 구동 예정):", e);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      // 실시간 VAD 오디오 RMS 계측 및 피드백 프레임 루프
      const checkAudioFrame = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(dataArray);

        // RMS (Root Mean Square) 음량 계산
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);

        // 0~100 스케일 볼륨 레벨 (UI Waveform 애니메이션 매핑용)
        const mappedVolume = Math.min(Math.round(rms * 400), 100);
        setVolumeLevel(mappedVolume);

        // 목소리 감지 임계값(VAD Threshold) 체크
        if (rms > VAD_THRESHOLD) {
          hasSpokenOnce = true;
          setVadState('SPEAKING');
          setSilenceCountdown(null);
          
          // 타이머 초기화
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (silenceCountIntervalRef.current) {
            clearInterval(silenceCountIntervalRef.current);
            silenceCountIntervalRef.current = null;
          }
        } else {
          // 침묵 중인 경우
          if (hasSpokenOnce) {
            setVadState('SILENT_WAITING');
            
            // 2.5초 무음 자동 완료 타이머 실행
            if (!silenceTimerRef.current) {
              let count = SILENCE_LIMIT_SEC;
              setSilenceCountdown(count);

              // 카운트다운 인터벌
              silenceCountIntervalRef.current = setInterval(() => {
                count = Math.max(0, Number((count - 0.5).toFixed(1)));
                setSilenceCountdown(count);
              }, 500);

              // 2.5초 완료 핸들러
              silenceTimerRef.current = setTimeout(() => {
                stopRecordingGracefully(false);
              }, SILENCE_LIMIT_SEC * 1000);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioFrame);
      };

      checkAudioFrame();

    } catch (error) {
      console.error("마이크 접근 거부:", error);
      alert("마이크 사용 권한이 거부되었거나 마이크를 로드할 수 없습니다. 브라우저 주소창 왼쪽의 마이크 허용 설정을 확인해 주세요.");
      setIsRecording(false);
    }
  };

  // 녹음 정상 종료
  const stopRecordingGracefully = (isCancel: boolean = false) => {
    // 실시간 STT 엔진 명시적 정지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    cleanupAudioAndVAD();
    setIsRecording(false);
    setVolumeLevel(0);

    if (isCancel) {
      setVadState('IDLE');
      setSilenceCountdown(null);
      alert("15초간 음성 입력이 감지되지 않아 마이크가 자동으로 꺼졌습니다.");
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // ----------------------------------------------------
  // [AI 서비스 2] OpenAI Whisper STT API 연동 (실패 시 로컬 STT 엔진 폴백)
  // ----------------------------------------------------
  const processSTTAndLLM = async () => {
    setIsProcessing(true);
    setProcessingStatus("음성을 분석하고 텍스트로 변환하는 중...");

    let userText = recognitionTextRef.current;

    // 만약 로컬 브라우저 STT가 중간에 씹혔거나 결과가 안 나왔을 경우 OpenAI Whisper API 백업 기동
    if (!userText || userText.trim().length === 0) {
      if (audioChunksRef.current.length === 0) {
        setIsProcessing(false);
        setProcessingStatus('');
        alert("입력된 오디오 조각이 없습니다. 다시 말씀해 주세요.");
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // 영어 고정

      try {
        if (!apiKey) throw new Error("API Key가 누락되었습니다.");

        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "multipart/form-data"
          }
        });
        userText = response.data.text;
      } catch (error: any) {
        console.warn("OpenAI Whisper API 요청 실패. 로컬 녹음 대체 텍스트를 검출합니다.", error);
      }
    }

    // 최종 번역 텍스트 확인
    if (!userText || userText.trim().length === 0) {
      alert("음성을 감지하지 못했거나 API 키 한도/연동에 문제가 발생했습니다. 키 상태와 크레딧을 점검해 주세요.");
      setIsProcessing(false);
      setProcessingStatus('');
      return;
    }

    // 유저 메시지 화면 추가
    const userMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    // STT 성공 시 이어서 GPT LLM 응답(스트리밍) 호출
    await processLLMResponse(userText);
  };

  // ----------------------------------------------------
  // [AI 서비스 3 & 4] GPT-4o Streaming (LLM) & 실시간 재생 자동화
  // ----------------------------------------------------
  const processLLMResponse = async (userText: string) => {
    setProcessingStatus("AI Toby의 생각을 정리하는 중...");

    // 대화 히스토리 구성
    const historyMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // 새로운 질문 포함
    historyMessages.push({ role: 'user', content: userText });

    // 신규 AI 메시지 버블 추가를 위한 빈 템플릿 삽입
    const aiMsgIndex = messages.length + 1; // 유저 메시지 추가된 다음 인덱스
    const initialAIMsg: Message = {
      sender: 'ai',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, initialAIMsg]);

    try {
      if (!apiKey) throw new Error("API Key가 누락되었습니다.");

      // Fetch API를 이용한 OpenAI Chat Stream 연결
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...historyMessages
          ],
          stream: true
        })
      });

      if (!response.ok) throw new Error("LLM 요청 실패");
      
      setProcessingStatus("AI Toby가 답변을 출력하는 중...");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = '';
      let streamBuffer = '';

      if (!reader) throw new Error("스트림을 읽어올 수 없습니다.");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 청크 데이터 분할 유실 방지를 위한 버퍼링
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        
        // 미완성 상태의 마지막 라인은 다음 수신을 위해 버퍼에 보존
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const cleanedLine = line.replace(/^data: /, '').trim();
          if (cleanedLine === '' || cleanedLine === '[DONE]') continue;

          try {
            const parsed = JSON.parse(cleanedLine);
            const content = parsed.choices[0]?.delta?.content || '';
            
            if (content) {
              fullText += content;
              // 인덱싱 오차를 원천 차단하기 위해 리스트의 가장 최근 AI 말풍선 텍스트 갱신
              setMessages(prev => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i--) {
                  if (next[i].sender === 'ai') {
                    next[i].text = fullText;
                    break;
                  }
                }
                return next;
              });
            }
          } catch (err) {
            // 불완전 라인 파싱 에러 방지
          }
        }
      }

      // 스트리밍이 완벽하게 완료된 후, 음성(TTS)을 합성하고 재생
      setProcessingStatus('');
      setIsProcessing(false);

      // 실제 반영된 AI 말풍선 인덱스를 안전하게 계산하여 재생
      setMessages(prev => {
        const actualIndex = prev.map((m, i) => ({ m, i })).reverse().find(item => item.m.sender === 'ai')?.i;
        if (actualIndex !== undefined) {
          synthesizeAndPlayTTS(fullText, actualIndex);
        }
        return prev;
      });

    } catch (error) {
      console.warn("OpenAI LLM 에러. 모의 피드백 응답으로 대체 재생합니다:", error);
      
      // OpenAI API 키가 작동하지 않거나 만료되었을 때, 영어 학습 튜터 흐름을 끊지 않기 위해 유용한 Local 가상 피드백 생성
      const mockResponses = [
        "That's a very interesting point! English speaking is all about building confidence. What did you think about my last point?",
        "I completely understand your perspective. Many English learners face similar challenges. How often do you practice conversation?",
        "Great job sharing your thoughts! Your grammar is quite good. Let's try to expand on that. Tell me more about your experience.",
        "Fascinating feedback! Indeed, technology makes English learning more accessible. Have you tried speaking with AI before?"
      ];
      
      const fallbackText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      setMessages(prev => {
        const next = [...prev];
        if (next[aiMsgIndex]) {
          next[aiMsgIndex].text = fallbackText;
        }
        return next;
      });
      setIsProcessing(false);
      setProcessingStatus('');
      
      // 로컬 음성(TTS)으로 폴백 재생
      playBrowserTTS(fallbackText, aiMsgIndex);
    }
  };

  // 마이크 볼륨에 따른 동적 높이 바 렌더러
  const getDynamicHeight = (barIndex: number) => {
    if (!isRecording) return '8px';
    // 볼륨 레벨에 따른 진폭 매핑 (0 ~ 100)
    const factor = [0.3, 0.6, 0.9, 1.2, 0.7, 0.4][barIndex] || 0.5;
    const heightVal = Math.max(8, Math.min(48, Math.round(volumeLevel * factor)));
    return `${heightVal}px`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', padding: '20px' }} className="fade-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
        <button 
          onClick={() => {
            cleanupAudioAndVAD();
            navigate('/');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.color = '#F8FAFC'}
          onMouseOut={(e) => e.currentTarget.style.color = '#94A3B8'}
        >
          <ArrowLeft size={18} />
          <span>대화 종료 (홈으로)</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '600' }}>AI Toby - Real-time Connected</span>
        </div>
      </div>

      {/* 브라우저 오디오 오토플레이 경고 힌트 배너 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#94A3B8', fontSize: '0.8rem', marginBottom: '16px' }}>
        <Info size={14} color="#6366F1" />
        <span>💡 음성이 들리지 않으면 말풍선의 **'다시 듣기'** 버튼을 누르거나, 화면을 마우스로 클릭해 보세요!</span>
      </div>

      {/* 대화 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
        {messages.map((msg, index) => (
          <div 
            key={index}
            className="fade-in"
            style={{ 
              display: 'flex', 
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%' 
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '6px', marginLeft: msg.sender === 'ai' ? '12px' : 0, marginRight: msg.sender === 'user' ? '12px' : 0 }}>
                {msg.sender === 'ai' ? '🤖 AI Tutor Toby' : '👤 나'}
              </span>

              <div 
                style={{ 
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px 20px',
                  borderRadius: msg.sender === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                  color: '#F8FAFC',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(79, 70, 229, 0.2)' : 'none',
                  position: 'relative'
                }}
              >
                {msg.text === '' ? (
                  /* 스트리밍 대기 모드 로딩 */
                  <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                    <div style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></div>
                    <div style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></div>
                    <div style={{ width: '8px', height: '8px', background: '#94A3B8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>{msg.text}</p>
                )}
                
                {msg.text !== '' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', gap: '10px' }}>
                    <button 
                      onClick={() => synthesizeAndPlayTTS(msg.text, index)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        fontSize: '0.75rem', 
                        color: currentlyPlayingIndex === index ? '#10B981' : '#94A3B8',
                        fontWeight: '500'
                      }}
                    >
                      {currentlyPlayingIndex === index ? <Volume2 size={12} className="pulse-record" /> : <Play size={12} />}
                      <span>{currentlyPlayingIndex === index ? '말하는 중...' : '다시 듣기'}</span>
                    </button>
                  </div>
                )}
              </div>

              <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', marginRight: '6px' }}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        
        {/* 진행 중 상태바 */}
        {isProcessing && (
          <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', color: '#A5B4FC', fontSize: '0.85rem', width: 'fit-content' }}>
            <div style={{ width: '12px', height: '12px', border: '2px solid rgba(99, 102, 241, 0.2)', borderTop: '2px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span>{processingStatus}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 오디오/마이크 입력부 (Footer) */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(15, 23, 42, 0.8)' }}>
        {isRecording ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }} className="fade-in">
            {/* VAD 피드백 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
              {vadState === 'SPEAKING' ? (
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', animation: 'flash 0.5s infinite alternate' }}></span>
                  음성 신호 감지 중...
                </span>
              ) : vadState === 'SILENT_WAITING' ? (
                <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#F59E0B', borderRadius: '50%', animation: 'flash 0.5s infinite alternate' }}></span>
                  침묵 감지됨: {silenceCountdown}초 후 자동 완료
                </span>
              ) : (
                <span style={{ color: '#94A3B8' }}>주변 소음 감쇄 중... 말씀해 주세요.</span>
              )}
            </div>

            {/* 마이크 진폭에 맞춰 동적으로 변형하는 Waveform 파형 */}
            <div className="waveform">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div 
                  key={idx} 
                  className="waveform-bar"
                  style={{ 
                    height: getDynamicHeight(idx),
                    transition: 'height 0.08s ease-out'
                  }}
                ></div>
              ))}
            </div>

            <button
              onClick={() => stopRecordingGracefully(false)}
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#fff',
                padding: '12px 30px',
                borderRadius: '30px',
                fontWeight: '700',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              <span>답변 완료 (녹음 종료)</span>
              <MicOff size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} className="fade-in">
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
              {isProcessing ? "AI 튜터가 처리 중입니다..." : "마이크 버튼을 눌러 답변 녹음을 시작하세요."}
            </p>
            
            <button
              onClick={startRecording}
              disabled={isProcessing}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isProcessing ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isProcessing ? 'none' : '0 8px 25px rgba(99, 102, 241, 0.4)',
                color: isProcessing ? '#64748B' : '#fff',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={(e) => { if (!isProcessing) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Mic size={28} />
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes flash { 0% { opacity: 0.3; } 100% { opacity: 1; } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ----------------------------------------------------
// [라우터] 메인 App 라우터 구조
// ----------------------------------------------------
const App: React.FC = () => {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembershipStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_API}/admin/users/${USER_ID}/membership`);
      setMembership(response.data.membership);
    } catch (error) {
      console.error("멤버십 데이터를 불러오는데 실패했습니다.", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembershipStatus();
  }, []);

  const hasChatAccess = !!(membership?.active && membership.permissions.includes('chatting'));

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<Home membership={membership} fetchStatus={fetchMembershipStatus} />} 
        />
        <Route 
          path="/chat" 
          element={
            <MembershipGuard hasAccess={hasChatAccess} loading={loading}>
              <Chat />
            </MembershipGuard>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
