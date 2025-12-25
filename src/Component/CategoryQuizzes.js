import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllTestsFromDB, deleteTestFromDB } from '../db';
import { ArrowLeft, ChevronRight, BookOpen, Trash2, AlertTriangle, Info, CheckCircle, Timer } from 'lucide-react';

const CategoryQuizzes = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [isWrongAuthor, setIsWrongAuthor] = useState(false);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const allTests = await getAllTestsFromDB();
      const filtered = allTests.filter(test => test.category === categoryName);
      setQuizzes(filtered);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, [categoryName]);

  const openDeleteConfirm = (e, id) => {
    e.stopPropagation();
    setSelectedQuizId(id);
    setAuthorNameInput("");
    setIsWrongAuthor(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (authorNameInput.toLowerCase() === "aditya ranjan") {
      if (selectedQuizId) {
        await deleteTestFromDB(selectedQuizId);
        setShowDeleteModal(false);
        fetchQuizzes();
      }
    } else {
      setIsWrongAuthor(true);
    }
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "Date Unknown";
    const d = new Date(dateInput);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Time format karne ka helper
  const formatTimeDisplay = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds === null) return null;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return (
      <span className="time-display-mobile">
        <span className="separator-desktop"> | </span>
        <Timer size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
        {mins}m {secs}s
      </span>
    );
  };

  // ScoreProgress component FIX
  const ScoreProgress = ({ score, quizData }) => {
    if (!score) return null;
    const total = score.total || (score.correct + score.wrong + score.skipped);
    const correctPct = Math.round((score.correct / total) * 100) || 0;
    const wrongPct = Math.round((score.wrong / total) * 100) || 0;

    const handleStatClick = (filterType) => {
      // FIX: Route ko '/taken-quiz-list' kar diya hai taaki aapki nayi file open ho
      navigate('/taken-quiz-list', { 
        state: { 
          quizTitle: quizData.testName,
          questions: quizData.questions,
          userAnswers: score.userAnswers || [], 
          filter: filterType 
        } 
      });
    };

    return (
      <div style={styles.scoreSectionWrapper}>
        <div style={styles.statsRow}>
          <div 
            onClick={() => handleStatClick('correct')} 
            style={{ ...styles.statItem, color: '#10b981', cursor: 'pointer' }}
          >
            <span style={styles.dot}>●</span> {score.correct} Correct ({correctPct}%)
          </div>
          <div 
            onClick={() => handleStatClick('wrong')} 
            style={{ ...styles.statItem, color: '#ef4444', cursor: 'pointer' }}
          >
            <span style={styles.dot}>●</span> {score.wrong} Wrong ({wrongPct}%)
          </div>
          <div 
            onClick={() => handleStatClick('skipped')} 
            style={{ ...styles.statItem, color: '#b45309', cursor: 'pointer' }}
          >
            <span style={styles.dot}>●</span> {score.skipped} Skip
          </div>
        </div>
        <div style={styles.scoreBarWrapper}>
          <div style={{ ...styles.barSegment, width: `${(score.correct/total)*100}%`, backgroundColor: '#10b981' }} />
          <div style={{ ...styles.barSegment, width: `${(score.wrong/total)*100}%`, backgroundColor: '#ef4444' }} />
          <div style={{ ...styles.barSegment, width: `${(score.skipped/total)*100}%`, backgroundColor: '#f59e0b' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageWrapper}>
      <style>
        {`
          @media (max-width: 480px) {
            .status-badge-container { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; padding: 10px 14px !important; }
            .separator-desktop { display: none !important; }
            .time-display-mobile { display: flex !important; align-items: center; margin-left: 0 !important; }
          }
        `}
      </style>
      <div style={styles.contentContainer}>
        <nav style={styles.navStyle}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>
            <ArrowLeft size={18}/> Back
          </button>
          <div style={styles.titleContainer}>
            <h2 style={styles.centeredTitleStyle}>{categoryName?.toUpperCase()}</h2>
            <span style={styles.subtitleTitle}>Quizzes</span>
          </div>
          <div style={{ width: 80 }}></div>
        </nav>

        {loading ? (
          <div style={styles.centerMsg}>Loading tests...</div>
        ) : (
          <div style={styles.gridStyle}>
            {quizzes.length > 0 ? (
              quizzes.map((quiz, idx) => {
                const isTaken = !!quiz.latestScore;
                return (
                  <div key={quiz.id || idx} style={{
                    ...styles.cardContainer,
                    background: isTaken 
                      ? 'linear-gradient(180deg, #e4f6eb 0%, #f0fdf4 100%)' 
                      : 'linear-gradient(180deg, #ffdcb8 0%, #fff0e1 100%)',
                    borderColor: isTaken ? '#bbf7d0' : '#ffcba4',
                  }}>
                    
                    <div style={{ padding: '12px 15px 0 15px' }}>
                        <div className="status-badge-container" style={{
                            ...styles.statusBadge,
                            backgroundColor: isTaken ? '#c6f6d5' : '#ffcf9d',
                            color: isTaken ? '#22543d' : '#854d0e',
                            display: 'flex', alignItems: 'center'
                        }}>
                            {isTaken ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={14} /> 
                                        Completed: {formatDate(quiz.latestScore.date)}
                                    </div>
                                    {formatTimeDisplay(quiz.latestScore.timeTaken)}
                                </>
                            ) : (
                                <><Info size={14} /> Ready to start</>
                            )}
                        </div>
                    </div>

                    <div style={styles.quizCard}>
                      <div style={styles.leftInfoSection}>
                        <button onClick={(e) => openDeleteConfirm(e, quiz.id)} style={styles.deleteIconButton}>
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={styles.titleStyle}>{quiz.testName}</h4>
                          <p style={styles.subtitleStyle}>{quiz.questions?.length || 0} Questions</p>
                        </div>
                      </div>

                      <div style={styles.buttonGroup}>
                        <button 
                          onClick={() => navigate('/view-questions', { state: { data: quiz, mode: 'timer' } })} 
                          style={{...styles.actionBtn, backgroundColor: '#f97316', color: '#fff', marginBottom: '4px'}}
                        >
                          <Timer size={14} style={{marginRight: '6px'}}/> Timing Test
                        </button>

                        <button 
                          onClick={() => navigate('/view-questions', { state: { data: quiz, mode: 'exam' } })} 
                          style={{
                              ...styles.actionBtn, 
                              backgroundColor: isTaken ? '#10b981' : '#1e293b',
                              color: '#fff'
                          }}
                        >
                          {isTaken ? 'Retake' : 'Start'} {!isTaken && <ChevronRight size={14} style={{marginLeft: '4px'}}/>}
                        </button>
                        
                        <button 
                          onClick={() => navigate('/view-questions', { state: { data: quiz, mode: 'practice' } })} 
                          style={{...styles.actionBtn, ...styles.practiceBtn}}
                        >
                          <BookOpen size={14} style={{marginRight: '8px'}}/> Practice
                        </button>
                      </div>
                    </div>
                    
                    {isTaken && <ScoreProgress score={quiz.latestScore} quizData={quiz} />}
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyState}>
                <p style={{ color: '#64748b' }}>No quizzes found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
              <AlertTriangle size={40} color="#ef4444" />
              <h3 style={{ margin: '10px 0' }}>Delete Quiz?</h3>
              <form onSubmit={confirmDelete}>
                <input 
                  autoFocus type="text" 
                  style={{...styles.inputStyle, borderColor: isWrongAuthor ? '#ef4444' : '#e2e8f0'}}
                  value={authorNameInput}
                  onChange={(e) => {setAuthorNameInput(e.target.value); setIsWrongAuthor(false);}}
                  placeholder="Enter Author Name" required 
                />
                <div style={styles.modalActionGroup}>
                  <button type="submit" style={styles.yesBtn}>Delete</button>
                  <button type="button" onClick={() => setShowDeleteModal(false)} style={styles.noBtn}>Cancel</button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  pageWrapper: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px 15px', display: 'flex', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  contentContainer: { width: '100%', maxWidth: '850px' },
  navStyle: { width: '100%', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.04)' },
  centeredTitleStyle: { margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: '900' },
  subtitleTitle: { fontSize: '0.9rem', color: '#64748b', fontWeight: '700' },
  gridStyle: { display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', alignItems: 'center' },
  cardContainer: { width: '100%', maxWidth: '550px', borderRadius: '30px', border: '1.5px solid', overflow: 'hidden', boxShadow: '0 6px 25px rgba(0,0,0,0.06)' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' },
  quizCard: { padding: '15px 20px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  scoreSectionWrapper: { width: '100%', backgroundColor: '#fff', borderTop: '1px solid #f1f5f9' },
  statsRow: { display: 'flex', justifyContent: 'space-around', padding: '12px', fontSize: '0.75rem', fontWeight: '800' },
  statItem: { display: 'flex', alignItems: 'center', gap: '5px', transition: 'opacity 0.2s' },
  dot: { fontSize: '12px' },
  scoreBarWrapper: { display: 'flex', height: '8px', width: '100%', backgroundColor: '#f1f5f9' },
  barSegment: { height: '100%' },
  deleteIconButton: { background: 'white', border: '1px solid #fee2e2', borderRadius: '12px', padding: '10px', cursor: 'pointer', marginRight: '15px' },
  leftInfoSection: { display: 'flex', alignItems: 'center', flex: 1 },
  titleStyle: { margin: '0', color: '#1e293b', fontSize: '1.2rem', fontWeight: '900' },
  subtitleStyle: { margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: '6px', width: '145px' },
  actionBtn: { border: 'none', padding: '10px 0', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  practiceBtn: { backgroundColor: '#fff', color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  backBtn: { background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', padding: '10px 18px', borderRadius: '15px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '400px', textAlign: 'center' },
  inputStyle: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px', outline: 'none' },
  modalActionGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
  yesBtn: { flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', color: '#fff', fontWeight: '800', border: 'none' },
  noBtn: { flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: '800', border: 'none' },
  emptyState: { textAlign: 'center', padding: '50px', backgroundColor: '#fff', borderRadius: '25px', width: '100%' },
  centerMsg: { textAlign: 'center', padding: '100px', fontWeight: '700', color: '#64748b' }
};

export default CategoryQuizzes;