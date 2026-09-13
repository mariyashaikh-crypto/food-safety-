import requests
import json


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:3b"


def generate_ai_answer(question: str, retrieved_context: dict):

    context_text = json.dumps(
        retrieved_context,
        indent=2,
        default=str
    )

    prompt = f"""
You are the Food Safety AI Assistant.

You MUST answer using ONLY the retrieved system data below.

STRICT RULES:

- Treat the retrieved data as the source of truth.
- NEVER invent or change a risk score or risk level.
- NEVER call an establishment HIGH risk if its current_risk_level
  is LOW or MEDIUM.
- NEVER say a violation is unresolved if its status is Resolved.
- NEVER say corrective action is pending if its status is Accepted.
- NEVER say a reinspection failed if its result is Fixed.
- If the user's question contains an incorrect assumption,
  explicitly correct it.
- The ML prediction is a prediction, NOT the official current risk.
- Do not make your own official risk calculation.
- For priority questions, use the provided priority ranking.
- Keep the answer concise and useful for an inspector.

USER QUESTION:
{question}

RETRIEVED SYSTEM DATA:
{context_text}

IMPORTANT:
First identify the exact facts relevant to the question.
Then answer using those facts.
Do not contradict them.

ANSWER:
"""

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.0
                }
            },
            timeout=120
        )

        response.raise_for_status()

        result = response.json()

        answer = result.get(
            "response",
            ""
        ).strip()

        return {
            "success": True,
            "question": question,
            "answer": answer,
            "model": OLLAMA_MODEL,
            "grounded": True
        }

    except requests.exceptions.ConnectionError:

        return {
            "success": False,
            "question": question,
            "answer": "Local AI service is not running. Please start Ollama.",
            "model": OLLAMA_MODEL,
            "grounded": False
        }

    except requests.exceptions.Timeout:

        return {
            "success": False,
            "question": question,
            "answer": "The local AI model took too long to respond.",
            "model": OLLAMA_MODEL,
            "grounded": False
        }

    except Exception as error:

        return {
            "success": False,
            "question": question,
            "answer": f"AI generation failed: {str(error)}",
            "model": OLLAMA_MODEL,
            "grounded": False
        }