import { GoogleGenAI, Type } from "@google/genai";
import { OutlineNode, BloomLevel, QuestionType } from '../types';

// Helper function to convert a File object to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // remove the "data:mime/type;base64," part
    reader.onerror = error => reject(error);
  });
};

// Helper to clean up the JSON response from Gemini
const cleanJsonString = (text: string): string => {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    return jsonText;
}

export const geminiService = {
  // Processes a source file (PDF, video, etc.) using the Gemini API
  processSourceMaterial: async (source: File | string): Promise<any> => {
    console.log("Gemini Service: Processing source material with real API...", source);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Process the following study material and generate a comprehensive study set as a JSON object following the provided schema. Analyze the content and extract the key information to populate all fields accurately.`;
    
    let contentParts: any[] = [];

    if (typeof source === 'string') { // YouTube URL
        // A backend would be needed for full YouTube processing.
        // For now, we pass the URL, asking the model to act based on it if possible.
        contentParts.push({ text: `${prompt} The source is a video at the URL: ${source}. If you cannot access the URL, please state that in the summary.` });
    } else { // File upload
        const base64Data = await fileToBase64(source);
        contentParts.push({
            inlineData: {
                mimeType: source.type,
                data: base64Data,
            },
        });
        contentParts.push({ text: prompt });
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A concise, descriptive title for the study set based on the material's content." },
            summary_text: { type: Type.STRING, description: "A detailed, paragraph-long summary of the key information in the material." },
            hierarchical_outline: { 
              type: Type.OBJECT,
              description: "A nested outline of the main topics and sub-topics.",
              properties: {
                 topic: { type: Type.STRING },
                 details: { type: Type.ARRAY, items: { type: Type.STRING } },
                 children: {
                   type: Type.ARRAY,
                   items: {
                     type: Type.OBJECT,
                     properties: {
                       topic: { type: Type.STRING },
                       details: { type: Type.ARRAY, items: { type: Type.STRING } },
                       children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { topic: {type: Type.STRING }, details: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
                     }
                   }
                 }
              }
            },
            keywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, definition: { type: Type.STRING }, source_sentence: { type: Type.STRING }, ai_importance_score: { type: Type.NUMBER } } } },
            flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front_text: { type: Type.STRING }, back_text: { type: Type.STRING } } } },
            practice_questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { bloom_level: { type: Type.STRING }, question_type: { type: Type.STRING }, question_text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correct_answer: { type: Type.STRING }, ai_grading_rubric: { type: Type.STRING } } } }
          }
        }
      }
    });
    
    const jsonText = cleanJsonString(response.text);
    return JSON.parse(jsonText);
  },

  gradeOpenEndedQuestion: async (questionText: string, aiGradingRubric: string, userAnswer: string): Promise<{ is_correct: boolean, feedback_text: string }> => {
    console.log("Gemini Service: Grading answer with real API...", { questionText, userAnswer });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Please act as an AI grader. Evaluate the user's answer based *strictly* on the provided rubric.
      Question: ${questionText}
      Grading Rubric: ${aiGradingRubric}
      User's Answer: ${userAnswer}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    is_correct: { type: Type.BOOLEAN },
                    feedback_text: { type: Type.STRING }
                }
            }
        }
    });

    const jsonText = cleanJsonString(response.text);
    return JSON.parse(jsonText);
  },
};