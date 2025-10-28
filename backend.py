import uvicorn
import google.generativeai as genai
import pytesseract
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import os
import json
from urllib.parse import quote_plus
from typing import Optional

# --- Configuration ---
app = FastAPI(title="LexiMed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------- GEMINI API SETUP (FIXED TO FLASH) ---------------------
try:
    # NOTE: Replace with actual key management in production!
    GOOGLE_API_KEY = 'AIzaSyAko9nhqNpuoD2zI8oK4QGPFOUKkD7S93k'
    if 'YOUR_GEMINI_API_KEY' in GOOGLE_API_KEY or not GOOGLE_API_KEY:
        raise ValueError("Please replace 'YOUR_GEMINI_API_KEY' with your actual Gemini API key.")
    genai.configure(api_key=GOOGLE_API_KEY)

    safety_settings_mild = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]
    
    # *** FIXED: Both models use gemini-2.5-flash for stability and quota resilience ***
    text_model = genai.GenerativeModel('gemini-2.5-flash', safety_settings=safety_settings_mild)
    vision_model = genai.GenerativeModel('gemini-2.5-flash', safety_settings=safety_settings_mild) 

except Exception as e:
    print(f"🛑 Error during initial server configuration: {e}")
    text_model = None
    vision_model = None

# --------------------- OCR HELPER ---------------------
try:
    # Using environment variable or default 'tesseract' path for portability
    pytesseract.pytesseract.tesseract_cmd = os.environ.get('TESSERACT_CMD', 'tesseract')
except Exception:
    print("Tesseract command path not explicitly set. Assuming Tesseract is in system PATH.")

def extract_text_from_file(file_content: bytes, file_type: str) -> str:
    """Extracts text from PDF or image files using PyMuPDF and Tesseract (Report Scan)."""
    text = ""
    try:
        if file_type == 'application/pdf':
            pdf_document = fitz.open(stream=file_content, filetype="pdf")
            for page in pdf_document:
                # Render page to image at 150 DPI for OCR
                pix = page.get_pixmap(dpi=150) 
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text += pytesseract.image_to_string(img) + "\n"
        elif file_type in ['image/png', 'image/jpeg']:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
        else:
            return None
    except Exception as e:
        print(f"Error processing file: {e}")
        return f"Error processing file: {e}"
    return text

