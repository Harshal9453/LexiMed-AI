import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Simple animation variant for list items
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

function NutritionalScan() {
  // State for both files
  const [reportFile, setReportFile] = useState(null);
  const [foodImage, setFoodImage] = useState(null);
  
  // State for results
  const [simplifiedReport, setSimplifiedReport] = useState(null); // Step 2 result
  const [foodAnalysis, setFoodAnalysis] = useState(null);       // Step 3 result
  const [comparisonResult, setComparisonResult] = useState(null); // Step 4 result
  
  // UI states
  const [lang, setLang] = useState('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if all inputs are ready
  const isReady = reportFile && foodImage;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) {
      setError('Please select both a medical report and a meal image.');
      return;
    }

    setLoading(true);
    setSimplifiedReport(null);
    setFoodAnalysis(null);
    setComparisonResult(null);
    setError(null);

    // Remove local storage logic as we are now doing a single, stateless request
    localStorage.removeItem('simplifiedReportJson'); 

    const formData = new FormData();
    formData.append('report_file', reportFile);
    formData.append('food_image', foodImage);
    formData.append('lang', lang);

    try {
      // Call the new monolithic endpoint
      const response = await fetch('http://localhost:8000/nutritional_scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis failed on the server.');
      }

      const data = await response.json();
      
      // Store the combined results
      setSimplifiedReport(data.simplified_report);
      setFoodAnalysis(data.food_analysis);
      setComparisonResult(data.comparison);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verdictColor = (status) => {
    if (!status) return '#555';
    const v = status.toLowerCase();
    if (v.includes('good') || v.includes('match') || v.includes('balanced')) return '#28a745'; // Green
    if (v.includes('cautionary') || v.includes('warning') || v.includes('risk')) return '#ffc107'; // Yellow/Orange
    if (v.includes('major') || v.includes('poor')) return '#dc3545'; // Red
    return '#007aff';
  };
  
  const statusVerdict = comparisonResult?.status || 'N/A';
  const hasResults = simplifiedReport && foodAnalysis && comparisonResult;

  return (
    <motion.div
      className="feature-container"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="feature-text">
        <h2>Personalized Nutritional Scan </h2>
        <p>
          Upload your medical report and a meal photo for a combined, personalized nutritional critique.
        </p>
      </div>

      <div className="feature-form-area">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label htmlFor="lang">Language for Summary:</label>
            <input
              type="text"
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              placeholder="e.g., English, Spanish"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="report-file">1. Upload Medical Report (PDF/Image):</label>
            <input
              type="file"
              id="report-file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setReportFile(e.target.files[0])}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="food-image">2. Upload Meal Photo (JPG/PNG):</label>
            <input
              type="file"
              id="food-image"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => setFoodImage(e.target.files[0])}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !isReady}
          >
            {loading ? 'Analyzing All Data...' : 'Analyze Report & Meal'}
          </button>
        </form>

        {loading && <p className="loading" style={{marginTop: '1rem'}}>Scanning and synthesizing data...</p>}
        {error && <p className="error">{error}</p>}
        
        {/* --- Results Display --- */}
        {hasResults && (
          <div className="assessment-display result-box" style={{ marginTop: '2rem', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Combined Health & Nutritional Assessment</h3> 

            {/* Personalized Verdict / Comparison */}
            <div style={{ border: `2px solid ${verdictColor(statusVerdict)}`, padding: '1.5rem', borderRadius: '8px', background: '#fff', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: verdictColor(statusVerdict) }}>
                  OVERALL STATUS: {statusVerdict}
              </h4>
              
              <p style={{ margin: '0.5rem 0', color: '#333' }}> 
                  <strong>Summary:</strong> {comparisonResult.summary}
              </p>
              
              <h5 style={{ borderBottom: '1px dashed #eee', paddingBottom: '0.5rem', marginTop: '1.5rem', color: '#333' }}>Recommendation</h5>
              <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#333' }}>
                  {comparisonResult.recommendation}
              </p>
              
              {/* Report Context Display (Simplified Version) */}
              <h5 style={{ borderBottom: '1px dashed #eee', paddingBottom: '0.5rem', marginTop: '1.5rem', color: '#333' }}>Report Context (Simplified)</h5>
              <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#555' }}>
                  {simplifiedReport.health_concerns || 'N/A'}
              </p>
              <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#555' }}>
                  **Dietary Needs:** {simplifiedReport.nutritional_needs || 'N/A'}
              </p>
            </div>
            
            {/* General Macro Summary block text made dark */}
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '5px', color: '#333' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Estimated Nutritional Content:</h4>
                <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                    Calories: <strong>{foodAnalysis.total_estimated_macros?.calories || 'N/A'}</strong> | 
                    Protein: <strong>{foodAnalysis.total_estimated_macros?.protein || 'N/A'}</strong> | 
                    Carbs: <strong>{foodAnalysis.total_estimated_macros?.carbs || 'N/A'}</strong> |
                    Fats: <strong>{foodAnalysis.total_estimated_macros?.fats || 'N/A'}</strong> 
                </p>
                <h4 style={{ margin: '1rem 0 0.5rem 0' }}>Identified Items:</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {foodAnalysis.items?.map((item, i) => (
                        <li key={i} style={{ fontSize: '0.9rem' }}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '1.5rem' }}>
                Disclaimer: This is general dietary feedback based on AI analysis and not a substitute for professional medical nutrition therapy.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default NutritionalScan;