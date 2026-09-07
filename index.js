require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = (process.env.VERIFY_TOKEN || 'minhasenhasecreta123').trim();
const PAGE_ACCESS_TOKEN = (process.env.PAGE_ACCESS_TOKEN || '').trim();

// Variável global para controlar se o bot está ligado ou desligado
// (Forçando um novo deploy no Vercel)
let isBotOn = true;

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

app.post('/webhook', async (req, res) => {
    let body = req.body;
    console.log('--- NOVO EVENTO RECEBIDO DO FACEBOOK ---');
    console.log(JSON.stringify(body, null, 2));

    if (body.object === 'page') {
        for (let entry of body.entry) {
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;

            if (webhook_event.message) {
                await handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                await handlePostback(sender_psid, webhook_event.postback);
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Busca o nome do usuário no Facebook
async function getUserProfile(sender_psid) {
    if (sender_psid === 'SIMULATOR') {
        return { first_name: 'Visitante' };
    }
    
    try {
        const response = await axios.get(`https://graph.facebook.com/${sender_psid}?fields=first_name&access_token=${PAGE_ACCESS_TOKEN}`);
        return response.data;
    } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        return { first_name: 'Cliente' }; // Nome padrão em caso de erro
    }
}

// Pausa para simular tempo de digitação
const delay = ms => new Promise(res => setTimeout(res, ms));

async function handleMessage(sender_psid, received_message) {
    // 1. COMANDOS SECRETOS DE LIGAR/DESLIGAR
    if (received_message.text) {
        const text = received_message.text.trim().toLowerCase();
        
        if (text === '/desligar') {
            isBotOn = false;
            let msg = { "text": "🛑 Bot desativado. Você agora está no controle manual." };
            if (sender_psid === 'SIMULATOR') return msg;
            return callSendAPI(sender_psid, msg);
        }
        
        if (text === '/ligar') {
            isBotOn = true;
            let msg = { "text": "✅ Bot ativado (v2). Respostas automáticas ligadas." };
            if (sender_psid === 'SIMULATOR') return msg;
            return callSendAPI(sender_psid, msg);
        }
    }

    // 2. SE O BOT ESTIVER DESLIGADO, ELE NÃO FAZ NADA
    if (!isBotOn) {
        return; 
    }

    // 3. FLUXO NORMAL DE ATENDIMENTO
    if (received_message.text) {
        let text = received_message.text.trim().toLowerCase();
        let response;

        if (text === '1' || text.includes('foto')) {
            if (sender_psid !== 'SIMULATOR') {
                await callSendAPI(sender_psid, { "sender_action": "typing_on" });
                await delay(1500); 
            }
            response = { "text": "Ótima escolha! 📸 \nMinhas fotos super sexys para alegrar o seu dia custam apenas 50 Meticais.\n\nPara receber agora, faça o pagamento para a conta abaixo:\n📱 Número: 871300743\n👤 Nome: Helena\n\nAssim que pagar, mande a foto do comprovante aqui nesta conversa e eu te envio as fotos na hora! 🔥" };
        } else if (text === '2' || text.includes('4 video') || text.includes('4 vídeo')) {
            if (sender_psid !== 'SIMULATOR') {
                await callSendAPI(sender_psid, { "sender_action": "typing_on" });
                await delay(1500); 
            }
            response = { "text": "Excelente! 🎥 \nOs 4 vídeos quentes de 3 a 5 minutos custam apenas 45 Meticais.\n\nPara receber agora, faça o pagamento para a conta abaixo:\n📱 Número: 871300743\n👤 Nome: Helena\n\nAssim que pagar, mande a foto do comprovante aqui nesta conversa e eu te envio os vídeos na hora! 🔥" };
        } else if (text === '3' || text.includes('5 video') || text.includes('5 vídeo') || (text.includes('video') && !text.includes('4'))) {
            if (sender_psid !== 'SIMULATOR') {
                await callSendAPI(sender_psid, { "sender_action": "typing_on" });
                await delay(1500); 
            }
            response = { "text": "Perfeito! 🎥 \nO pacote premium com 5 vídeos de 5 a 7 minutos custa 90 Meticais.\n\nPara receber agora, faça o pagamento para a conta abaixo:\n📱 Número: 871300743\n👤 Nome: Helena\n\nAssim que pagar, mande a foto do comprovante aqui nesta conversa e eu te envio os vídeos na hora! 🔥" };
        } else {
            // Qualquer outra mensagem, envia o menu principal com um atraso maior (6 segundos) para parecer mais natural
            if (sender_psid !== 'SIMULATOR') {
                await callSendAPI(sender_psid, { "sender_action": "typing_on" });
                await delay(6000); 
            }
            const user = await getUserProfile(sender_psid);
            response = {
                "text": `Oi ${user.first_name}, tenho conteúdo VIP +18 exclusivo para você 🔥\n\n👇 Responda esta mensagem digitando apenas o NÚMERO 1, 2 ou 3 e aperte Enviar para escolher seu pacote:\n\n1 👉 Minhas fotos super sexys para alegrar o seu dia (50 Meticais)\n2 👉 4 Vídeos de 3 a 5 minutos (45 Meticais)\n3 👉 5 Vídeos de 5 a 7 minutos (90 Meticais)\n\n⚠️ Aviso: Eu só respondo quem realmente quer comprar. Não estou aqui para conversinha, o papo é reto. 😈`
            };
        }

        if (sender_psid === 'SIMULATOR') return response;
        await callSendAPI(sender_psid, response);
    }
}

async function handlePostback(sender_psid, received_postback) {
    if (!isBotOn) return; // Se o bot estiver desligado, ignora botões também

    let response;
    let payload = received_postback.payload;

    if (sender_psid !== 'SIMULATOR') {
        await callSendAPI(sender_psid, { "sender_action": "typing_on" });
        await delay(1000);
    }

    if (payload === 'PACOTE_FOTOS') {
        response = { "text": "Ótima escolha! 📸 O pacote com 5 fotos exclusivas custa R$ X. Para ter acesso agora, basta fazer o pagamento via PIX (Chave: seu@email.com). Mande o comprovante aqui!" };
    } else if (payload === 'PACOTE_VIDEOS') {
        response = { "text": "Excelente! 🎥 O pacote de vídeos exclusivos custa R$ Y. Para ter acesso, basta fazer o PIX (Chave: seu@email.com). Mande o comprovante aqui!" };
    }

    if (sender_psid === 'SIMULATOR') return response;
    await callSendAPI(sender_psid, response);
}

// ==========================================
// ROTA DE SIMULAÇÃO (PARA TESTAR O HTML LOCAL)
// ==========================================
app.post('/api/simulate', async (req, res) => {
    let data = req.body;
    let response;

    // Pausa artificial para simular a rede
    await delay(1000);
    
    if (data.type === 'message') {
        response = await handleMessage('SIMULATOR', { text: data.text });
    } else if (data.type === 'postback') {
        response = await handlePostback('SIMULATOR', { payload: data.payload });
    }
    
    res.json(response || {});
});

async function callSendAPI(sender_psid, message) {
    let request_body = {
        "recipient": {
            "id": sender_psid
        }
    };
    
    // Suporta enviar mensagem ou action (como typing_on)
    if (message.sender_action) {
        request_body.sender_action = message.sender_action;
    } else {
        request_body.message = message;
    }

    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages`, request_body, {
            params: { "access_token": PAGE_ACCESS_TOKEN }
        });
    } catch (err) {
        console.error('Erro ao enviar mensagem para o Facebook:', err.response ? err.response.data : err.message);
    }
}

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} 🚀`);
});

module.exports = app;
