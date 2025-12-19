import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllTestsFromDB, deleteTestFromDB } from '../db';
import { ArrowLeft, FileText, ChevronRight, BookOpen, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';

const CategoryQuizzes = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  
  // Security logic states
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [isWrongAuthor, setIsWrongAuthor] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setAuthorNameInput(""); // Reset input
    setIsWrongAuthor(false); // Reset error
    setShowDeleteModal(true);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    // Case-insensitive security check
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

  // --- ScoreBar with Numeric Stats & Percentages ---
  const ScoreProgress = ({ score }) => {
    if (!score) return null;

    const total = score.total || (score.correct + score.wrong + score.skipped);
    if (total === 0) return null;

    const correctPct = (score.correct / total) * 100;
    const wrongPct = (score.wrong / total) * 100;
    const skippedPct = (score.skipped / total) * 100;

    return (
      <div style={styles.scoreSectionWrapper}>
        <div style={styles.statsRow}>
          <div style={{ ...styles.statItem, color: '#10b981' }}>
            <span style={styles.dot}>●</span>
            {score.correct} Correct ({Math.round(correctPct)}%)
          </div>
          <div style={{ ...styles.statItem, color: '#ef4444' }}>
            <span style={styles.dot}>●</span>
            {score.wrong} Wrong ({Math.round(wrongPct)}%)
          </div>
          <div style={{ ...styles.statItem, color: '#b45309' }}>
            <span style={styles.dot}>●</span>
            {score.skipped} Skip
          </div>
        </div>

        <div style={styles.scoreBarWrapper}>
          <div style={{ ...styles.barSegment, width: `${correctPct}%`, backgroundColor: '#10b981' }} />
          <div style={{ ...styles.barSegment, width: `${wrongPct}%`, backgroundColor: '#ef4444' }} />
          <div style={{ ...styles.barSegment, width: `${skippedPct}%`, backgroundColor: '#b45309' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.contentContainer}>
        
        <nav style={styles.navStyle}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>
            <ArrowLeft size={18}/> Back
          </button>
          <div style={styles.titleContainer}>
            <h2 style={styles.centeredTitleStyle}>{categoryName?.toUpperCase()}</h2>
            <span style={styles.subtitleTitle}>Quizzes</span>
          </div>
          <div style={{ width: isMobile ? 35 : 80 }}></div>
        </nav>

        {loading ? (
          <div style={styles.centerMsg}>Loading Quizzes...</div>
        ) : (
          <div style={styles.gridStyle}>
            {quizzes.length > 0 ? (
              quizzes.map((quiz, idx) => (
                <div key={idx} style={styles.cardContainer}>
                  <div style={styles.quizCard}>
                    <div style={styles.leftInfoSection}>
                      <button 
                        onClick={(e) => openDeleteConfirm(e, quiz.id)} 
                        style={styles.deleteIconButton}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={styles.titleStyle}>{quiz.testName}</h4>
                        <p style={styles.subtitleStyle}>{quiz.totalQuestions} Questions</p>
                      </div>
                    </div>

                    <div style={styles.buttonGroup}>
                      <button onClick={() => navigate('/view-questions', { state: { data: quiz, mode: 'exam' } })} style={styles.playBtn}>
                        Start <ChevronRight size={14} style={{marginLeft: '4px'}}/>
                      </button>
                      <button onClick={() => navigate('/view-questions', { state: { data: quiz, mode: 'practice' } })} style={styles.practiceBtn}>
                        <BookOpen size={14} style={{marginRight: '6px'}}/> Practice
                      </button>
                    </div>
                  </div>
                  
                  <ScoreProgress score={quiz.latestScore} />
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <p style={{ color: '#64748b', marginBottom: '15px' }}>No quizzes found.</p>
                <button onClick={() => navigate('/create-test')} style={styles.createBtn}>+ Create Quiz</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Updated Security Delete Modal --- */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, border: '2px solid #ef4444', maxWidth: '380px'}}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <AlertTriangle size={42} color="#ef4444" style={{ marginBottom: '10px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>Delete Quiz?</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                This action cannot be undone. Please verify author to continue.
              </p>
            </div>
            
            <form onSubmit={confirmDelete}>
              <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                <label style={styles.labelStyle}>Author Name</label>
                <input 
                  autoFocus
                  type="text" 
                  style={{
                    ...styles.inputStyle, 
                    borderColor: isWrongAuthor ? '#ef4444' : '#cbd5e1',
                    backgroundColor: isWrongAuthor ? '#fff1f1' : '#fff'
                  }}
                  value={authorNameInput}
                  onChange={(e) => {
                    setAuthorNameInput(e.target.value);
                    setIsWrongAuthor(false);
                  }}
                  placeholder="Enter Author Name"
                  required
                />
                {isWrongAuthor && (
                  <p style={styles.errorText}>Verification failed! Wrong Author Name.</p>
                )}
              </div>
              
              <div style={styles.modalActionGroup}>
                <button type="submit" style={styles.yesBtn}>Delete Forever</button>
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
  // Existing Styles retained
  pageWrapper: { minHeight: '100vh', backgroundColor: '#f4f7f9', padding: '20px 15px', display: 'flex', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
  contentContainer: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  navStyle: { width: '100%', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box' },
  titleContainer: { textAlign: 'center' },
  centeredTitleStyle: { margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' },
  subtitleTitle: { fontSize: '1rem', color: '#475569', fontWeight: '700' },
  gridStyle: { display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', alignItems: 'center', paddingBottom: '40px' },
  
  cardContainer: {
    width: '100%', maxWidth: '500px',
    backgroundColor: '#fff', borderRadius: '24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7',
    overflow: 'hidden', display: 'flex', flexDirection: 'column'
  },
  quizCard: { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', width: '100%', boxSizing: 'border-box' },

  // Score Bar Styles
  scoreSectionWrapper: { width: '100%', backgroundColor: '#f8fafc', borderTop: '1px solid #edf2f7' },
  statsRow: { display: 'flex', justifyContent: 'space-around', padding: '8px 10px', fontSize: '0.72rem', fontWeight: '800' },
  statItem: { display: 'flex', alignItems: 'center', gap: '3px' },
  dot: { fontSize: '10px' },
  scoreBarWrapper: { display: 'flex', height: '4px', width: '100%', backgroundColor: '#f1f5f9' },
  barSegment: { height: '100%', transition: 'width 0.4s ease-out' },

  // Buttons & Inputs
  deleteIconButton: { background: '#fff1f1', border: 'none', borderRadius: '10px', padding: '7px', cursor: 'pointer', display: 'flex', marginRight: '10px' },
  leftInfoSection: { display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 },
  titleStyle: { margin: '0 0 4px 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: '800', lineHeight: '1.3' },
  subtitleStyle: { margin: 0, fontSize: '0.8rem', color: '#718096', fontWeight: '500' },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '20px', minWidth: '105px' },
  playBtn: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' },
  practiceBtn: { backgroundColor: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700' },
  backBtn: { background: '#fff', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#1e293b', padding: '8px 15px', borderRadius: '12px' },
  
  // Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '28px', width: '90%', textAlign: 'center' },
  labelStyle: { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' },
  inputStyle: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' },
  errorText: { color: '#ef4444', fontSize: '0.75rem', marginTop: '5px', fontWeight: '700' },
  modalActionGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
  noBtn: { flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '700', cursor: 'pointer' },
  yesBtn: { flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer' },
  
  emptyState: { textAlign: 'center', padding: '60px 20px', width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '24px', border: '2px dashed #cbd5e1' },
  centerMsg: { textAlign: 'center', padding: '100px', fontSize: '1.1rem', color: '#64748b', fontWeight: '600' }
};

export default CategoryQuizzes;