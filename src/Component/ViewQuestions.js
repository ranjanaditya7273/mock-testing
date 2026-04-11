import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { openDB } from '../db'; 
import confetti from 'canvas-confetti';

const ViewQuestions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [testData, setTestData] = useState(location.state?.data || null);
  const [loading, setLoading] = useState(!location.state?.data);
  const [userSelections, setUserSelections] = useState({});
  const [showModal, setShowModal] = useState(false);
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20); 
  const [startTime] = useState(Date.now()); 
  const timerRef = useRef(null);

  const mode = location.state?.mode || 'exam'; 

  // --- FULL SCREEN STATE ---
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechType, setSpeechType] = useState(null); 
  const [showPlayer, setShowPlayer] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1); 
  const [repeatMode, setRepeatMode] = useState(false); 

  // --- DRAGGABLE STATES ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Refs for Speech Engine
  const activeSpeechId = useRef(0);
  const rateRef = useRef(1);
  const isManuallyStopped = useRef(true);
  const repeatCountRef = useRef(0); 
  const isRepeatActiveRef = useRef(false);

  const isFirstQ = currentQIndex === 0;
  const isLastQ = testData ? currentQIndex === testData.questions.length - 1 : false;

  // --- FULL SCREEN FUNCTION ---
  const toggleFullScreen = () => {
    const docElm = document.documentElement;
    if (!document.fullscreenElement) {
      if (docElm.requestFullscreen) docElm.requestFullscreen();
      else if (docElm.mozRequestFullScreen) docElm.mozRequestFullScreen();
      else if (docElm.webkitRequestFullScreen) docElm.webkitRequestFullScreen();
      else if (docElm.msRequestFullscreen) docElm.msRequestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- INITIAL SETUP ---
  useEffect(() => {
    window.speechSynthesis.cancel(); 
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (mode === 'timer' && !showModal && testData) {
      if (timeLeft <= 0) { handleNextOrFinish(); return; }
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, currentQIndex, mode, showModal, testData]);

  useEffect(() => {
    if (testData && mode === 'practice') {
      const autoSelect = {};
      testData.questions.forEach((q, index) => autoSelect[index] = parseInt(q.answer));
      setUserSelections(autoSelect);
    }
  }, [testData, mode]);

  // --- DRAGGING LOGIC ---
  const handleDragStart = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
    isDragging.current = true;
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    offset.current = { x: clientX - position.x, y: clientY - position.y };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!isDragging.current) return;
    if (e.type === 'touchmove') e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    let newX = clientX - offset.current.x;
    let newY = clientY - offset.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  // --- SPEECH ENGINE ---
  const startSpeechEngine = (index, type, isNewStart = true) => {
    window.speechSynthesis.cancel();
    if (isNewStart) {
      activeSpeechId.current++;
      repeatCountRef.current = 0; 
    }
    const currentId = activeSpeechId.current;
    isManuallyStopped.current = false;
    setSpeechType(type);
    setCurrentQIndex(index);
    setIsSpeaking(true);
    const element = document.getElementById(`q-card-${index}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const q = testData.questions[index];
    let textToSpeak = "";
    if (type === 'mcq') {
      const labels = ["ए", "बी", "सी", "डी"];
      const options = [q.a, q.b, q.c, q.d];
      textToSpeak = `अगला प्रश्न है ${q.question}. ए ${q.a}. बी ${q.b}. सी ${q.c}. डी ${q.d}. सही उत्तर है विकल्प ${labels[parseInt(q.answer)]} ${options[parseInt(q.answer)]}.`;
    } else {
      const options = [q.a, q.b, q.c, q.d];
      textToSpeak = `अगला प्रश्न है ${q.question}. सही उत्तर है ${options[parseInt(q.answer)]}.`;
    }
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => (v.lang.includes('hi')) && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('hemant'))) || voices.find(v => v.lang.includes('hi'));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.pitch = 0.7; 
    utterance.rate = rateRef.current * 0.95;
    utterance.onend = () => {
      if (currentId === activeSpeechId.current && !isManuallyStopped.current) {
        if (type === 'oneliner' && isRepeatActiveRef.current && repeatCountRef.current < 1) {
          repeatCountRef.current++;
          setTimeout(() => { if (currentId === activeSpeechId.current && !isManuallyStopped.current) startSpeechEngine(index, type, false); }, 600);
        } else {
          if (index + 1 < testData.questions.length) {
            setTimeout(() => { if (currentId === activeSpeechId.current && !isManuallyStopped.current) { repeatCountRef.current = 0; startSpeechEngine(index + 1, type, true); } }, 1200); 
          } else { setIsSpeaking(false); }
        }
      }
    };
    setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
  };

  const stopSpeech = () => {
    isManuallyStopped.current = true;
    activeSpeechId.current++;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleRateChange = (e) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    rateRef.current = newRate;
    if (isSpeaking) startSpeechEngine(currentQIndex, speechType, true);
  };

  const toggleRepeatMode = () => {
    const nextState = !repeatMode;
    setRepeatMode(nextState);
    isRepeatActiveRef.current = nextState;
    if (isSpeaking && speechType === 'oneliner') {
      setTimeout(() => startSpeechEngine(currentQIndex, 'oneliner', true), 50);
    }
  };

  const handleNextPrev = (newIndex) => {
    if (newIndex >= 0 && newIndex < testData.questions.length) {
      startSpeechEngine(newIndex, speechType, true);
    }
  };

  const handleNextOrFinish = () => {
    if (currentQIndex < testData.questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setTimeLeft(20);
    } else {
      handleFinishQuiz();
    }
  };

  const handleOptionClick = (qIdx, selectedIdx) => {
    if (mode === 'practice' || ((mode === 'exam' || mode === 'timer') && userSelections[qIdx] !== undefined)) return;
    
    if (selectedIdx === parseInt(testData.questions[qIdx].answer)) {
        confetti({
          particleCount: 400, 
          startVelocity: 60, 
          spread: 360, 
          origin: { x: 0.5, y: 0.5 }, 
          colors: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
          zIndex: 3000, // Z-index increased for modal visibility
          gravity: 0.8, 
          scalar: 1.2 
        });
    }

    const updatedSelections = { ...userSelections, [qIdx]: selectedIdx };
    setUserSelections(updatedSelections);
    
    if (mode === 'timer') {
      setTimeout(() => {
        if (qIdx < testData.questions.length - 1) {
          setCurrentQIndex(prev => prev + 1);
          setTimeLeft(20);
        } else {
          handleFinishQuiz(updatedSelections);
        }
      }, 800);
    }
  };

  const handleFinishQuiz = async (latestData = userSelections) => {
    stopSpeech();
    const endTime = Date.now();
    const totalSecondsTaken = Math.floor((endTime - startTime) / 1000);
    const report = generateReport(latestData);
    const labels = ["A", "B", "C", "D"];
    const userAnswersArray = testData.questions.map((_, idx) => {
        const selectedIdx = latestData[idx];
        return selectedIdx !== undefined ? labels[selectedIdx] : "";
    });

    try {
      const db = await openDB();
      const tx = db.transaction("tests", "readwrite");
      const store = tx.objectStore("tests");
      const updatedTest = { 
        ...testData, 
        latestScore: { 
          correct: report.correct, wrong: report.wrong, skipped: report.skipped,
          total: report.total, userAnswers: userAnswersArray, timeTaken: totalSecondsTaken,
          date: new Date().toISOString()
        } 
      };
      await store.put(updatedTest);
      setShowModal(true);
    } catch (err) { setShowModal(true); }
  };

  const generateReport = (currentSelections = userSelections) => {
    if (!testData) return null;
    let correct = 0; let wrong = 0;
    const total = testData.questions.length;
    testData.questions.forEach((q, idx) => {
      if (currentSelections[idx] !== undefined) {
        if (currentSelections[idx] === parseInt(q.answer)) correct++;
        else wrong++;
      }
    });
    return { correct, wrong, skipped: total - (correct + wrong), total };
  };

  const report = generateReport();
  if (loading || !testData) return <div style={centerMsg}>Loading...</div>;

  const dynamicContainerStyle = {
    ...containerStyle,
    maxWidth: isFullScreen ? '100vw' : '900px',
    width: '100%',
    height: isFullScreen ? '100vh' : 'auto',
    padding: isFullScreen ? '0' : '0 20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: isFullScreen ? 'hidden' : 'auto',
    backgroundColor: isFullScreen ? '#fff' : '#f8fafc' 
  };

  const questionsToRender = (mode === 'exam' || mode === 'practice') 
    ? testData.questions 
    : [testData.questions[currentQIndex]];

  return (
    <div style={dynamicContainerStyle}>
      <div style={{ width: '100%', position: 'relative', padding: isFullScreen ? '10px 20px' : '0', zIndex: 10 }}>
        {!isFullScreen && <button onClick={() => { stopSpeech(); navigate(-1); }} style={backBtnStyle}>← Back</button>}
        
        {/* Fullscreen button now visible in ALL modes */}
        <div style={isFullScreen ? fsHeaderFixed : fullScreenToggleBox}>
            <button onClick={toggleFullScreen} style={fullScreenBtn}>
              {isFullScreen ? '🔳 Exit FullScreen' : '🔲 FullScreen'}
            </button>
        </div>

        {mode === 'timer' && !showModal && (
          <div style={isFullScreen ? timerFsStyle : timerBoxStyle}>
            <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b'}}>TIME LEFT</span>
            <span style={{
              fontSize: isFullScreen ? '2rem' : '1.5rem', 
              fontWeight: '800', 
              color: timeLeft <= 5 ? '#ef4444' : '#3b82f6'
            }}>{timeLeft}s</span>
          </div>
        )}

        {mode === 'practice' && (
          <div style={isFullScreen ? voiceControlsFs : voiceControlsHeader}>
            <button 
              onClick={() => { setRepeatMode(false); isRepeatActiveRef.current = false; setShowPlayer(true); startSpeechEngine(currentQIndex, 'oneliner', true); }} 
              style={{...voiceBtn, backgroundColor: speechType === 'oneliner' ? '#3b82f6' : '#fff', color: speechType === 'oneliner' ? '#fff' : '#3b82f6'}}
            >One-Liner</button>
            <button 
              onClick={() => { setRepeatMode(false); isRepeatActiveRef.current = false; setShowPlayer(true); startSpeechEngine(currentQIndex, 'mcq', true); }} 
              style={{...voiceBtn, backgroundColor: speechType === 'mcq' ? '#3b82f6' : '#fff', color: speechType === 'mcq' ? '#fff' : '#3b82f6'}}
            >MCQ</button>
          </div>
        )}

        {!isFullScreen && (
          <header style={headerStyle}>
            <h1 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#1e293b' }}>{testData.testName}</h1>
            <span style={modeBadgeStyle(mode)}>
              {mode === 'practice' ? '📚 Practice' : mode === 'timer' ? '⏱ Timer' : '📝 Exam'} MODE
            </span>
          </header>
        )}
      </div>

      <div style={{ 
          width: '100%', 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column', 
          justifyContent: (isFullScreen && mode === 'timer') ? 'center' : 'flex-start',
          alignItems: 'center',
          padding: isFullScreen ? '20px 0' : '0 0 200px 0', 
          overflowY: 'auto'
      }}>
        {questionsToRender.map((item, idx) => {
          const qIdx = (mode === 'exam' || mode === 'practice') ? idx : currentQIndex;
          const isAnswered = userSelections[qIdx] !== undefined;
          const selectedIdx = userSelections[qIdx];
          const correctIdx = parseInt(item.answer);
          const isActive = isSpeaking && currentQIndex === qIdx;

          return (
            <div key={qIdx} id={`q-card-${qIdx}`} style={{
              ...questionCardStyle,
              border: isFullScreen ? 'none' : (isActive ? '3px solid #3b82f6' : '1px solid #e2e8f0'),
              backgroundColor: isFullScreen ? 'transparent' : (isActive ? '#f0f9ff' : '#fff'),
              width: '100%',
              maxWidth: '100%', 
              minHeight: isFullScreen ? '85vh' : 'auto', 
              margin: (isFullScreen && mode === 'timer') ? '0' : '0 0 20px 0', 
              padding: isFullScreen ? '80px 40px' : '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              borderRadius: isFullScreen ? '0' : '24px',
              boxShadow: 'none',
              boxSizing: 'border-box'
            }}>
              <h3 style={{
                  ...questionTextStyle, 
                  fontSize: isFullScreen ? '2.8rem' : '1.2rem', 
                  lineHeight: '1.4',
                  textAlign: 'left',
                  marginBottom: isFullScreen ? '60px' : '20px'
              }}>
                <span style={{color: '#3b82f6'}}>{qIdx + 1}.</span> {item.question}
              </h3>
              
              <div style={{
                ...optionsGridStyle,
                gridTemplateColumns: isFullScreen ? '1fr 1fr' : '1fr',
                marginTop: isFullScreen ? '20px' : '10px',
                gap: isFullScreen ? '35px' : '10px'
              }}>
                {[item.a, item.b, item.c, item.d].map((opt, oIdx) => {
                  let bgColor = '#fff', borderColor = '#e2e8f0', textColor = '#1e293b';
                  if (isAnswered) {
                    if (oIdx === correctIdx) { bgColor = '#d1fae5'; borderColor = '#10b981'; textColor = '#065f46'; }
                    else if (oIdx === selectedIdx && mode !== 'practice') { bgColor = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; }
                  }
                  return (
                    <div key={oIdx} onClick={() => handleOptionClick(qIdx, oIdx)} style={{
                        ...optionItemStyle, 
                        backgroundColor: bgColor, borderColor: borderColor, color: textColor,
                        fontSize: isFullScreen ? '2.1rem' : '1rem', 
                        padding: isFullScreen ? '40px' : '15px',
                        cursor: (mode === 'practice' || isAnswered) ? 'default' : 'pointer',
                        pointerEvents: (mode === 'practice' && !isFullScreen) ? 'none' : 'auto',
                        opacity: (mode === 'practice' && oIdx !== correctIdx) ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                      <strong style={{marginRight: '20px'}}>{String.fromCharCode(65+oIdx)})</strong> {opt}
                    </div>
                  );
                })}
              </div>

              {mode === 'practice' && item.explanation && (
                <div style={{
                    ...explanationBoxStyle, 
                    fontSize: isFullScreen ? '1.6rem' : '0.92rem',
                    marginTop: isFullScreen ? '60px' : '15px'
                }}>
                  <strong style={{ display: 'block', marginBottom: '10px', color: '#854d0e' }}>💡 Explanation:</strong>
                  {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {((mode === 'exam') || (mode === 'timer' && currentQIndex === testData.questions.length - 1)) && !showModal && (
        <div style={{...stickyFooterStyle, width: isFullScreen ? '100%' : '800px', borderRadius: isFullScreen ? '0' : '20px 20px 0 0'}}>
          <button onClick={() => handleFinishQuiz()} style={submitBtnStyle}>Finish Quiz & View Score</button>
        </div>
      )}

      {showPlayer && mode === 'practice' && (
        <div 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            ...playerCardStyle,
            width: isFullScreen ? '500px' : '92%',
            transform: isFullScreen ? `translate(${position.x}px, ${position.y}px)` : `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
            left: isFullScreen ? 'auto' : '50%',
            right: isFullScreen ? '40px' : 'auto',
            bottom: isFullScreen ? '40px' : '20px'
          }}
        >
          <div style={{width: '40px', height: '5px', backgroundColor: '#cbd5e1', borderRadius: '10px', margin: '0 auto 15px auto'}}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Player Q{currentQIndex + 1} / {testData.questions.length}</span>
            <button onClick={() => { stopSpeech(); setShowPlayer(false); }} style={closeBtnStyle}>✕</button>
          </div>
          <div style={{ marginBottom: '15px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
               <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>SPEED:</span>
               <select value={playbackRate} onChange={handleRateChange} style={speedSelectStyle}>
                  <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                  <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
               </select>
             </div>
             {speechType === 'oneliner' && (
               <button onClick={toggleRepeatMode} style={{ ...repeatBtnStyle, backgroundColor: repeatMode ? '#ef4444' : '#f1f5f9', color: repeatMode ? '#fff' : '#475569' }}>
                 Repeat 2x: {repeatMode ? "ON" : "OFF"}
               </button>
             )}
          </div>
          <div style={playerControlsRow}>
            <button disabled={isFirstQ} onClick={() => handleNextPrev(currentQIndex - 1)} style={playerSmallBtn}>Prev</button>
            <button onClick={() => { if (isSpeaking) stopSpeech(); else startSpeechEngine(currentQIndex, speechType || 'oneliner', true); }} style={playerMainBtn}>
                {isSpeaking ? 'STOP' : 'RESUME'}
            </button>
            <button disabled={isLastQ} onClick={() => handleNextPrev(currentQIndex + 1)} style={playerSmallBtn}>Next</button>
          </div>
        </div>
      )}

      {showModal && report && (
        <div style={modalOverlayStyle}>
          <div style={{...modalContentStyle, width: isFullScreen ? '80%' : '90%', maxWidth: isFullScreen ? '600px' : '400px'}}>
            <h2 style={{marginBottom: '20px', color: '#1e293b', fontSize: isFullScreen ? '2.5rem' : '1.5rem'}}>Quiz Result</h2>
            <div style={{...statStyle, fontSize: isFullScreen ? '1.8rem' : '1.1rem'}}>✅ Correct: <strong>{report.correct}</strong></div>
            <div style={{...statStyle, fontSize: isFullScreen ? '1.8rem' : '1.1rem'}}>❌ Incorrect: <strong>{report.wrong}</strong></div>
            <div style={{...statStyle, fontSize: isFullScreen ? '1.8rem' : '1.1rem'}}>⚪ Skipped: <strong>{report.skipped}</strong></div>
            <div style={{...scoreBadge, fontSize: isFullScreen ? '2rem' : '1.2rem', padding: isFullScreen ? '30px' : '15px'}}>Score: {Math.round((report.correct / report.total) * 100)}%</div>
            <button onClick={() => { if(isFullScreen) toggleFullScreen(); navigate(-1); }} style={{ ...doneBtnStyle, marginTop: '20px', fontSize: isFullScreen ? '1.5rem' : '1rem' }}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const fsHeaderFixed = { position: 'fixed', top: '20px', left: '20px', zIndex: 1001 };
const fullScreenToggleBox = { position: 'absolute', left: '50%', top: '20px', transform: 'translateX(-50%)', zIndex: 10 };
const timerFsStyle = { position: 'fixed', top: '20px', right: '40px', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '20px', border: '3px solid #3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 1001 };
const voiceControlsFs = { position: 'fixed', top: '20px', right: '200px', display: 'flex', gap: '8px', zIndex: 1001 };
const fullScreenBtn = { padding: '10px 20px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', color: '#1e293b', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const centerMsg = { padding: '100px', textAlign: 'center' };
const containerStyle = { margin: '0 auto', minHeight: '100vh', transition: 'all 0.3s ease' };
const backBtnStyle = { marginTop: '20px', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const voiceControlsHeader = { position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' };
const voiceBtn = { padding: '8px 12px', borderRadius: '12px', border: '2px solid #3b82f6', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' };
const headerStyle = { borderBottom: '2px solid #e2e8f0', margin: '15px 0', paddingBottom: '10px' };
const questionCardStyle = { boxSizing: 'border-box', transition: 'all 0.3s ease' };
const questionTextStyle = { fontWeight: '700', color: '#ef4444' };
const optionsGridStyle = { display: 'grid' };
const optionItemStyle = { border: '2px solid', borderRadius: '15px', transition: 'all 0.2s ease', fontWeight: '500' };
const timerBoxStyle = { position: 'absolute', top: '15px', right: '20px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' };
const stickyFooterStyle = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', padding: '20px', boxShadow: '0 -5px 25px rgba(0,0,0,0.1)', zIndex: 99 };
const submitBtnStyle = { width: '100%', padding: '18px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '15px', fontWeight: 'bold', border: 'none', fontSize: '1.1rem', cursor: 'pointer' };
const playerCardStyle = { position: 'fixed', backgroundColor: '#fff', borderRadius: '30px', padding: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 1002, border: '1px solid #e2e8f0', touchAction: 'none', userSelect: 'none' };
const speedSelectStyle = { padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600' };
const repeatBtnStyle = { padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 'bold' };
const playerControlsRow = { display: 'flex', justifyContent: 'space-between', margin: '15px 0', alignItems: 'center', gap: '10px' };
const playerMainBtn = { padding: '12px 40px', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' };
const playerSmallBtn = { background: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' };
const closeBtnStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8' };
const modeBadgeStyle = (mode) => ({ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: mode === 'practice' ? '#dcfce7' : '#ffedd5', color: mode === 'practice' ? '#166534' : '#9a3412' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '40px', borderRadius: '30px', textAlign: 'center' };
const statStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const scoreBadge = { backgroundColor: '#3b82f6', color: '#fff', borderRadius: '15px', fontWeight: 'bold', marginTop: '20px' };
const doneBtnStyle = { width: '100%', padding: '15px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const explanationBoxStyle = { marginTop: '15px', padding: '15px 20px', backgroundColor: '#fefce8', borderLeft: '5px solid #eab308', borderRadius: '12px', color: '#422006', lineHeight: '1.6', whiteSpace: 'pre-wrap' };

export default ViewQuestions;