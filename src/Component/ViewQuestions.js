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
  const [showPlayer, setShowPlayer] = useState(false);
  const isManuallyStopped = useRef(false); 
  const isNavigating = useRef(false); 
  const rateRef = useRef(1); 

  const isFirstQ = currentQIndex === 0;
  const isLastQ = testData ? currentQIndex === testData.questions.length - 1 : false;

  // Smooth Timer Logic
  useEffect(() => {
    if (mode === 'timer' && !showModal && testData) {
      if (timeLeft <= 0) {
        handleNextOrFinish();
        return;
      }
      
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, currentQIndex, mode, showModal, testData]);

  // Practice Mode: Auto-select
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

    const textToSpeak = `अगला क्वेश्चन है, ${q.question}. ए, ${q.a}. बी, ${q.b}. सी, ${q.c}. डी, ${q.d}. सही आंसर है, ${labels[correctIdx]}, ${options[correctIdx]}.`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = rateRef.current;

    utterance.onend = () => {
      if (isNavigating.current || isManuallyStopped.current) return;
      if (index + 1 < testData.questions.length) {
        setTimeout(() => {
          if (!isManuallyStopped.current && !isNavigating.current) {
            speakSequence(index + 1);
          }
        }, 800);
      } else {
        setIsSpeaking(false);
      }
    };
    window.speechSynthesis.speak(utterance);
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
          correct: report.correct, 
          wrong: report.wrong, 
          skipped: report.skipped,
          total: report.total,
          userAnswers: userAnswersArray, 
          timeTaken: totalSecondsTaken,
          date: new Date().toISOString()
        } 
      };
      await store.put(updatedTest);
      setShowModal(true);
    } catch (err) {
      setShowModal(true);
    }
  };

  const generateReport = (currentSelections = userSelections) => {
    if (!testData) return null;
    let correct = 0; 
    let wrong = 0;
    const total = testData.questions.length;
    
    testData.questions.forEach((q, idx) => {
      if (currentSelections[idx] !== undefined) {
        if (currentSelections[idx] === parseInt(q.answer)) {
          correct++;
        } else {
          wrong++;
        }
      }
    });
    
    return { 
      correct, 
      wrong, 
      skipped: total - (correct + wrong), 
      total 
    };
  };

  const report = generateReport();

  if (loading || !testData) return <div style={centerMsg}>Loading...</div>;

  const q = testData.questions[currentQIndex];

  return (
    <div style={containerStyle}>
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <button onClick={() => { stopSpeech(); navigate(-1); }} style={backBtnStyle}>← Back</button>
        
        {mode === 'timer' && (
          <div style={timerBoxStyle}>
            <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b'}}>TIME LEFT</span>
            <span style={{
              fontSize: '1.5rem', 
              fontWeight: '700',
              transition: 'color 0.3s ease, transform 0.3s ease',
              color: timeLeft <= 5 ? '#ef4444' : '#1e293b',
              transform: timeLeft <= 5 ? 'scale(1.1)' : 'scale(1)'
            }}>{timeLeft}s</span>
          </div>
        )}

        {mode === 'practice' && (
          <button 
            onClick={() => { setShowPlayer(true); if(!isSpeaking) speakSequence(currentQIndex); }} 
            style={speakerBtnStyle}
          >
            {isSpeaking ? '🔊' : '🔈'}
          </button>
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
              {/* यहाँ प्रश्न का रंग लाल (Red) किया गया है */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Player Q{currentQIndex + 1} of {testData.questions.length}</span>
            <button onClick={() => { stopSpeech(); setShowPlayer(false); }} style={closeBtnStyle}>✕</button>
          </div>
          <div style={playerControlsRow}>
            <button disabled={isFirstQ} onClick={() => { 
                isNavigating.current = true; window.speechSynthesis.cancel(); 
                setTimeout(() => { isNavigating.current = false; speakSequence(currentQIndex - 1); }, 400); 
              }} style={{...playerSmallBtn, opacity: isFirstQ ? 0.3 : 1}}>Prev</button>
            
            <button onClick={() => { 
                if (isSpeaking) { stopSpeech(); } 
                else { isManuallyStopped.current = false; speakSequence(currentQIndex); }
            }} style={playerMainBtn}>
                {isSpeaking ? 'STOP' : 'RESUME'}
            </button>

            <button disabled={isLastQ} onClick={() => { 
                isNavigating.current = true; window.speechSynthesis.cancel(); 
                setTimeout(() => { isNavigating.current = false; speakSequence(currentQIndex + 1); }, 400); 
              }} style={{...playerSmallBtn, opacity: isLastQ ? 0.3 : 1}}>Next</button>
          </div>
        </div>
      )}

      {showModal && report && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{marginBottom: '20px', color: '#1e293b'}}>Quiz Result</h2>
            <div style={statStyle}><span style={{color: '#10b981', fontWeight: '500'}}>✅ Correct:</span> <strong>{report.correct}</strong></div>
            <div style={statStyle}><span style={{color: '#ef4444', fontWeight: '500'}}>❌ Incorrect:</span> <strong>{report.wrong}</strong></div>
            <div style={statStyle}><span style={{color: '#94a3b8', fontWeight: '500'}}>⚪ Skipped:</span> <strong>{report.skipped}</strong></div>
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
const speakerBtnStyle = { position: 'absolute', top: '20px', right: '20px', fontSize: '1.4rem', background: '#fff', border: '2px solid #3b82f6', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' };
const headerStyle = { borderBottom: '2px solid #e2e8f0', margin: '15px 0', paddingBottom: '10px' };
const questionCardStyle = { marginBottom: '20px', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', transition: 'all 0.3s ease' };

// यहाँ प्रश्न का रंग लाल (Red) किया गया है
const questionTextStyle = { fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#ef4444' };

const optionsGridStyle = { display: 'grid', gap: '8px' };
const optionItemStyle = { padding: '12px', border: '2px solid', borderRadius: '10px', fontSize: '0.9rem', transition: 'all 0.2s ease' };
const timerBoxStyle = { position: 'absolute', top: '15px', right: '20px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const stickyFooterStyle = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '800px', backgroundColor: '#fff', padding: '15px', boxShadow: '0 -5px 15px rgba(0,0,0,0.05)', zIndex: 99 };
const submitBtnStyle = { width: '100%', padding: '15px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' };
const playerCardStyle = { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '24px', padding: '18px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid #e2e8f0' };
const playerControlsRow = { display: 'flex', justifyContent: 'space-between', margin: '12px 0', alignItems: 'center' };
const playerMainBtn = { padding: '10px 30px', borderRadius: '25px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const playerSmallBtn = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' };
const closeBtnStyle = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' };
const modeBadgeStyle = (mode) => ({ padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: mode === 'practice' ? '#dcfce7' : mode === 'timer' ? '#ffedd5' : '#dbeafe', color: mode === 'practice' ? '#166534' : mode === 'timer' ? '#9a3412' : '#1e40af' });
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '350px' };
const statStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const scoreBadge = { backgroundColor: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '10px', fontWeight: 'bold', marginTop: '15px' };
const doneBtnStyle = { width: '100%', padding: '10px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer' };

export default ViewQuestions;