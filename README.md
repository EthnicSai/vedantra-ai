# Vedantra AI Chat Application

A modern chat interface integrated with NVIDIA's AI models through their API.

## Features

- Real-time chat with streaming responses
- Multiple model selection (Llama 3, DeepSeek R1)
- Dark/light theme toggle
- Message history persistence
- Responsive design for all devices
- Markdown-like formatting in messages

## Setup

1. Clone this repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file with your NVIDIA API key:
6. Run the application: `python app.py`
7. Open `http://localhost:5000` in your browser

## Configuration

You can modify the available models in `app.py` by updating the `valid_models` dictionary.

## Deployment

For production deployment, consider using:
- Gunicorn or uWSGI as a WSGI server
- Nginx as a reverse proxy
- Environment variables for configuration