import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

const ViewQuestions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [testData, setTestData] = useState(location.state?.data || null);
  const [loading, setLoading] = useState(!location.state?.data);
  const [userSelections, setUserSelections] = useState({});
  const [showModal, setShowModal] = useState(false);
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  const mode = location.state?.mode || 'exam'; 

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const isManuallyStopped = useRef(false); 
  const isChangingSpeed = useRef(false); 
  const isNavigating = useRef(false); 
  const rateRef = useRef(1); 

  const isFirstQ = currentQIndex === 0;
  const isLastQ = testData ? currentQIndex === testData.questions.length - 1 : false;

  useEffect(() => {
    if (mode === 'timer' && !showModal && testData) {
      if (timeLeft === 0) handleNextOrFinish();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, currentQIndex, mode, showModal, testData]);

  useEffect(() => {
    if (testData && mode === 'practice') {
      const autoSelect = {};
      testData.questions.forEach((q, index) => {
        autoSelect[index] = parseInt(q.answer);
      });
      setUserSelections(autoSelect);
    }
  }, [testData, mode]);

  const stopSpeech = () => {
    isManuallyStopped.current = true; 
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleClosePlayer = () => {
    stopSpeech();
    setShowPlayer(false);
    setCurrentQIndex(0); 
  };

  const speakSequence = (index) => {
    if (!testData || index < 0 || index >= testData.questions.length || isManuallyStopped.current) {
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    
    setCurrentQIndex(index);
    setIsSpeaking(true);

    const element = document.getElementById(`q-card-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const q = testData.questions[index];
    const labels = ["A", "B", "C", "D"];
    const options = [q.a, q.b, q.c, q.d];
    const correctIdx = parseInt(q.answer);

    const textToSpeak = `अगला क्वेश्चन है, ${q.question}. 
       ए, ${q.a}. 
       बी, ${q.b}. 
       सी, ${q.c}. 
       डी, ${q.d}. 
      सही आंसर है, ${labels[correctIdx]}, ${options[correctIdx]}.`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = rateRef.current;

    utterance.onend = () => {
      if (isChangingSpeed.current || isNavigating.current || isManuallyStopped.current) {
        return;
      }

      if (index + 1 < testData.questions.length) {
        setTimeout(() => {
          if (!isManuallyStopped.current && !isChangingSpeed.current && !isNavigating.current) {
            speakSequence(index + 1);
          }
        }, 800);
      } else {
        setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      isManuallyStopped.current = false;
      isChangingSpeed.current = false;
      isNavigating.current = false;
      speakSequence(currentQIndex);
    }
  };

  const handleNavigation = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= testData.questions.length) return;

    isNavigating.current = true; 
    window.speechSynthesis.cancel(); 

    setTimeout(() => {
      isNavigating.current = false; 
      if (!isManuallyStopped.current) {
        speakSequence(targetIndex);
      }
    }, 400); 
  };

  const handleRateChange = (e) => {
    const newRate = parseFloat(e.target.value);
    
    isChangingSpeed.current = true; 
    setPlaybackRate(newRate);
    rateRef.current = newRate; 
    
    window.speechSynthesis.cancel();

    setTimeout(() => {
      isChangingSpeed.current = false; 
      if (isSpeaking && !isManuallyStopped.current) {
        speakSequence(currentQIndex); 
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      isManuallyStopped.current = true;
    };
  }, []);

  const handleNextOrFinish = () => {
    if (currentQIndex < testData.questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setTimeLeft(15);
    } else {
      handleFinishQuiz();
    }
  };

  const handleOptionClick = (qIdx, selectedIdx) => {
    if (mode === 'practice' || ((mode === 'exam' || mode === 'timer') && userSelections[qIdx] !== undefined)) return;
    if (selectedIdx === parseInt(testData.questions[qIdx].answer)) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
    }
    setUserSelections(prev => ({ ...prev, [qIdx]: selectedIdx }));
    if (mode === 'timer') setTimeout(() => handleNextOrFinish(), 800);
  };

  const handleFinishQuiz = async () => {
    stopSpeech();
    setShowModal(true);
  };

  if (loading || !testData) return <div style={centerMsg}>Loading...</div>;

  return (
    <div style={containerStyle}>
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back</button>
        
        {mode === 'practice' && (
          <button 
            onClick={() => { setShowPlayer(true); if(!isSpeaking) handleTogglePlay(); }} 
            style={speakerBtnStyle}
          >
            {isSpeaking ? '🔊' : '🔈'}
          </button>
        )}

        <header style={headerStyle}>
          <h1 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#1e293b' }}>{testData.testName}</h1>
          <span style={modeBadgeStyle(mode)}>{mode.toUpperCase()} MODE</span>
        </header>
      </div>

      <div style={{ padding: '0 20px 240px 20px' }}>
        {testData.questions.map((item, idx) => {
          const isActive = isSpeaking && currentQIndex === idx;
          const correctIdx = parseInt(item.answer);
          return (
            <div key={idx} id={`q-card-${idx}`} style={{
              ...questionCardStyle,
              border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              backgroundColor: isActive ? '#f0f9ff' : '#fff'
            }}>
              <h3 style={questionTextStyle}><span style={{color: '#3b82f6'}}>{idx + 1}.</span> {item.question}</h3>
              <div style={optionsGridStyle}>
                {[item.a, item.b, item.c, item.d].map((opt, oIdx) => (
                  <div key={oIdx} style={{
                    ...optionItemStyle,
                    backgroundColor: oIdx === correctIdx ? '#d1fae5' : '#fff',
                    borderColor: oIdx === correctIdx ? '#10b981' : '#e2e8f0'
                  }}>
                    <strong>{String.fromCharCode(65+oIdx)})</strong> {opt}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showPlayer && (
        <div style={playerCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Player Q{currentQIndex + 1} of {testData.questions.length}</span>
            <button onClick={handleClosePlayer} style={closeBtnStyle}>✕</button>
          </div>
          
          <div style={playerControlsRow}>
            <button 
              disabled={isFirstQ}
              onClick={() => handleNavigation(currentQIndex - 1)} 
              style={{
                ...playerSmallBtn, 
                opacity: isFirstQ ? 0.3 : 1, 
                cursor: isFirstQ ? 'not-allowed' : 'pointer'
              }}
            >
              Prev
            </button>

            <button onClick={handleTogglePlay} style={playerMainBtn}>{isSpeaking ? 'STOP' : 'RESUME'}</button>
            
            <button 
              disabled={isLastQ}
              onClick={() => handleNavigation(currentQIndex + 1)} 
              style={{
                ...playerSmallBtn, 
                opacity: isLastQ ? 0.3 : 1, 
                cursor: isLastQ ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>

          <div style={speedDropdownRow}>
            <label htmlFor="speed-select" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Speed:</label>
            <select id="speed-select" value={playbackRate} onChange={handleRateChange} style={selectStyle}>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>
        </div>
      )}

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>Quiz Result</h2>
            <button onClick={() => navigate(-1)} style={doneBtnStyle}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

const centerMsg = { padding: '100px', textAlign: 'center' };
const containerStyle = { maxWidth: '800px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' };
const backBtnStyle = { marginTop: '20px', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const speakerBtnStyle = { position: 'absolute', top: '20px', right: '20px', fontSize: '1.4rem', background: '#fff', border: '2px solid #3b82f6', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' };
const headerStyle = { borderBottom: '2px solid #e2e8f0', margin: '15px 0', paddingBottom: '10px' };
const questionCardStyle = { marginBottom: '20px', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', transition: 'all 0.3s' };
const questionTextStyle = { fontSize: '1rem', fontWeight: '600', marginBottom: '12px' };
const optionsGridStyle = { display: 'grid', gap: '8px' };
const optionItemStyle = { padding: '12px', border: '1px solid', borderRadius: '10px', fontSize: '0.9rem' };

const playerCardStyle = { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '24px', padding: '18px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid #e2e8f0' };
const playerControlsRow = { display: 'flex', justifyContent: 'space-between', margin: '12px 0', alignItems: 'center' };
const playerMainBtn = { padding: '10px 30px', borderRadius: '25px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer', minWidth: '110px' };
const playerSmallBtn = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' };
const speedDropdownRow = { borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' };
const selectStyle = { padding: '8px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem', outline: 'none' };
const closeBtnStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' };

const modeBadgeStyle = (m) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px' };
const doneBtnStyle = { width: '100%', padding: '10px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer' };

export default ViewQuestions;