import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Define itemVariants near the top of the component function
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

function ReadPrescription() {
  const [file, setFile] = useState(null);
  // State expects 'transcription' (used internally) and 'medications' array
  const [result, setResult] = useState({ transcription: '', medications: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image file.');
      return;
    }
    setLoading(true);
    setResult({ transcription: '', medications: [] }); // Reset state
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Ensure this port matches your running backend (e.g., 8000 or 8001)
      const response = await fetch('http://localhost:8000/read_prescription', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to get error details from the backend response
        let errorDetail = 'Something went wrong';
        try {
            const errData = await response.json();
            errorDetail = errData.detail || errorDetail;
        } catch (jsonError) {
            // If the response isn't JSON, use the status text
            errorDetail = response.statusText || errorDetail;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      // Ensure data has medications, provide fallback if not
      setResult(data && data.medications ? data : { transcription: data.transcription || '', medications: [] });

    } catch (err) {
      console.error("Fetch Error:", err); // Log the actual error to the console
      setError(err.message); // Set the error message for the UI
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
        <h2>Find Medications</h2>
        <p>
          Upload a prescription photo. We'll identify the medications and
          provide online search links.
        </p>
      </div>

      {/* Column 2: The Form & Results */}
      <div className="feature-form-area">
        {/* --- Form --- */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="file-rx">Upload Image:</label>
            <input
              type="file"
              id="file-rx"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                setFile(e.target.files ? e.target.files[0] : null);
                setError(null); // Clear previous errors when file changes
                setResult({ transcription: '', medications: [] }); // Clear previous results
              }}
            />
          </div>
          <button type="submit" disabled={loading || !file}>
            {loading ? 'Processing...' : 'Find Medications'}
          </button>
        </form>

        {/* --- Loading & Error Display --- */}
        {loading && (
          <p className="loading">Analyzing prescription... Please wait.</p>
        )}
        {/* Display error if there is one */}
        {error && <p className="error" style={{ marginTop: '1rem' }}>Error: {error}</p>}

        {/* --- Results --- */}
        {/* Only display if NOT loading, NO error, AND medications are found */}
        {!loading && !error && result.medications && result.medications.length > 0 && (
          <div className="result-box medication-details-box" style={{ marginTop: '1.5rem', padding: '1.5rem 1rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontWeight: 'bold' }}>Medications Found</h3>

            {/* SAFETY DISCLAIMER */}
            <p style={{
                color: '#D9534F', background: '#FDF2F2', border: '1px solid #F0CCCC',
                padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1.5rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <strong>Warning:</strong> AI identification may be incorrect.
              Always verify medications with your pharmacist or doctor.
            </p>

            {/* --- STRUCTURED Medication List --- */}
            {result.medications.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                custom={index}
                transition={{ delay: index * 0.1 }}
                style={{
                  marginBottom: '1.5rem',
                  paddingLeft: '1rem',
                  borderLeft: '4px solid #007aff', // Blue bar
                  position: 'relative'
                 }}
              >
                {/* Medication Name Heading */}
                <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    fontFamily: '-apple-system, sans-serif',
                    color: 'inherit'
                }}>
                  {item.name}
                </h4>

                {/* === START: UNCOMMENTED AND STYLED EXPLANATION === */}
                {item.explanation && (
                    <p style={{
                        margin: '0 0 0.75rem 0',
                        fontSize: '0.9rem',
                        color: '#ece5e59c', // Adjusted color for contrast
                        fontWeight: '400',
                        fontFamily: '-apple-system, sans-serif',
                        // Added styling to enforce max lines/height if needed, though usually the text length handles it
                    }}>
                       {item.explanation}
                    </p>
                )}
                {/* === END: UNCOMMENTED AND STYLED EXPLANATION === */}

                {/* Link */}
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                      fontSize: '0.9rem',
                      color: '#007aff',
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontFamily: '-apple-system, sans-serif',
                      display: 'inline-block',
                      marginTop: '0.25rem'
                  }}
                >
                  Search "{item.name}" online &rarr;
                </a>
              </motion.div> // Close motion.div
            ))}
            {/* --- END OF STRUCTURED Medication List --- */}
          </div>
        )}
        {/* Show message if NOT loading, NO error, transcription likely worked but no meds found */}
         {!loading && !error && result.transcription && (!result.medications || result.medications.length === 0) && (
             <div className="result-box" style={{ marginTop: '1.5rem' }}>
                 <p>Transcription completed, but no specific medications were identified by the AI.</p>
             </div>
         )}
      </div>
    </motion.div>
  );
}

export default ReadPrescription;
