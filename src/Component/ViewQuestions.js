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
  
  // Timer Mode States
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  const mode = location.state?.mode || 'exam'; 

  // Timer logic
  useEffect(() => {
    if (mode === 'timer' && !showModal && testData) {
      if (timeLeft === 0) {
        handleNextOrFinish();
      }
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, currentQIndex, mode, showModal, testData]);

  const handleNextOrFinish = () => {
    if (currentQIndex < testData.questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setTimeLeft(15);
    } else {
      handleFinishQuiz();
    }
  };

  useEffect(() => {
    if (testData && mode === 'practice') {
      const autoSelect = {};
      testData.questions.forEach((q, index) => {
        autoSelect[index] = parseInt(q.answer);
      });
      setUserSelections(autoSelect);
    }
  }, [testData, mode]);

  const handleOptionClick = (questionIndex, selectedOptionIndex) => {
    if ((mode === 'exam' || mode === 'timer') && userSelections[questionIndex] !== undefined) return;
    
    const correctIdx = parseInt(testData.questions[questionIndex].answer);
    
    if (selectedOptionIndex === correctIdx) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
    }

    setUserSelections(prev => ({ ...prev, [questionIndex]: selectedOptionIndex }));

    // Timer mode: Auto go to next after short delay
    if (mode === 'timer') {
      setTimeout(() => {
        handleNextOrFinish();
      }, 800);
    }
  };

  const getFormattedAnswer = (q) => {
    const ansIndex = parseInt(q.answer);
    const labels = ["A", "B", "C", "D"];
    const options = [q.a, q.b, q.c, q.d];
    return `(${labels[ansIndex]}) ${options[ansIndex]}`;
  };

  const handleFinishQuiz = async () => {
    const report = generateReport();
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
          date: new Date()
        } 
      };
      await store.put(updatedTest);
      setShowModal(true);
    } catch (err) {
      setShowModal(true);
    }
  };

  const generateReport = () => {
    if (!testData) return null;
    let correct = 0;
    let wrong = 0;
    const total = testData.questions.length;
    Object.keys(userSelections).forEach(idx => {
      const qIdx = parseInt(idx);
      if (userSelections[qIdx] === parseInt(testData.questions[qIdx].answer)) correct++;
      else wrong++;
    });
    return { correct, wrong, skipped: total - (correct + wrong), total };
  };

  const report = generateReport();

  if (loading) return <div style={centerMsg}>Loading Quiz...</div>;
  if (!testData) return <div style={centerMsg}>No Quiz Data Found!</div>;

  // Single Question for Timer Mode
  const q = testData.questions[currentQIndex];

  return (
    <div style={containerStyle}>
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back</button>
        
        {mode === 'timer' && (
          <div style={timerBoxStyle}>
            <span style={{fontSize: '0.8rem', fontWeight: 'bold'}}>TIME</span>
            <span style={{fontSize: '1.4rem', color: timeLeft <= 5 ? '#ef4444' : '#1e293b'}}>{timeLeft}s</span>
          </div>
        )}

        <header style={headerStyle}>
          <h1 style={{ fontSize: '1.4rem', margin: '10px 0', color: '#1e293b' }}>{testData.testName}</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={modeBadgeStyle(mode)}>
              {mode === 'practice' ? '📚 Practice' : mode === 'timer' ? '⏱ Timer Test' : '📝 Exam'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {mode === 'timer' ? `Qn ${currentQIndex + 1}/${testData.questions.length}` : `${testData.questions.length} Qns`}
            </span>
          </div>
        </header>
      </div>

      <div style={{ padding: '0 20px 120px 20px' }}>
        {/* If Timer Mode, show ONLY current question, else show ALL (exam/practice) */}
        {(mode === 'timer' ? [q] : testData.questions).map((item, idx) => {
          const qIdx = mode === 'timer' ? currentQIndex : idx;
          const isAnswered = userSelections[qIdx] !== undefined;
          const selectedIdx = userSelections[qIdx];
          const correctIdx = parseInt(item.answer);

          return (
            <div key={qIdx} style={questionCardStyle}>
              <h3 style={questionTextStyle}><span style={{ color: '#3b82f6' }}>{qIdx + 1}.</span> {item.question}</h3>
              <div style={optionsGridStyle}>
                {[item.a, item.b, item.c, item.d].map((optText, optIdx) => {
                  let bgColor = '#fff', borderColor = '#e2e8f0', textColor = '#1e293b';
                  if (isAnswered) {
                    if (optIdx === correctIdx) { bgColor = '#d1fae5'; borderColor = '#10b981'; textColor = '#065f46'; }
                    else if (optIdx === selectedIdx) { bgColor = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; }
                  }
                  return (
                    <div key={optIdx} onClick={() => handleOptionClick(qIdx, optIdx)} style={{ ...optionItemStyle, backgroundColor: bgColor, borderColor: borderColor, color: textColor, cursor: (isAnswered || mode === 'practice') ? 'default' : 'pointer' }}>
                      <strong>{String.fromCharCode(65 + optIdx)})</strong> {optText}
                    </div>
                  );
                })}
              </div>
              {isAnswered && mode !== 'timer' && (
                <div style={{ ...ansBoxStyle, backgroundColor: selectedIdx === correctIdx ? '#f0fdf4' : '#fff1f2', borderLeftColor: selectedIdx === correctIdx ? '#10b981' : '#ef4444' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: selectedIdx === correctIdx ? '#10b981' : '#ef4444' }}>{selectedIdx === correctIdx ? "Correct!" : "Incorrect"}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Correct Answer: {getFormattedAnswer(item)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(mode === 'exam' || (mode === 'timer' && currentQIndex === testData.questions.length - 1)) && (
        <div style={stickyFooterStyle}>
          <button onClick={handleFinishQuiz} style={submitBtnStyle}>Finish Quiz & View Score</button>
        </div>
      )}

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ margin: '0 0 20px 0' }}>Quiz Result</h2>
            <div style={statStyle}><span>Total Questions:</span> <strong>{report.total}</strong></div>
            <div style={statStyle}><span>✅ Correct:</span> <strong style={{color: '#10b981'}}>{report.correct}</strong></div>
            <div style={statStyle}><span>❌ Incorrect:</span> <strong style={{color: '#ef4444'}}>{report.wrong}</strong></div>
            <div style={statStyle}><span>🔘 Skipped:</span> <strong style={{color: '#b45309'}}>{report.skipped}</strong></div>
            <div style={scoreBadge}>Score: {Math.round((report.correct / report.total) * 100)}%</div>
            <button onClick={() => navigate(-1)} style={{ ...doneBtnStyle, marginTop: '25px' }}>Go Back to List</button>
          </div>
        </div>
      )}
    </div>
  );
};

const centerMsg = { padding: '100px', textAlign: 'center', color: '#64748b' };
const containerStyle = { maxWidth: '800px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' };
const backBtnStyle = { marginTop: '20px', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600' };
const timerBoxStyle = { position: 'absolute', top: '20px', right: '20px', backgroundColor: '#fff', padding: '5px 15px', borderRadius: '12px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const headerStyle = { borderBottom: '2px solid #e2e8f0', margin: '15px 0', paddingBottom: '10px' };
const questionCardStyle = { marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' };
const questionTextStyle = { fontSize: '1.05rem', fontWeight: '600', marginBottom: '15px' };
const optionsGridStyle = { display: 'grid', gap: '10px' };
const optionItemStyle = { padding: '12px', border: '2px solid', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '500', transition: 'all 0.2s' };
const ansBoxStyle = { marginTop: '15px', padding: '10px', borderRadius: '10px', borderLeft: '5px solid' };
const stickyFooterStyle = { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '800px', backgroundColor: '#fff', padding: '15px', boxShadow: '0 -5px 15px rgba(0,0,0,0.05)', zIndex: 99 };
const submitBtnStyle = { width: '100%', padding: '15px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' };

const modeBadgeStyle = (mode) => ({
  padding: '4px 10px', borderRadius: '15px', fontSize: '0.7rem', fontWeight: 'bold',
  backgroundColor: mode === 'practice' ? '#dcfce7' : mode === 'timer' ? '#ffedd5' : '#dbeafe',
  color: mode === 'practice' ? '#166534' : mode === 'timer' ? '#9a3412' : '#1e40af'
});

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '350px', textAlign: 'center' };
const statStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const scoreBadge = { backgroundColor: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '15px' };
const doneBtnStyle = { width: '100%', padding: '12px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };

export default ViewQuestions;