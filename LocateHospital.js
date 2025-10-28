import React, { useState } from 'react';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function LocateHospital() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simplifiedReport, setSimplifiedReport] = useState(null); // Store simplified report JSON
  
  // --- NEW STATE: Editable search location ---
  const [searchLocation, setSearchLocation] = useState('Bangalore'); 
  // ------------------------------------------

  // --- Step 1: Upload and simplify report ---
  const handleReportUpload = async (file) => {
    if (!file) return;

    setSimplifiedReport(null); // Reset previous data
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/simplify", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to simplify report.');
      }
      
      const data = await response.json();
      
      // We only save the structured data for hospital context
      if (data.simplified_data) {
        setSimplifiedReport(data.simplified_data); 
        // Use custom modal or message instead of alert
        console.log("Report successfully simplified and stored in state.");
        // Optional: Show simplified data introduction for confirmation
        alert(`Report simplified! Main introduction: ${data.simplified_data.introduction.substring(0, 50)}...`); 
      } else {
        alert("Report simplification failed to produce structured data. Cannot use for personalized search.");
      }
      
    } catch (err) {
      console.error(err);
      alert(`Error during simplification: ${err.message}`);
    }
  };

  // --- Step 2: Locate hospitals ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Check if simplifiedReport exists before running personalized search
    if (!simplifiedReport) {
      setError("Please successfully upload and simplify a medical report first to enable personalized recommendations.");
      return;
    }
    
    setLoading(true);
    setResults([]);
    setError(null);

    const formData = new FormData();
    // Use the keyword and location in the combined search query
    formData.append('keyword', `Specialized hospitals for my condition in ${searchLocation}`); 

    // Attach simplified report JSON
    const blob = new Blob([JSON.stringify(simplifiedReport)], { type: "application/json" });
    formData.append("report_json", blob, "simplified_report.json");

    try {
      const response = await fetch('http://localhost:8000/locate_hospital', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Server search failed.');
      }

      const data = await response.json();
      // Ensure we get exactly the top 3 recommended hospitals
      setResults(data.hospitals.slice(0, 3) || []); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <h2>Locate Specialist Hospital </h2>
        <p>
          Upload your medical report and we'll recommend the **top 3 specialist hospitals** in your area based on your health needs.
        </p>

        {/* Upload button for medical report */}
        <div style={{ padding: '1rem', border: '1px dashed #007aff', borderRadius: '8px', marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            1. Upload & Analyze Report (First)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => handleReportUpload(e.target.files[0])}
            style={{ marginBottom: '0.5rem' }}
          />
          {simplifiedReport 
            ? <p style={{ color: 'green', fontSize: '0.9rem' }}>Report context loaded. Ready for search. ✅</p>
            : <p style={{ color: 'orange', fontSize: '0.9rem' }}>Upload report to enable personalized search.</p>
          }
        </div>
      </div>

      {/* Column 2: Form & Results */}
      <div className="feature-form-area">
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="location">2. Search Location (City):</label>
            <input
              type="text"
              id="location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="e.g., Bangalore, Delhi"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !simplifiedReport} 
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Finding Best Matches...' : '3. Find Personalized Hospitals'}
          </button>
        </form>

        {/* Loading & Error */}
        {loading && <p style={{marginTop:'1rem'}}>Searching for locations... Please wait.</p>}
        {error && <p style={{marginTop:'1rem', color:'red'}}>Error: {error}</p>}

        {/* Results Display */}
        {!loading && !error && results.length > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem 1rem' }}>
            <h3>Top {results.length} Recommended Specialists in {searchLocation}</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {results.map((hospital, idx) => (
                <motion.li
                  key={idx}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: idx * 0.05 }}
                  style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <a href={hospital.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'inherit' }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#007aff' }}>{idx + 1}. {hospital.name}</strong>
                    {hospital.address && <span style={{ fontSize:'0.9rem', color:'#888', display:'block', marginTop:'0.2rem' }}>{hospital.address}</span>}
                  </a>
                  {/* --- NEW: Display the reason for recommendation --- */}
                  {hospital.note && (
                    <p style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.9rem', 
                      padding: '0.5rem',
                      background: '#f0faff',
                      borderLeft: '4px solid #007aff',
                      borderRadius: '4px',
                      color: '#333'
                    }}>
                      **Why this hospital:** {hospital.note}
                    </p>
                  )}
                  {/* --------------------------------------------------- */}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && results.length === 0 && simplifiedReport && <p style={{ marginTop:'1.5rem' }}>No suitable hospitals found in {searchLocation} matching your report's needs.</p>}
      </div>
    </motion.div>
  );
}

export default LocateHospital;
