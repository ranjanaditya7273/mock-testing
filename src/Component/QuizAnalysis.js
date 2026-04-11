import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, Inbox, Maximize, Minimize } from 'lucide-react';

const TakenQuizList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizTitle, questions, userAnswers, filter } = location.state || {};

  // --- FULL SCREEN STATE ---
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling full-screen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const getLabelFromIndex = (index) => {
    if (index === null || index === undefined || index === "") return "";
    if (isNaN(index)) return index; 
    return String.fromCharCode(65 + parseInt(index));
  };

  const filteredList = (questions || []).filter((q, index) => {
    const userAns = userAnswers[index];
    const correctAnsLabel = getLabelFromIndex(q.answer);

    if (filter === 'correct') return userAns === correctAnsLabel;
    if (filter === 'wrong') return userAns !== "" && userAns !== correctAnsLabel;
    if (filter === 'skipped') return userAns === "";
    return true;
  });

  const getStatusIcon = (q, index) => {
    const userAns = userAnswers[index];
    const correctAnsLabel = getLabelFromIndex(q.answer);
    const iconSize = isFullScreen ? 32 : 20;
    if (userAns === correctAnsLabel) return <CheckCircle color="#10b981" size={iconSize} />;
    if (userAns === "") return <HelpCircle color="#f59e0b" size={iconSize} />;
    return <XCircle color="#ef4444" size={iconSize} />;
  };

  const getEmptyMessage = () => {
    if (filter === 'correct') return "No Correct Answers Found";
    if (filter === 'wrong') return "No Wrong Answers Found";
    if (filter === 'skipped') return "No Skipped Questions Found";
    return "No Questions Found";
  };

  return (
    <div style={{...styles.container, backgroundColor: isFullScreen ? '#ffffff' : '#f8fafc'}}>
      <nav style={{...styles.nav, padding: isFullScreen ? '20px 40px' : '12px 15px'}}>
        {!isFullScreen && (
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span style={styles.hideOnMobile}>Back</span>
          </button>
        )}
        
        <div style={styles.navCenter}>
            <h3 style={{...styles.navTitle, fontSize: isFullScreen ? '1.8rem' : '1rem', maxWidth: isFullScreen ? '100%' : '200px'}}>
              {quizTitle}
            </h3>
            <span style={{...styles.navSubtitle, fontSize: isFullScreen ? '1.1rem' : '0.75rem'}}>
              {filter} Questions ({filteredList.length})
            </span>
        </div>

        <button onClick={toggleFullScreen} style={styles.fsBtn}>
          {isFullScreen ? <Minimize size={isFullScreen ? 28 : 18} /> : <Maximize size={18} />}
          <span style={{marginLeft: '5px', display: window.innerWidth < 480 ? 'none' : 'inline'}}>
            {isFullScreen ? 'Exit' : 'Full Screen'}
          </span>
        </button>
      </nav>

      <div style={{...styles.list, maxWidth: isFullScreen ? '100%' : '650px', padding: isFullScreen ? '20px 40px' : '0 12px'}}>
        {filteredList.length > 0 ? (
          filteredList.map((q) => {
            const realIdx = questions.findIndex(item => item.question === q.question);
            const correctAnsLabel = getLabelFromIndex(q.answer);
            const userAnsLabel = userAnswers[realIdx];

            return (
              <div key={realIdx} style={{
                ...styles.qCard, 
                padding: isFullScreen ? '40px' : '16px',
                border: isFullScreen ? 'none' : '1px solid #f1f5f9',
                borderBottom: isFullScreen ? '2px solid #f1f5f9' : '1px solid #f1f5f9',
                borderRadius: isFullScreen ? '0' : '16px',
                marginBottom: isFullScreen ? '40px' : '16px'
              }}>
                <div style={styles.qHeader}>
                  <span style={{...styles.qNumber, fontSize: isFullScreen ? '1.5rem' : '0.9rem'}}>
                    Question {realIdx + 1}
                  </span>
                  {getStatusIcon(q, realIdx)}
                </div>
                
                <p style={{
                  ...styles.questionText, 
                  fontSize: isFullScreen ? '2.2rem' : '1rem',
                  marginBottom: isFullScreen ? '30px' : '16px'
                }}>
                  {q.question}
                </p>
                
                <div style={{
                  ...styles.optionsGrid, 
                  display: 'grid', 
                  gridTemplateColumns: isFullScreen ? '1fr 1fr' : '1fr',
                  gap: isFullScreen ? '25px' : '8px'
                }}>
                  {['a', 'b', 'c', 'd'].map((optKey, idx) => {
                    const currentLabel = String.fromCharCode(65 + idx);
                    const isCorrect = correctAnsLabel === currentLabel;
                    const isUserSelected = userAnsLabel === currentLabel;

                    return (
                      <div key={optKey} style={{
                        ...styles.option,
                        backgroundColor: isCorrect ? '#e4f6eb' : (isUserSelected ? '#fee2e2' : '#f8fafc'),
                        border: isCorrect ? '2px solid #10b981' : '1px solid #e2e8f0',
                        color: isCorrect ? '#065f46' : (isUserSelected ? '#991b1b' : '#334155'),
                        fontSize: isFullScreen ? '1.6rem' : '0.9rem',
                        padding: isFullScreen ? '25px' : '12px'
                      }}>
                        <strong style={{marginRight: '10px'}}>{currentLabel})</strong> {q[optKey]}
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  ...styles.ansKey, 
                  fontSize: isFullScreen ? '1.3rem' : '0.8rem',
                  marginTop: isFullScreen ? '30px' : '16px',
                  paddingTop: isFullScreen ? '20px' : '12px'
                }}>
                  <div>Correct Answer: <span style={{color: '#10b981'}}>{correctAnsLabel}</span></div>
                  <div style={{borderLeft: '2px solid #e2e8f0', height: isFullScreen ? '25px' : '15px'}}></div>
                  <div>Your Choice: <span style={{color: userAnsLabel === correctAnsLabel ? '#10b981' : '#ef4444'}}>
                    {userAnsLabel || "Skipped"}
                  </span></div>
                </div>

                {/* --- EXPLANATION BOX ADDED HERE --- */}
                {q.explanation && (
                  <div style={{
                    ...styles.explanationBox, 
                    fontSize: isFullScreen ? '1.6rem' : '0.92rem',
                    marginTop: isFullScreen ? '40px' : '15px'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#854d0e' }}>💡 Explanation:</strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconBox}><Inbox size={48} color="#94a3b8" /></div>
            <h2 style={styles.emptyText}>{getEmptyMessage()}</h2>
            <p style={styles.emptySubText}>Looks like there's nothing to show in this category.</p>
            <button onClick={() => navigate(-1)} style={styles.goBackBtn}>Go Back</button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', transition: 'all 0.3s ease' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 10 },
  navCenter: { textAlign: 'center', flex: 1, padding: '0 10px' },
  navTitle: { margin: 0, fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  navSubtitle: { color: '#64748b', textTransform: 'capitalize', fontWeight: '600' },
  backBtn: { border: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '600', color: '#475569' },
  fsBtn: { border: 'none', background: '#3b82f6', color: '#fff', padding: '8px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '700' },
  hideOnMobile: window.innerWidth < 480 ? { display: 'none' } : {},
  list: { margin: '15px auto', transition: 'all 0.3s ease' },
  qCard: { backgroundColor: '#fff', boxSizing: 'border-box' },
  qHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' },
  qNumber: { fontWeight: '900', color: '#64748b' },
  questionText: { color: '#1e293b', fontWeight: '700', lineHeight: '1.4' },
  optionsGrid: { width: '100%' },
  option: { borderRadius: '12px', fontWeight: '500', transition: 'all 0.2s ease' },
  ansKey: { borderTop: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', fontWeight: '800' },
  explanationBox: { padding: '15px 20px', backgroundColor: '#fefce8', borderLeft: '5px solid #eab308', borderRadius: '12px', color: '#422006', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  emptyState: { marginTop: '60px', textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' },
  emptyIconBox: { backgroundColor: '#f1f5f9', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  emptyText: { color: '#1e293b', fontSize: '1.25rem', margin: '0 0 10px 0', fontWeight: '700' },
  emptySubText: { color: '#64748b', fontSize: '0.9rem', margin: '0 0 25px 0' },
  goBackBtn: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }
};

export default TakenQuizList;