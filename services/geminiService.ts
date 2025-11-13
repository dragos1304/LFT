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

export const geminiService = {
  // Processes a source file (PDF, video, etc.) using the Gemini API
  processSourceMaterial: async (source: File | string): Promise<any> => {
    console.log("Gemini Service: Processing source material with real API...", source);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let contentParts: any[] = [];
    // FIX: Updated prompt to be more clear about expecting a JSON object.
    const prompt = `Process the following study material and generate a comprehensive study set as a JSON object following the provided schema. The material is a file that has been provided. Extract its content and generate the study set.`;

    if (typeof source === 'string') { // YouTube URL
        // NOTE: Client-side processing of YouTube URLs is not feasible due to CORS and technical limitations.
        // A backend service (like a Firebase Function) would be required to download and transcribe the video.
        // For this demo, we'll include the URL in the prompt, which is not ideal but shows the logic.
        contentParts.push({ text: `${prompt} The source is a video at the URL: ${source}` });
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
      // FIX: The `contents` field should be an object with a `parts` array for a single-turn request, not an array of objects.
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
                       // Schema can be nested further for deeper outlines
                       children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { topic: {type: Type.STRING }, details: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
                     }
                   }
                 }
              }
            },
            keywords: { 
              type: Type.ARRAY, 
              description: "A list of 4-5 most important keywords or technical terms.",
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  text: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  source_sentence: { type: Type.STRING, description: "The exact sentence from the source where the keyword appeared." },
                  ai_importance_score: { type: Type.NUMBER, description: "A score from 1-5 on the keyword's importance." }
                } 
              } 
            },
            flashcards: { 
              type: Type.ARRAY, 
              description: "A list of 3-4 question/answer flashcards for spaced repetition.",
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  front_text: { type: Type.STRING, description: "The question side of the flashcard." },
                  back_text: { type: Type.STRING, description: "The answer side of the flashcard." }
                } 
              } 
            },
            practice_questions: { 
              type: Type.ARRAY,
              description: "A list of 4 practice questions covering different levels of Bloom's Taxonomy.",
              items: { 
                type: Type.OBJECT, 
                properties: {
                  bloom_level: { type: Type.STRING, description: "e.g., 'Remember', 'Understand', 'Apply', 'Analyze'" },
                  question_type: { type: Type.STRING, description: "'mcq' or 'open_ended'" },
                  question_text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 options for MCQ questions. Null for open_ended." },
                  correct_answer: { type: Type.STRING, description: "The correct option for MCQ, or a model answer for open_ended." },
                  ai_grading_rubric: { type: Type.STRING, description: "A detailed rubric for how to grade an open-ended answer." }
                } 
              } 
            }
          }
        }
      }
    });
    
    // The Gemini API with JSON mode often wraps the JSON in markdown backticks. Clean it up.
    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
    }

    const studySetData = JSON.parse(jsonText);
    return studySetData;
  },

  // Grades an open-ended question using a real API call
  gradeOpenEndedQuestion: async (questionText: string, aiGradingRubric: string, userAnswer: string): Promise<{ is_correct: boolean, feedback_text: string }> => {
    console.log("Gemini Service: Grading answer with real API...", { questionText, aiGradingRubric, userAnswer });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Please act as an AI grader. You will be given a question, a grading rubric, and a user's answer.
      Evaluate the user's answer based *strictly* on the provided rubric.
      Return your evaluation in the specified JSON format.

      **Question:**
      ${questionText}

      **Grading Rubric:**
      ${aiGradingRubric}

      **User's Answer:**
      ${userAnswer}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // FIX: For a simple text prompt, it's cleaner to pass the string directly to `contents`.
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

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    return JSON.parse(jsonText);
  },
};