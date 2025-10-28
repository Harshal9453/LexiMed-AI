import React, { useState } from 'react'; 
import './App.css';
import SimplifyReport from './components/SimplifyReport';
import ReadPrescription from './components/ReadPrescription';
import ExplainImage from './components/ExplainImage';
import NutritionScan from './components/NutritionScan';
import LocateHospital from './components/LocateHospital';
import { motion } from 'framer-motion';

const features = [
  { id: 'simplify', Component: SimplifyReport, theme: 'light' },
  { id: 'prescription', Component: ReadPrescription, theme: 'dark' },
  
  { id: 'nutrition', Component: NutritionScan, theme: 'light' },
  { id: 'hospital', Component: LocateHospital, theme: 'dark' },
];

function App() {
  // State to hold the full extracted text from the simplified report
  const [reportContext, setReportContext] = useState(null); 

  // Callback function to save the report context
  const handleReportSimplified = (text) => {
    setReportContext(text);
    console.log("Report context successfully saved to App state.");
  };
  
  const isDoctorLoggedIn = false; // Always patient view for this exercise
  const featuresToShow = isDoctorLoggedIn ? [] : features;
  const currentTheme = isDoctorLoggedIn ? 'doctor' : 'patient';

  return (
    <div className={`Apple-App ${currentTheme}-view`}>
      <motion.header
        className="App-header"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="header-content">
          <h1>LexiMed AI {isDoctorLoggedIn && '| Doctor Portal'}</h1>
        </div>
      </motion.header>

      <main className="App-main">
        {featuresToShow.map(({ id, Component, theme }, index) => {
          let renderedComponent;

          if (id === 'simplify') {
            // 1. Pass the callback function to SimplifyReport
            renderedComponent = <Component key={id} onSimplifySuccess={handleReportSimplified} />;
          } else if (id === 'nutrition') {
            // 2. Pass the saved context to NutritionScan
            renderedComponent = <Component key={id} originalReportText={reportContext} />;
          } else {
            renderedComponent = <Component key={id} />;
          }

          return (
            <section key={`feature-${index}`} className={`feature-section ${theme}`}>
              {renderedComponent}
            </section>
          );
        })}
      </main>

      <footer className="App-footer">
        <p>
          Disclaimer: This tool is for informational purposes only and is not a
          substitute for professional medical advice, diagnosis, or treatment.
        </p>
      </footer>
    </div>
  );
}

export default App;