import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import HomeQuiz from './Component/homeQuiz';
import CreateTestForm from './Component/CreateTestForm';
import CategoryQuizzes from './Component/CategoryQuizzes';
import ViewQuestions from './Component/ViewQuestions';
import QuizAnalysis from './Component/QuizAnalysis'; // Naya Page Import Kiya

function App() {
  const [categories, setCategories] = useState([]);

  return (
    <Router>
      <Routes>
        {/* Home Page: Saare Categories/Folders dikhayega */}
        <Route path="/" element={<HomeQuiz setCategories={setCategories} />} />

        {/* Create Test Page: Naya quiz banane ke liye */}
        <Route path="/create-test" element={<CreateTestForm categories={categories} />} />

        {/* Category Page: Ek particular category ke saare quizzes dikhayega */}
        <Route path="/category/:categoryName" element={<CategoryQuizzes />} />

        {/* View Questions Page: Yahan Quiz Start hoga */}
        <Route path="/view-questions" element={<ViewQuestions />} />

        {/* Analysis Page: Correct/Wrong/Skip questions ki list dikhane ke liye */}
        <Route path="/taken-quiz-list" element={<QuizAnalysis />} />
        
      </Routes>
    </Router>
  );
}

export default App;