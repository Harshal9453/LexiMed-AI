import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Simple animation variant for list items
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

function SimplifyReport() {
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState('English');
  const [originalText, setOriginalText] = useState('');
  // --- STATE CHANGE: Store structured data or raw text fallback ---
  const [simplifiedData, setSimplifiedData] = useState(null); // Will hold the JSON object
  const [simplifiedRaw, setSimplifiedRaw] = useState(''); // Fallback for plain text/error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Chat state remains the same
  const [chatHistory, setChatHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setLoading(true);
    setOriginalText('');
    setSimplifiedData(null); // Reset JSON data
    setSimplifiedRaw(''); // Reset raw data
    setChatHistory([]);
    setCurrentQuestion('');
    setError(null);
    setChatError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);
    try {
      const response = await fetch('http://localhost:8000/simplify', { // Adjust port if needed
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Something went wrong');
      }
      const data = await response.json();
      setOriginalText(data.original_text);
      // --- CHECK if we got JSON data or raw fallback ---
      if (data.simplified_data) {
        setSimplifiedData(data.simplified_data);
      } else if (data.simplified_report_raw) {
        setSimplifiedRaw(data.simplified_report_raw);
      } else {
        // Handle unexpected response structure if necessary
         setSimplifiedRaw("Received an unexpected response format from the server.");
      }
    } catch (err) {
      setError(err.message);
      setSimplifiedRaw(''); // Clear any potential raw data on error
      setSimplifiedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    // ... (chat submit logic remains the same) ...
    e.preventDefault();
    if (!currentQuestion.trim() || !originalText) return;

    const question = currentQuestion.trim();
    setChatLoading(true);
    setChatError(null);
    setCurrentQuestion('');

    setChatHistory((prev) => [...prev, { question, answer: '...' }]);

    const formData = new FormData();
    formData.append('original_text', originalText);
    formData.append('user_question', question);

    try {
      const response = await fetch('http://localhost:8000/chat_report', { // Adjust port if needed
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Something went wrong with chat');
      }
      const data = await response.json();

      setChatHistory((prev) => {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1].answer = data.answer;
        return updatedHistory;
      });
    } catch (err) {
      setChatError(err.message);
      setChatHistory((prev) => {
         const updatedHistory = [...prev];
         updatedHistory[updatedHistory.length - 1].answer = 'Error getting answer.';
         return updatedHistory;
       });
    } finally {
      setChatLoading(false);
    }
  };


  return (
    <motion.div
      className="feature-container"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {/* Column 1: Text */}
      <div className="feature-text">
        <h2>Simplify & Discuss Reports</h2>
        <p>
          Upload a medical report for a simple explanation, then ask follow-up
          questions about the details.
        </p>
      </div>

      {/* Column 2: The Form & Results */}
      <div className="feature-form-area">
        {/* --- Original Form --- */}
        <form onSubmit={handleSubmit}>
          {/* ... (form inputs remain the same) ... */}
           <div className="form-group">
            <label htmlFor="lang">Language for Summary:</label>
            <input
              type="text"
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="file-simplify">Upload Report:</label>
            <input
              type="file"
              id="file-simplify"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Simplifying...' : 'Simplify Report'}
          </button>
        </form>

        {loading && (
          <p className="loading">Processing report... This may take a moment.</p>
        )}
        {error && <p className="error">{error}</p>}

        {/* --- NEW: Dynamic Rendering based on simplifiedData --- */}
        {simplifiedData && (
          <div className="simplified-report-display" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{simplifiedData.title || "Simplified Report"}</h3>
            <p style={{ color: '#555', marginBottom: '2rem' }}>{simplifiedData.introduction}</p>

            {simplifiedData.sections?.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                className="report-section" // Add a class for potential styling
                style={{ marginBottom: '2.5rem' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sectionIndex * 0.1 }}
              >
                <h4 style={{ fontSize: '1.2rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  {section.sectionTitle}
                </h4>
                {section.sectionDescription && (
                  <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    {section.sectionDescription}
                  </p>
                )}
                {section.results?.map((result, resultIndex) => (
                  <motion.div
                    key={resultIndex}
                    variants={itemVariants} // Use the simple slide-in animation
                    initial="hidden"
                    animate="visible"
                    style={{ marginBottom: '1.5rem', paddingLeft: '1rem', borderLeft: '3px solid #0071e3' }}
                  >
                    <p style={{ margin: '0 0 0.2rem 0', fontWeight: '600' }}>{result.testName}</p>
                    <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem' }}>
                      <span style={{ color: '#555' }}>Your Result:</span> <strong>{result.yourResult}</strong>
                    </p>
                    <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem' }}>
                      <span style={{ color: '#555' }}>Normal Range:</span> {result.normalRange}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                       {result.interpretation}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </div>
        )}

        {/* --- Fallback for Raw Text / Error --- */}
        {simplifiedRaw && !simplifiedData && (
             <div className="result-box" style={{ marginTop: '1.5rem' }}>
                 <h3>Simplified Explanation (Raw)</h3>
                 <p style={{ whiteSpace: 'pre-wrap' }}>{simplifiedRaw}</p>
                 <p style={{marginTop:'1rem', fontStyle:'italic', color:'orange'}}>Note: Could not parse structured data, showing raw response.</p>
             </div>
        )}


        {/* --- Chat Section (Only shows AFTER simplification data exists) --- */}
        {(simplifiedData || simplifiedRaw) && originalText && ( // Check if there's any result
          <div className="chat-section" style={{ marginTop: '2rem' }}>
             {/* ... (Chat history display and input form remain the same) ... */}
             <h4>Ask a question about your report:</h4>
            <div
              className="chat-history result-box"
              style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}
            >
              {chatHistory.map((entry, index) => (
                <div key={index} style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0' }}><strong>You:</strong> {entry.question}</p>
                  <p style={{ margin: 0, color: '#555' }}><strong>LexiMed:</strong> {entry.answer}</p>
                </div>
              ))}
              {chatLoading && <p className="loading">LexiMed is thinking...</p>}
              {chatError && <p className="error">{chatError}</p>}
            </div>
            <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Type your question here..."
                disabled={chatLoading}
                style={{ flexGrow: 1 }}
              />
              <button type="submit" disabled={chatLoading || !currentQuestion.trim()}>
                {chatLoading ? 'Asking...' : 'Ask'}
              </button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default SimplifyReport;