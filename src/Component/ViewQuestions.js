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

  // Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechType, setSpeechType] = useState(null); 
  const [showPlayer, setShowPlayer] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1); 
  const [repeatMode, setRepeatMode] = useState(false); 

  // Refs for Speech Engine
  const activeSpeechId = useRef(0);
  const rateRef = useRef(1);
  const isManuallyStopped = useRef(true);
  const repeatCountRef = useRef(0); 
  const isRepeatActiveRef = useRef(false);

  const isFirstQ = currentQIndex === 0;
  const isLastQ = testData ? currentQIndex === testData.questions.length - 1 : false;

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

  // --- SPEECH ENGINE (REFINED FOR DEEPER & CONTINUOUS VOICE) ---
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
    
    // टेक्स्ट को क्लीन रखा गया है ताकि AI अटके नहीं (No extra dots/commas)
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
    
    // Male Voice Logic
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => 
      (v.lang.includes('hi')) && 
      (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('hemant'))
    ) || voices.find(v => v.lang.includes('hi'));
    
    if (maleVoice) utterance.voice = maleVoice;
    
    // पिच को 0.7 किया गया है (और भी भारी आवाज़ के लिए) 
    // रेट को 0.95 रखा है ताकि आवाज़ लगातार और नेचुरल लगे
    utterance.pitch = 0.7; 
    utterance.rate = rateRef.current * 0.95;

    utterance.onend = () => {
      if (currentId === activeSpeechId.current && !isManuallyStopped.current) {
        if (type === 'oneliner' && isRepeatActiveRef.current && repeatCountRef.current < 1) {
          repeatCountRef.current++;
          setTimeout(() => {
            if (currentId === activeSpeechId.current && !isManuallyStopped.current) {
               startSpeechEngine(index, type, false); 
            }
          }, 600);
        } else {
          if (index + 1 < testData.questions.length) {
            setTimeout(() => {
              if (currentId === activeSpeechId.current && !isManuallyStopped.current) {
                repeatCountRef.current = 0; 
                startSpeechEngine(index + 1, type, true); 
              }
            }, 800);
          } else {
            setIsSpeaking(false);
          }
        }
      }
    };
    window.speechSynthesis.speak(utterance);
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
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
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
  const q = testData.questions[currentQIndex];

  return (
    <div style={containerStyle}>
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <button onClick={() => { stopSpeech(); navigate(-1); }} style={backBtnStyle}>← Back</button>
        
        {mode === 'timer' && !showModal && (
          <div style={timerBoxStyle}>
            <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b'}}>TIME LEFT</span>
            <span style={{
              fontSize: '1.5rem', fontWeight: '700', color: timeLeft <= 5 ? '#ef4444' : '#1e293b'
            }}>{timeLeft}s</span>
          </div>
        )}

        {mode === 'practice' && (
          <div style={voiceControlsHeader}>
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

        <header style={headerStyle}>
          <h1 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#1e293b' }}>{testData.testName}</h1>
          <span style={modeBadgeStyle(mode)}>
            {mode === 'practice' ? '📚 Practice' : mode === 'timer' ? '⏱ Timer' : '📝 Exam'} MODE
          </span>
        </header>
      </div>

      <div style={{ padding: '0 20px 200px 20px' }}>
        {(mode === 'timer' ? [q] : testData.questions).map((item, idx) => {
          const qIdx = mode === 'timer' ? currentQIndex : idx;
          const isAnswered = userSelections[qIdx] !== undefined;
          const selectedIdx = userSelections[qIdx];
          const correctIdx = parseInt(item.answer);
          const isActive = isSpeaking && currentQIndex === qIdx;

          return (
            <div key={qIdx} id={`q-card-${qIdx}`} style={{
              ...questionCardStyle,
              border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              backgroundColor: isActive ? '#f0f9ff' : '#fff'
            }}>
              <h3 style={questionTextStyle}><span style={{color: '#3b82f6'}}>{qIdx + 1}.</span> {item.question}</h3>
              <div style={optionsGridStyle}>
                {[item.a, item.b, item.c, item.d].map((opt, oIdx) => {
                  let bgColor = '#fff', borderColor = '#e2e8f0', textColor = '#1e293b';
                  if (isAnswered) {
                    if (oIdx === correctIdx) { bgColor = '#d1fae5'; borderColor = '#10b981'; textColor = '#065f46'; }
                    else if (oIdx === selectedIdx && mode !== 'practice') { bgColor = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; }
                  }
                  return (
                    <div key={oIdx} onClick={() => handleOptionClick(qIdx, oIdx)} style={{
                        ...optionItemStyle, backgroundColor: bgColor, borderColor: borderColor, color: textColor,
                        cursor: (mode === 'practice' || isAnswered) ? 'default' : 'pointer',
                        pointerEvents: mode === 'practice' ? 'none' : 'auto',
                        opacity: (mode === 'practice' && oIdx !== correctIdx) ? 0.7 : 1
                      }}>
                      <strong>{String.fromCharCode(65+oIdx)})</strong> {opt}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {mode !== 'practice' && (mode === 'exam' || (mode === 'timer' && currentQIndex === testData.questions.length - 1)) && (
        <div style={stickyFooterStyle}>
          <button onClick={() => handleFinishQuiz()} style={submitBtnStyle}>Finish Quiz & View Score</button>
        </div>
      )}

      {showPlayer && mode === 'practice' && (
        <div style={playerCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Player Q{currentQIndex + 1} of {testData.questions.length}</span>
            <button onClick={() => { stopSpeech(); setShowPlayer(false); }} style={closeBtnStyle}>✕</button>
          </div>
          <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
             <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
               <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>SPEED:</span>
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
            <button disabled={isFirstQ} onClick={() => handleNextPrev(currentQIndex - 1)} style={{...playerSmallBtn, opacity: isFirstQ ? 0.3 : 1}}>Prev</button>
            <button onClick={() => { if (isSpeaking) stopSpeech(); else startSpeechEngine(currentQIndex, speechType || 'oneliner', true); }} style={playerMainBtn}>
                {isSpeaking ? 'STOP' : 'RESUME'}
            </button>
            <button disabled={isLastQ} onClick={() => handleNextPrev(currentQIndex + 1)} style={{...playerSmallBtn, opacity: isLastQ ? 0.3 : 1}}>Next</button>
          </div>
        </div>
      )}

      {showModal && report && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{marginBottom: '20px', color: '#1e293b'}}>Quiz Result</h2>
            <div style={statStyle}>✅ Correct: <strong>{report.correct}</strong></div>
            <div style={statStyle}>❌ Incorrect: <strong>{report.wrong}</strong></div>
            <div style={statStyle}>⚪ Skipped: <strong>{report.skipped}</strong></div>
            <div style={scoreBadge}>Score: {Math.round((report.correct / report.total) * 100)}%</div>
            <button onClick={() => navigate(-1)} style={{ ...doneBtnStyle, marginTop: '20px' }}>Go Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const centerMsg = { padding: '100px', textAlign: 'center' };
const containerStyle = { maxWidth: '800px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' };
const backBtnStyle = { marginTop: '20px', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const voiceControlsHeader = { position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' };
const voiceBtn = { padding: '8px 12px', borderRadius: '12px', border: '2px solid #3b82f6', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' };
const headerStyle = { borderBottom: '2px solid #e2e8f0', margin: '15px 0', paddingBottom: '10px' };
const questionCardStyle = { marginBottom: '20px', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' };
const questionTextStyle = { fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#ef4444' };
const optionsGridStyle = { display: 'grid', gap: '8px' };
const optionItemStyle = { padding: '12px', border: '2px solid', borderRadius: '10px', fontSize: '0.9rem' };
const timerBoxStyle = { position: 'absolute', top: '15px', right: '20px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const stickyFooterStyle = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '800px', backgroundColor: '#fff', padding: '15px', boxShadow: '0 -5px 15px rgba(0,0,0,0.05)', zIndex: 99 };
const submitBtnStyle = { width: '100%', padding: '15px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none' };
const playerCardStyle = { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '24px', padding: '18px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid #e2e8f0' };
const speedSelectStyle = { padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' };
const repeatBtnStyle = { padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 'bold' };
const playerControlsRow = { display: 'flex', justifyContent: 'space-between', margin: '12px 0', alignItems: 'center' };
const playerMainBtn = { padding: '10px 30px', borderRadius: '25px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' };
const playerSmallBtn = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' };
const closeBtnStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' };
const modeBadgeStyle = (mode) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: mode === 'practice' ? '#dcfce7' : mode === 'timer' ? '#ffedd5' : '#dbeafe', color: mode === 'practice' ? '#166534' : mode === 'timer' ? '#9a3412' : '#1e40af' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '350px' };
const statStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const scoreBadge = { backgroundColor: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '10px', fontWeight: 'bold', marginTop: '15px' };
const doneBtnStyle = { width: '100%', padding: '10px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', border: 'none' };

export default ViewQuestions;