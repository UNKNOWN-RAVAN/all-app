const express = require('express');
const router = express.Router();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY;

// Available models
const MODELS = {
  openrouter: [
    { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B (Best Hindi)' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Multilingual)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (Coding)' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 (Reasoning)' }
  ],
  sambanova: [
    { id: 'DeepSeek-V3.1-cb', name: 'DeepSeek V3.1 (Fast & Cheap)' },
    { id: 'DeepSeek-V3.1', name: 'DeepSeek V3.1' },
    { id: 'Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B' },
    { id: 'Qwen3-235B', name: 'Qwen3 235B' }
  ]
};

// Get available models
router.get('/models', (req, res) => {
  res.json({ success: true, models: MODELS });
});

// Chat completion
router.post('/chat', async (req, res) => {
  const { model, messages, provider = 'openrouter' } = req.body;
  
  try {
    let response;
    
    if (provider === 'openrouter') {
      response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://careerwill-hub.vercel.app',
          'X-Title': 'CareerWill Hub'
        }
      });
      
      res.json({
        success: true,
        response: response.data.choices[0].message.content,
        provider: 'openrouter'
      });
      
    } else if (provider === 'sambanova') {
      response = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      res.json({
        success: true,
        response: response.data.choices[0].message.content,
        provider: 'sambanova'
      });
    }
    
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

// AI commands for app control
router.post('/command', async (req, res) => {
  const { command, userData } = req.body;
  
  try {
    const systemPrompt = `You are an AI assistant for CareerWill Hub app. You can help users with:
    - Opening videos/pdfs from history
    - Searching content
    - Managing favorites
    - Getting study recommendations
    - Answering questions about courses
    
    User has: ${JSON.stringify(userData)}
    
    Respond with a JSON object containing:
    {
      "action": "open_video|search|favorite|recommend|answer",
      "data": {...},
      "message": "response to user"
    }`;
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'qwen/qwen3-next-80b-a3b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = JSON.parse(response.data.choices[0].message.content);
    res.json({ success: true, ...result });
    
  } catch (error) {
    console.error('Command error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Last video command
router.post('/last-video', async (req, res) => {
  const { history } = req.body;
  
  if (!history || history.length === 0) {
    return res.json({ 
      success: true, 
      action: 'answer',
      message: 'No watch history found. Please watch some videos first.'
    });
  }
  
  const lastVideo = history[0];
  res.json({
    success: true,
    action: 'open_video',
    data: lastVideo,
    message: `Opening last video: ${lastVideo.title}`
  });
});

module.exports = router;