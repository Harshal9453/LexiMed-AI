The project, LexiMed API, is a full-stack medical AI application designed to act as an intelligent assistant, primarily for patients, to demystify complex medical data and provide actionable health-related information.

It uses a FastAPI (Python) backend and a React.js frontend styled with a clean, modern, Apple-inspired aesthetic, leveraging the multimodal and reasoning capabilities of the Google Gemini API.

Key Features and Functionality
The application includes four core features, all built using a robust structure to handle file uploads and return structured data:

Simplify & Discuss Reports (Lab Results/PDFs):

Function: Users upload dense lab reports or medical PDFs. The AI extracts the content, structures it into easily readable sections (Test Name, Your Result, Normal Range, Interpretation), and translates complex medical jargon into plain English.

Value: It includes a Q&A chat feature that allows users to ask follow-up questions directly about the content of their uploaded report.

Advanced: It analyzes potential areas of concern derived from the results (e.g., "Kidney," "Endocrinology") and offers suggestions for specialists.

Locate Hospital (Real-Time Search):

Function: This dedicated feature allows users to search for hospitals in a specific area (hardcoded to Bangalore for now) based on general keywords or the suggested specialties derived from the simplification process.

Advanced: This uses the Gemini API's integrated Google Search Grounding tool to retrieve real-time hospital names and location links without requiring a separate mapping service API key.

Find & Understand Medications (Prescriptions):

Function: Users upload a photo of a handwritten prescription. The AI transcribes the handwriting, isolates the medication names, provides a brief patient-friendly explanation for each drug, and generates direct links to search for the medication online.

Analyze Meal (Nutrition-Scan):

Function: Users upload a photo of a meal. The multimodal AI identifies the food items, estimates portion sizes and total macronutrients (calories, protein, carbs, sodium), allowing for easy dietary tracking and logging.

#Technology Stack
Backend (API): FastAPI (Python) for rapid, asynchronous API development.

AI Engine: Google Gemini API (gemini-2.5-pro for vision/multimodality, gemini-2.5-flash for general text/chat).

File Processing: PyMuPDF (fitz) and PyTesseract (OCR) for converting files (PDFs, images) into readable text.

Frontend (UI): React.js for a dynamic single-page application.

Styling/UX: Custom CSS implementing a Glassmorphism and Apple Design aesthetic (spacious, minimalist layout, bold typography).

Animation: Framer Motion for polished, subtle UI animations (fade-ins, sliding effects).