# --------------------- ENDPOINT: NUTRITIONAL SCAN (UNIFIED) ---------------------
@app.post("/nutritional_scan")
async def nutritional_scan(
    report_file: UploadFile = File(...),
    food_image: UploadFile = File(...),
    lang: str = Form("English")
):
    """
    Performs OCR on the medical report, simplifies it, analyzes the food image, 
    and compares the food to the report's recommendations in one synchronous step.
    """
    if not text_model or not vision_model:
        raise HTTPException(status_code=500, detail="Gemini API models not configured.")

    # --- Step 1: Extract text from medical report (Tesseract + run_in_threadpool) ---
    report_content = await report_file.read()
    extracted_text = await run_in_threadpool(
        extract_text_from_file, 
        report_content, 
        report_file.content_type
    )
    if "Error processing file" in extracted_text or not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the medical report.")

    # --- Step 2: Simplify the medical report (AI: gemini-2.5-flash) ---
    prompt_report = f"""
    You are LexiMed, an expert AI assistant. Simplify this medical report for a patient in {lang}.
    Your primary goal is to extract the main health concerns and resulting nutritional needs.
    
    Return a VALID JSON object with the following keys:
    {{
      "health_concerns": "A concise summary of the primary health issues (e.g., High Blood Sugar, Low Iron).",
      "dietary_recommendations": "Specific dietary advice based on the report (e.g., Reduce Sodium intake, Increase Fiber).",
      "nutritional_needs": "Key nutrients that must be monitored or increased/decreased."
    }}
    
    Medical Text to Analyze:
    {extracted_text}
    """
    try:
        simplified_report_resp = text_model.generate_content(prompt_report)
        json_text_match = simplified_report_resp.text.strip()
        start = json_text_match.find('{')
        end = json_text_match.rfind('}') + 1
        simplified_report = json.loads(json_text_match[start:end])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simplify report or parse JSON: {e}")

    # --- Step 3: Analyze the food image (AI: gemini-2.5-flash - Vision Model) ---
    food_bytes = await food_image.read()
    image_part = {"mime_type": food_image.content_type, "data": food_bytes}
    prompt_food = f"""
    Analyze this meal photo. Identify the items and estimate the full nutritional profile (calories, carbs, protein, fats, fiber, sodium).
    Return as a JSON object with keys: 
    'items' (a list of all identified foods), 
    'total_estimated_macros' (key-value pairs of all estimated nutritional values).
    """
    try:
        food_resp = vision_model.generate_content([prompt_food, image_part]) 
        json_text_match = food_resp.text.strip()
        start = json_text_match.find('{')
        end = json_text_match.rfind('}') + 1
        food_data = json.loads(json_text_match[start:end])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze food image or parse JSON: {e}")

    # --- Step 4: Compare food vs recommendations (AI: gemini-2.5-flash) ---
    prompt_compare = f"""
    You are a nutritionist AI. Perform a comparison between the patient's nutritional needs and the actual meal.

    PATIENT HEALTH CONTEXT:
    {json.dumps(simplified_report)}

    ACTUAL MEAL NUTRITION:
    {json.dumps(food_data)}

    Provide a concise comparison. Highlight what is missing, excess, or balanced relative to the patient's needs.
    Output as JSON with keys: 'summary', 'recommendation', 'status'.
    - 'status' MUST be one of: 'Good Match', 'Cautionary Risk', 'Major Concern', 'Balanced'.

    """
    try:
        compare_resp = text_model.generate_content(prompt_compare)
        json_text_match = compare_resp.text.strip()
        start = json_text_match.find('{')
        end = json_text_match.rfind('}') + 1
        comparison_result = json.loads(json_text_match[start:end])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate comparison or parse JSON: {e}")

    # --- Step 5: Return Combined Result ---
    return {
        "simplified_report": simplified_report,
        "food_analysis": food_data,
        "comparison": comparison_result
    }

# --------------------- OTHER ENDPOINTS ---------------------

