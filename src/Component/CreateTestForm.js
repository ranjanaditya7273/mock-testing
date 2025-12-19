import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { saveTestToDB } from '../db';
import './createQuiz.css'; // Ensure the path is correct

const CreateTestForm = ({ categories }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [testName, setTestName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
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
      setQuestions(parsedQuestions);
    };

    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!testName || !selectedCategory || questions.length === 0) {
      alert("Please enter Test Name, select a Category, and upload a .txt file.");
      return;
    }
    
    const finalTestData = {
      testName,
      category: selectedCategory, // Used for filtering in CategoryQuizzes.jsx
      description,
      totalQuestions: questions.length,
      questions
    };

    try {
      await saveTestToDB(finalTestData);
      alert(`Test Created Successfully! ${questions.length} questions saved.`);
      
      navigate(`/category/${encodeURIComponent(selectedCategory)}`);
      
    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving test to database.");
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Mini Nav for Back Button */}
      <nav style={navBarStyle}>
        <button 
          onClick={() => navigate('/')} 
          style={backBtnStyle}
        >
          <ArrowLeft size={20} /> Home
        </button>
        <span style={{ color: '#d1d5db' }}>|</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Create New Quiz</h3>
      </nav>

      <div className="form-container" style={{ padding: '40px 20px' }}>
        <div className="form-card" style={formCardStyle}>
          
          <div className="form-header" style={{ marginBottom: '25px' }}>
            <h2 style={{ color: '#111827', margin: '0 0 10px 0' }}>Test Details</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Fill in the details and upload your question file.</p>
          </div>

          <div className="form-body">
            {/* Test Name */}
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Test Name</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="e.g. Science Mock Test" 
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Category Dropdown */}
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Select Section/Category</label>
              <select 
                className="input-field"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="" disabled>Choose a section...</option>
                {categories.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Description (Optional)</label>
              <textarea 
                className="input-field"
                style={{ ...inputStyle, resize: 'none' }}
                placeholder="What is this test about?" 
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* File Upload Area */}
            <input 
              type="file" 
              accept=".txt" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />

            <div className="input-group" style={{ marginBottom: '30px' }}>
              <label style={labelStyle}>Questions File (.txt)</label>
              <div 
                className="upload-box" 
                onClick={() => fileInputRef.current.click()}
                style={{ 
                  ...uploadBoxBase,
                  backgroundColor: fileName ? '#f0fdf4' : '#eff6ff',
                  borderColor: fileName ? '#10b981' : '#bfdbfe'
                }}
              >
                {fileName ? (
                  <div style={uploadStatusStyle}>
                    <CheckCircle color="#10b981" size={40} />
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{fileName}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>{questions.length} Questions detected</span>
                  </div>
                ) : (
                  <div style={uploadStatusStyle}>
                    <Upload color="#3b82f6" size={40} />
                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>Tap to upload questions file</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button 
              className="save-btn" 
              onClick={handleSave}
              style={saveButtonStyle}
            >
              <Save size={20} />
              Save Test & Open Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const navBarStyle = { padding: '15px 30px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px' };
const backBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563', fontWeight: '600' };
const formCardStyle = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '0.95rem' };
const uploadBoxBase = { border: '2px dashed', borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer' };
const uploadStatusStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' };
const saveButtonStyle = { width: '100%', padding: '15px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };

export default CreateTestForm;