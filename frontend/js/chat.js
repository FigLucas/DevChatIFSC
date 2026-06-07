// frontend/js/chat.js

const API_BASE = 'http://localhost:8000';  // ajuste conforme o ambiente

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

const messagesDiv = document.getElementById('messages');
const questionInput = document.getElementById('question');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');

// Função para enviar pergunta
async function sendQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;

    // Mostra pergunta do usuário
    appendMessage('user', question);
    questionInput.value = '';

    try {
        const response = await fetch(`${API_BASE}/chat-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question: question })
        });

        if (response.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Erro na requisição');
        }

        const data = await response.json();
        appendMessage('bot', data.answer);
    } catch (err) {
        appendMessage('bot', 'Erro ao processar a pergunta.');
    }
}

// Adiciona mensagem na tela
function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.textContent = text;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Eventos
sendBtn.addEventListener('click', sendQuestion);
questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendQuestion();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});