# Keeping /simplify for legacy/separate use 
@app.post("/simplify")
async def simplify_report(lang: str = Form("English"), file: UploadFile = File(...)):
    if not text_model:
        raise HTTPException(status_code=500, detail="Gemini API (text model) not configured.")

    file_content = await file.read()
    extracted_text = await run_in_threadpool(extract_text_from_file, file_content, file.content_type)

    if "Error processing file" in extracted_text:
        raise HTTPException(status_code=500, detail=extracted_text)
    if not extracted_text or len(extracted_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Could not extract significant text from the file.")

    prompt = f"""
    You are LexiMed, an expert AI assistant that explains complex medical reports to patients in {lang}.
    Analyze the provided medical text.

    Your task is to return a VALID JSON object containing the simplified explanation.
    The JSON object should have the following structure:
    {{
      "title": "Simplified Report Summary",
      "introduction": "A brief, friendly introductory sentence or two.",
      "sections": [
        {{
          "sectionTitle": "Name of the Test Panel",
          "sectionDescription": "Brief explanation.",
          "results": [
            {{
              "testName": "Name of the test",
              "yourResult": "Patient's result",
              "normalRange": "Normal range",
              "interpretation": "Simple explanation"
            }}
          ]
        }}
      ]
    }}

    Ensure all output is a single JSON object in {lang}.

    MEDICAL TEXT TO SIMPLIFY:
    {extracted_text}

    JSON OUTPUT:
    """
    try:
        response = text_model.generate_content(prompt)
        json_text_match = response.text.strip()
        start = json_text_match.find('{')
        end = json_text_match.rfind('}') + 1

        if start != -1 and end != -1:
            simplified_data = json.loads(json_text_match[start:end])
            return {"original_text": extracted_text, "simplified_data": simplified_data}
        else:
            return {"original_text": extracted_text, "simplified_report_raw": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate or parse simplified report: {e}")

# --------------------- ENDPOINT: READ PRESCRIPTION ---------------------
@app.post("/read_prescription")
async def read_prescription(file: UploadFile = File(...)):
    if not vision_model or not text_model:
        raise HTTPException(status_code=500, detail="Gemini API models not configured.")
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPG or PNG image.")

    image_bytes = await file.read()
    image_part = {"mime_type": file.content_type, "data": image_bytes}

    transcription_prompt = "You are an expert AI medical transcriptionist. Transcribe the handwritten prescription text exactly as you see it."
    try:
        transcription_response = vision_model.generate_content([transcription_prompt, image_part])
        transcription_text = transcription_response.text
        if not transcription_text.strip():
            return {"transcription": "", "medications": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    extraction_prompt = f"""
    Extract only the medication names from the following prescription:
    ---
    {transcription_text}
    ---
    Return as a JSON list.
    """
    medication_list = []
    try:
        extraction_response = text_model.generate_content(extraction_prompt)
        start = extraction_response.text.find('[')
        end = extraction_response.text.rfind(']') + 1
        if start != -1 and end != -1:
            medication_list = json.loads(extraction_response.text[start:end])
    except Exception as e:
        print(f"Error parsing medication JSON: {e}")

    medication_details = []
    for med_name in medication_list:
        explanation = "Could not retrieve explanation."
        try:
            explanation_prompt = f"""
            Provide a brief, patient-friendly explanation of what '{med_name}' is used for.
            """
            explanation_response = text_model.generate_content(explanation_prompt)
            explanation = explanation_response.text.strip() or explanation
        except:
            pass

        search_link = f"https://www.google.com/search?q={quote_plus('buy '+med_name+' online')}"
        medication_details.append({
            "name": med_name,
            "explanation": explanation,
            "link": search_link
        })

    return {"transcription": transcription_text, "medications": medication_details}

# --------------------- ENDPOINT: EXPLAIN IMAGE ---------------------

# --------------------- ENDPOINT: CHAT REPORT ---------------------
@app.post("/chat_report")
async def chat_report(original_text: str = Form(...), user_question: str = Form(...)):
    if not text_model:
        raise HTTPException(status_code=500, detail="Gemini API not configured.")

    prompt = f"""
    You are LexiMed. The patient's medical report text is below.
    Provide a clear, concise answer to the user's question.
    even if the question is about general medical answer it.

    REPORT:
    {original_text}

    USER QUESTION:
    {user_question}
    """
    try:
        response = text_model.generate_content(prompt)
        answer = response.text.strip()
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")

# --------------------- ENDPOINT: LOCATE HOSPITAL ---------------------
@app.post("/locate_hospital")
async def locate_hospital(keyword: str = Form(...), report_json: UploadFile = File(None)):
    """
    Accepts a keyword and an optional JSON file containing simplified report data.
    Returns a list of hospital suggestions.
    """
    patient_data = None
    if report_json:
        content = await report_json.read()
        try:
            patient_data = json.loads(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")

    # Here, implement your logic to find hospitals based on keyword and patient_data
    # For demo, returning a static list (you can expand with AI-assisted search)
    hospitals = [
        {"name": "Bangalore Multispeciality Hospital", "link": "https://www.google.com/maps?q=Bangalore+Hospital", "address": "MG Road, Bangalore"},
        {"name": "City Care Multispeciality", "link": "https://www.google.com/maps?q=City+Care+Hospital", "address": "Indiranagar, Bangalore"},
        {"name": "HealthPlus Clinic", "link": "https://www.google.com/maps?q=HealthPlus+Clinic", "address": "Koramangala, Bangalore"}
    ]

    # Example: use patient_data to prioritize hospitals if available
    if patient_data:
        # Example: if patient_data contains certain tests, reorder list or add notes
        hospitals[0]["note"] = "Recommended based on your blood test results"

    return {"hospitals": hospitals}

# --------------------- RUN SERVER ---------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)