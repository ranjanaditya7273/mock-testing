import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, Inbox } from 'lucide-react';

const TakenQuizList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizTitle, questions, userAnswers, filter } = location.state || {};

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
    if (userAns === correctAnsLabel) return <CheckCircle color="#10b981" size={20} />;
    if (userAns === "") return <HelpCircle color="#f59e0b" size={20} />;
    return <XCircle color="#ef4444" size={20} />;
  };

  // Helper to get dynamic empty message
  const getEmptyMessage = () => {
    if (filter === 'correct') return "No Correct Answers Found";
    if (filter === 'wrong') return "No Wrong Answers Found";
    if (filter === 'skipped') return "No Skipped Questions Found";
    return "No Questions Found";
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> <span style={styles.hideOnMobile}>Back</span>
        </button>
        <div style={styles.navCenter}>
            <h3 style={styles.navTitle}>{quizTitle}</h3>
            <span style={styles.navSubtitle}>{filter} Questions</span>
        </div>
        <div style={{width: 45}}></div>
      </nav>

      <div style={styles.list}>
        {filteredList.length > 0 ? (
          filteredList.map((q) => {
            const realIdx = questions.findIndex(item => item.question === q.question);
            const correctAnsLabel = getLabelFromIndex(q.answer);
            const userAnsLabel = userAnswers[realIdx];

            return (
              <div key={realIdx} style={styles.qCard}>
                <div style={styles.qHeader}>
                  <span style={styles.qNumber}>Q. {realIdx + 1}</span>
                  {getStatusIcon(q, realIdx)}
                </div>
                <p style={styles.questionText}>{q.question}</p>
                
                <div style={styles.optionsGrid}>
                  {['a', 'b', 'c', 'd'].map((optKey, idx) => {
                    const currentLabel = String.fromCharCode(65 + idx);
                    const isCorrect = correctAnsLabel === currentLabel;
                    const isUserSelected = userAnsLabel === currentLabel;

                    return (
                      <div key={optKey} style={{
                        ...styles.option,
                        backgroundColor: isCorrect ? '#e4f6eb' : (isUserSelected ? '#fee2e2' : '#f8fafc'),
                        border: isCorrect ? '1px solid #10b981' : '1px solid #e2e8f0',
                        color: isCorrect ? '#065f46' : (isUserSelected ? '#991b1b' : '#334155')
                      }}>
                        <span style={{fontWeight: 'bold', marginRight: '5px'}}>{currentLabel})</span> {q[optKey]}
                      </div>
                    );
                  })}
                </div>
                <div style={styles.ansKey}>
                  <div>Correct: <span style={{color: '#10b981'}}>{correctAnsLabel}</span></div>
                  <div style={{borderLeft: '1px solid #e2e8f0', height: '15px'}}></div>
                  <div>Your Answer: <span style={{color: userAnsLabel === correctAnsLabel ? '#10b981' : '#ef4444'}}>
                    {userAnsLabel || "Skipped"}
                  </span></div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconBox}>
              <Inbox size={48} color="#94a3b8" />
            </div>
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
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '40px' },
  nav: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '12px 15px', 
    backgroundColor: '#fff', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    position: 'sticky', 
    top: 0, 
    zIndex: 10 
  },
  navCenter: { textAlign: 'center', flex: 1, padding: '0 10px' },
  navTitle: { margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' },
  navSubtitle: { color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' },
  backBtn: { border: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '600', color: '#475569' },
  hideOnMobile: window.innerWidth < 480 ? { display: 'none' } : {},
  list: { maxWidth: '650px', margin: '15px auto', padding: '0 12px' },
  qCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  qHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  qNumber: { fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' },
  questionText: { fontSize: '1rem', color: '#1e293b', fontWeight: '600', marginBottom: '16px', lineHeight: '1.5' },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  option: { padding: '12px', borderRadius: '10px', fontSize: '0.9rem', lineHeight: '1.4' },
  ansKey: { 
    marginTop: '16px', 
    paddingTop: '12px', 
    borderTop: '1px solid #f1f5f9', 
    display: 'flex', 
    gap: '15px', 
    alignItems: 'center',
    fontSize: '0.8rem', 
    fontWeight: '700' 
  },
  // Empty State Styles
  emptyState: { 
    marginTop: '60px', 
    textAlign: 'center', 
    padding: '40px 20px', 
    backgroundColor: '#fff', 
    borderRadius: '24px', 
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' 
  },
  emptyIconBox: { 
    backgroundColor: '#f1f5f9', 
    width: '80px', 
    height: '80px', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    margin: '0 auto 20px' 
  },
  emptyText: { color: '#1e293b', fontSize: '1.25rem', margin: '0 0 10px 0', fontWeight: '700' },
  emptySubText: { color: '#64748b', fontSize: '0.9rem', margin: '0 0 25px 0' },
  goBackBtn: { 
    backgroundColor: '#1e293b', 
    color: '#fff', 
    border: 'none', 
    padding: '12px 30px', 
    borderRadius: '12px', 
    fontWeight: '600', 
    cursor: 'pointer' 
  }
};

export default TakenQuizList;