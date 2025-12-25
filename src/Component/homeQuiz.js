import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Home, PlusSquare, PlusCircle, X, Edit3, ChevronRight, Trash2, AlertTriangle, Menu, RefreshCw, ShieldCheck, Search, SearchX, DatabaseZap } from 'lucide-react'; 
import { openDB } from '../db'; 

const HomeQuiz = ({ setCategories }) => {
  const navigate = useNavigate();
  const [localCategories, setLocalCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [sectionName, setSectionName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  const [authorNameInput, setAuthorNameInput] = useState("");
  const [isWrongAuthor, setIsWrongAuthor] = useState(false);

  const filteredCategories = localCategories.filter(cat => 
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parseRawText = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const parsedQuestions = [];
    let currentQ = {};

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('Q:')) {
        if (currentQ.question) parsedQuestions.push(currentQ);
        currentQ = { question: trimmedLine.replace('Q:', '').trim() };
      } else if (trimmedLine.startsWith('A)')) {
        currentQ.a = trimmedLine.replace('A)', '').trim();
      } else if (trimmedLine.startsWith('B)')) {
        currentQ.b = trimmedLine.replace('B)', '').trim();
      } else if (trimmedLine.startsWith('C)')) {
        currentQ.c = trimmedLine.replace('C)', '').trim();
      } else if (trimmedLine.startsWith('D)')) {
        currentQ.d = trimmedLine.replace('D)', '').trim();
      } else if (trimmedLine.startsWith('ANS:')) {
        currentQ.answer = trimmedLine.replace('ANS:', '').trim();
      }
    });
    if (currentQ.question) parsedQuestions.push(currentQ);
    return parsedQuestions;
  };

  const handleAdminSync = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    setLoginError("");

    try {
      const response = await fetch('https://quiz-backend-98qe.onrender.com/api/quizzes/admin-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const db = await openDB();
        const tx = db.transaction(["tests", "sections"], "readwrite");
        const testStore = tx.objectStore("tests");
        const sectionStore = tx.objectStore("sections");

        const existingSectionsRequest = sectionStore.getAll();
        
        existingSectionsRequest.onsuccess = async () => {
          const existingNames = new Set(existingSectionsRequest.result.map(s => s.name));
          // API data ko order preserve karne ke liye loop karte hain
          for (const quiz of result.data) {
            const questionsArray = parseRawText(quiz.fileContent);
            testStore.put({
              id: quiz._id,
              testName: quiz.testName,
              category: quiz.category,
              description: quiz.description,
              totalQuestions: quiz.totalQuestions || questionsArray.length,
              questions: questionsArray,
              createdAt: quiz.createdAt
            });

            if (quiz.category && !existingNames.has(quiz.category.trim())) {
              sectionStore.add({ name: quiz.category.trim(), createdAt: new Date(quiz.createdAt).getTime() });
              existingNames.add(quiz.category.trim());
            }
          }
        };

        tx.oncomplete = () => {
          loadLocalData(); 
          setShowAdminModal(false);
          setAdminEmail("");
          setAdminPassword("");
          alert("Cloud data synchronized successfully!");
        };
      } else {
        setLoginError(result.error || "Login Failed");
      }
    } catch (err) {
      setLoginError("Server Error: Check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- UPDATED: Isse sequence order maintain rahega (First created, first shown) ---
  const loadLocalData = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction("sections", "readonly");
      const store = tx.objectStore("sections");
      const request = store.getAll();

      request.onsuccess = () => {
        // Hum categories ko unki creation order (default auto-increment ID) ke hisaab se rakhenge
        // Agar aapko History (Pehle wala) top pe chahiye, toh simple getAll() kaafi hai
        // Agar ulta ho rha ho toh .reverse() laga sakte hain.
        const savedSections = request.result.map(s => s.name);
        setLocalCategories(savedSections);
        setCategories(savedSections);
      };
    } catch (err) {
      console.error("Error loading sections:", err);
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  const saveAllToDB = async (newCats) => {
    const db = await openDB();
    const tx = db.transaction("sections", "readwrite");
    const store = tx.objectStore("sections");
    store.clear(); 
    newCats.forEach(cat => store.add({ name: cat }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sectionName.trim()) return;

    let updatedCats;
    if (isEditing) {
      updatedCats = [...localCategories];
      updatedCats[editIndex] = sectionName;
    } else {
      updatedCats = [...localCategories, sectionName];
    }

    setLocalCategories(updatedCats);
    setCategories(updatedCats);
    saveAllToDB(updatedCats);
    
    setSectionName("");
    setShowModal(false);
    setIsEditing(false);
    setEditIndex(null);
  };

  const openEditModal = (e, index, name) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditIndex(index);
    setSectionName(name);
    setShowModal(true);
  };

  const openDeleteModal = (e, index) => {
    e.stopPropagation();
    setDeleteTargetIndex(index);
    setAuthorNameInput("");
    setIsWrongAuthor(false);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = (e) => {
    e.preventDefault();
    if (authorNameInput.toLowerCase() === "aditya ranjan") {
      const updatedCats = localCategories.filter((_, i) => i !== deleteTargetIndex);
      setLocalCategories(updatedCats);
      setCategories(updatedCats);
      saveAllToDB(updatedCats);
      setShowDeleteModal(false);
    } else {
      setIsWrongAuthor(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>
      {isSyncing && (
        <div style={syncStatusBarStyle}>
          <RefreshCw size={14} className="spin-icon" /> Accessing cloud data...
        </div>
      )}

      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={logoStyle}>Er.</div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>ADITYA RANJAN</h2>
        </div>

        <div className="desktop-menu" style={desktopNavLinks}>
          <button onClick={() => navigate('/')} style={navBtn}><Home size={18} /> Home</button>
          <button onClick={() => navigate('/create-test')} style={navBtn}><PlusSquare size={18} /> Create Test</button>
          <button onClick={() => { setIsEditing(false); setSectionName(""); setShowModal(true); }} style={navBtn}>
            <PlusCircle size={18} /> New Section
          </button>
          <button onClick={() => setShowAdminModal(true)} style={navBtnPrimary}>
            <ShieldCheck size={18} /> Admin Sync
          </button>
        </div>

        <button className="mobile-hamburger" style={hamburgerBtn} onClick={() => setIsMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </nav>

      {isMenuOpen && (
        <div style={drawerOverlay} onClick={() => setIsMenuOpen(false)}>
          <div style={drawerContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <X size={24} style={{ cursor: 'pointer' }} onClick={() => setIsMenuOpen(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} style={drawerLink}><Home size={20} /> Home</button>
              <button onClick={() => { navigate('/create-test'); setIsMenuOpen(false); }} style={drawerLink}><PlusSquare size={20} /> Create Test</button>
              <button onClick={() => { setIsEditing(false); setSectionName(""); setShowModal(true); setIsMenuOpen(false); }} style={drawerLink}><PlusCircle size={20} /> New Section</button>
              <button onClick={() => { setShowAdminModal(true); setIsMenuOpen(false); }} style={drawerLink}><ShieldCheck size={20} /> Admin Sync</button>
            </div>
          </div>
        </div>
      )}

      <div style={mainContentStyle}>
        <div style={welcomeHeader}>
          <h1 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '5px' }}>Quiz Library</h1>
          <p style={{ color: '#64748b' }}>Admin access required to sync cloud databases.</p>
          
          {localCategories.length > 0 && (
            <div style={searchContainer}>
              <Search size={20} color="#64748b" style={{ marginLeft: '15px' }} />
              <input 
                type="text" 
                placeholder="Search sections..." 
                style={searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <X size={18} color="#64748b" style={{ marginRight: '15px', cursor: 'pointer' }} onClick={() => setSearchQuery("")} />
              )}
            </div>
          )}
        </div>

        {localCategories.length === 0 ? (
          <div style={firstTimeBox}>
            <DatabaseZap size={50} color="#3b82f6" />
            <h2 style={{ color: '#1e293b', marginTop: '20px' }}>No Content Available!</h2>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '10px auto', lineHeight: '1.5' }}>
              Please ask **Admin** to sync the questions from the cloud or use the **Admin Sync** button above to fetch data.
            </p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div style={gridStyle}>
            {filteredCategories.map((cat, index) => (
              <div key={index} style={cardStyle} onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}>
                <div style={iconCircle}><Layout size={28} color="#3b82f6" /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={categoryTitle}>{cat}</h3>
                  <p style={categorySubText}>Open Section <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /></p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={(e) => openEditModal(e, index, cat)} style={editIconBtn} title="Edit Section"><Edit3 size={18} /></button>
                  <button onClick={(e) => openDeleteModal(e, index)} style={deleteIconBtn} title="Delete Section"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={notFoundStyle}>
            <SearchX size={60} color="#cbd5e1" strokeWidth={1.5} />
            <h3 style={{ color: '#1e293b', marginTop: '15px' }}>Section Not Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No results for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} style={clearSearchBtn}>Clear Search</button>
          </div>
        )}
      </div>

      {showAdminModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Admin Authentication</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowAdminModal(false)} />
            </div>
            <form onSubmit={handleAdminSync}>
              <label style={labelStyle}>Admin Email</label>
              <input type="email" style={inputStyle} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Email address" required />
              <label style={{...labelStyle, marginTop: '15px'}}>Password</label>
              <input type="password" style={inputStyle} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter Password" required />
              {loginError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px' }}>{loginError}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" style={saveBtn} disabled={isSyncing}>
                   {isSyncing ? "Syncing..." : "Verify & Sync"}
                </button>
                <button type="button" onClick={() => setShowAdminModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{isEditing ? "Edit Section" : "New Section"}</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Section Name</label>
              <input autoFocus type="text" style={inputStyle} value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Enter name" required />
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" style={saveBtn}>{isEditing ? "Update" : "Create"}</button>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={modalOverlay}>
          <div style={{...modalContent, border: '2px solid #ef4444'}}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '10px' }} />
              <h3 style={{ margin: 0, color: '#991b1b' }}>Dangerous Action!</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Verify author name to delete.</p>
            </div>
            <form onSubmit={handleConfirmDelete}>
              <input autoFocus type="text" style={{...inputStyle, borderColor: isWrongAuthor ? '#ef4444' : '#cbd5e1'}} value={authorNameInput} onChange={(e) => {setAuthorNameInput(e.target.value); setIsWrongAuthor(false);}} placeholder="Type Author Name..." required />
              {isWrongAuthor && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>Wrong Name!</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" style={deleteConfirmBtn}>Confirm</button>
                <button type="button" onClick={() => setShowDeleteModal(false)} style={cancelBtn}>Back</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 2s linear infinite; }
        @media (max-width: 768px) { .desktop-menu { display: none !important; } .mobile-hamburger { display: flex !important; } }
        @media (min-width: 769px) { .desktop-menu { display: flex !important; } .mobile-hamburger { display: none !important; } }
      `}</style>
    </div>
  );
};

// --- Styles Same ---
const mainContentStyle = { padding: '20px 5% 50px', maxWidth: '1200px', margin: '0 auto' };
const welcomeHeader = { textAlign: 'center', marginBottom: '25px' };
const firstTimeBox = { textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: '25px', border: '2px dashed #3b82f6', marginTop: '30px' };
const searchContainer = { display: 'flex', alignItems: 'center', backgroundColor: '#fff', width: '100%', maxWidth: '500px', margin: '20px auto 0', borderRadius: '15px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' };
const searchInput = { flex: 1, border: 'none', padding: '14px 15px', fontSize: '1rem', outline: 'none', backgroundColor: 'transparent', color: '#1e293b' };
const notFoundStyle = { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: '20px', border: '2px dashed #e2e8f0' };
const clearSearchBtn = { marginTop: '20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const syncStatusBarStyle = { backgroundColor: '#3b82f6', color: '#fff', textAlign: 'center', padding: '5px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' };
const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 5%', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 };
const desktopNavLinks = { display: 'flex', gap: '15px' };
const logoStyle = { backgroundColor: '#3b82f6', color: '#fff', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };
const navBtn = { background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' };
const navBtnPrimary = { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' };
const hamburgerBtn = { display: 'none', background: '#f8fafc', border: '1.5px solid #e2e8f0', padding: '8px', borderRadius: '10px', cursor: 'pointer' };
const drawerOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-start' };
const drawerContent = { backgroundColor: '#fff', width: '280px', height: '100%', padding: '30px', boxShadow: '4px 0 15px rgba(0,0,0,0.1)' };
const drawerLink = { background: 'none', border: 'none', textAlign: 'left', fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', padding: '12px 0', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' };
const cardStyle = { display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '0.3s ease' };
const iconCircle = { backgroundColor: '#eff6ff', minWidth: '55px', height: '55px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const categoryTitle = { margin: '0 0 5px 0', fontSize: '1.2rem', color: '#1e293b' };
const categorySubText = { fontSize: '0.85rem', color: '#3b82f6', margin: 0, fontWeight: '600' };
const editIconBtn = { padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer' };
const deleteIconBtn = { padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#fff1f1', color: '#ef4444', cursor: 'pointer' };
const deleteConfirmBtn = { flex: 2, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContent = { backgroundColor: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
const saveBtn = { flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtn = { flex: 1, padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '10px', border: 'none', cursor: 'pointer', color: '#475569', fontWeight: 'bold' };

export default HomeQuiz;