from flask import Flask, render_template, request, jsonify, Response
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize NVIDIA client
nvidia_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")  # Store your API key in .env file
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    model = data.get('model', 'llama-3.3-nemotron-super-49b-v1')
    messages = data.get('messages', [])
    
    # Filter out system messages from the conversation history
    filtered_messages = [msg for msg in messages if msg['role'] != 'system']
    
    # Validate model and set appropriate parameters
    if model == 'deepseek-r1-distill-llama-8b':
        model_name = 'deepseek-ai/deepseek-r1-distill-llama-8b'
        params = {
            'temperature': 0.6,
            'top_p': 0.7,
            'max_tokens': 4096,
            'stream': True
        }
    else:  # Default to Llama 3
        model_name = 'nvidia/llama-3.3-nemotron-super-49b-v1'
        params = {
            'temperature': 0.6,
            'top_p': 0.95,
            'max_tokens': 4096,
            'frequency_penalty': 0,
            'presence_penalty': 0,
            'stream': True
        }
    
    try:
        def generate():
            completion = nvidia_client.chat.completions.create(
                model=model_name,
                messages=filtered_messages,  # Use filtered messages
                **params
            )
            
            for chunk in completion:
                if chunk.choices[0].delta.content is not None:
                    # Skip system messages in the response
                    if chunk.choices[0].delta.role != 'system':
                        yield chunk.choices[0].delta.content
        
        return Response(generate(), mimetype='text/plain')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
if __name__ == '__main__':
    app.run(debug=True)