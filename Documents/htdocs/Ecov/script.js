// Debug: Check if script is loaded
console.log('Script loaded successfully!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');

    const toggleChatBtn = document.getElementById('toggleChat');
    const closeChatBtn = document.getElementById('closeChat');
    const puureChat = document.getElementById('puureChat');
    const notificationDot = document.querySelector('.notification-dot');
    const chatInput = document.querySelector('.chat-input');
    const btnSend = document.querySelector('.btn-send');
    const chatBody = document.getElementById('chatBody');

    console.log('Toggle button found:', toggleChatBtn);
    console.log('Chat container found:', puureChat);
    console.log('Close button found:', closeChatBtn);

    let onboardingStarted = false;
    let isWaitingForConfirmation = false;
    let currentSelectedApp = null;

    const intentMapping = {
        'energy_reduction': {
            keywords: ['énergie', 'consommation', 'électricité', 'facture', 'kwh', 'courant', 'réduire énergie', 'facture énergétique'],
            app: 'energreen',
            weight: 1.0
        },
        'education_quiz': {
            keywords: ['quiz', 'défi', 'jouer', 'apprendre', 'connaissances', 'test', 'éducation', 'ludique'],
            app: 'ecoquizz',
            weight: 0.9
        },
        'location_mapping': {
            keywords: ['carte', 'points', 'ville', 'réseau vert', 'borne', 'trouver', 'lieu', 'localiser', 'où'],
            app: 'greenmap',
            weight: 0.95
        },
        'carbon_footprint': {
            keywords: ['empreinte carbone', 'calculer', 'co2', 'émissions', 'carbone', 'impact environnemental', 'bilan carbone'],
            app: 'energreen',
            weight: 0.95
        },
        'waste_management': {
            keywords: ['tri', 'déchets', 'recyclage', 'poubelle', 'ordures', 'compost', 'trier', 'valorisation'],
            app: 'cleanspot',
            weight: 0.95
        }
    };

    const apps = [
        {
            id: 'energreen',
            name: 'EnerGreen',
            description: 'Suivi et réduction de la consommation énergétique, calcul d\'empreinte carbone.',
            recommendation: 'Pour optimiser votre consommation énergétique, réduire vos dépenses ou calculer votre empreinte carbone, je vous recommande notre tableau de bord EnerGreen.',
            emoji: '⚡',
            features: ['Suivi en temps réel', 'Conseils de réduction', 'Comparaisons mensuelles', 'Calcul d\'empreinte carbone', 'Objectifs personnalisés']
        },
        {
            id: 'ecoquizz',
            name: 'EcoQuizz',
            description: 'Éducation écologique par le jeu et les défis.',
            recommendation: 'Si vous souhaitez approfondir vos connaissances de manière ludique, l\'application EcoQuizz est parfaite pour vous.',
            emoji: '🧠',
            features: ['Quiz interactifs', 'Défis écologiques', 'Badges de récompense', 'Communauté globale']
        },
        {
            id: 'greenmap',
            name: 'GreenMap',
            description: 'Cartographie des points d\'intérêt écologiques.',
            recommendation: 'Pour localiser les points d\'intérêt écologiques de votre ville, consultez notre application de cartographie GreenMap.',
            emoji: '🗺️',
            features: ['Géolocalisation', 'Points d\'intérêt', 'Itinéraires écologiques', 'Filtres personnalisés']
        },
        {
            id: 'cleanspot',
            name: 'CleanSpot',
            description: 'Gestion communautaire du tri des déchets.',
            recommendation: 'Besoin d\'aide pour mieux gérer vos déchets ? CleanSpot vous guidera dans le tri et la valorisation de vos rebuts.',
            emoji: '♻️',
            features: ['Guide de tri', 'Points de collecte', 'Défis communautaires', 'Impact mesurable']
        }
    ];

    function getAppDetails(appId) {
        const app = apps.find(a => a.id === appId);
        if (!app) return null;

        let details = `<div class="app-details">
            <h4>${app.emoji} ${app.name} - Détails complets</h4>
            <p><strong>Description :</strong> ${app.description}</p>
            <p><strong>Fonctionnalités principales :</strong></p>
            <ul>`;

        app.features.forEach(feature => {
            details += `<li>✓ ${feature}</li>`;
        });

        details += `</ul>
            <p><strong>Pourquoi choisir ${app.name} ?</strong></p>
            <p>${app.recommendation}</p>
            <p><em>Prêt à découvrir ${app.name} ? Téléchargez l'application dès maintenant !</em></p>
        </div>`;

        return details;
    }

    async function analyzeWithNLP(userText) {
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: userText,
                    parameters: {
                        candidate_labels: [
                            'réduction de consommation énergétique',
                            'éducation écologique par le jeu',
                            'cartographie des points écologiques',
                            'calcul de l\'empreinte carbone',
                            'gestion du tri des déchets',
                            "aide générale sur l'écologie",
                            'confirmation ou accord',
                            'négation ou refus',
                            'question sur les applications'
                        ]
                    }
                })
            });

            if (!response.ok) {
                throw new Error('API NLP indisponible');
            }

            const result = await response.json();
            const labelToIntent = {
                'réduction de consommation énergétique': 'energy_reduction',
                'éducation écologique par le jeu': 'education_quiz',
                'cartographie des points écologiques': 'location_mapping',
                'calcul de l\'empreinte carbone': 'carbon_footprint',
                'gestion du tri des déchets': 'waste_management',
                "aide générale sur l'écologie": 'general_help',
                'confirmation ou accord': 'confirmation',
                'négation ou refus': 'negation',
                'question sur les applications': 'app_question'
            };

            const topLabel = result.labels?.[0];
            const confidence = result.scores?.[0] || 0;
            const intent = labelToIntent[topLabel] || null;

            let selectedApp = null;
            if (intent && ['energy_reduction', 'education_quiz', 'location_mapping', 'carbon_footprint', 'waste_management'].includes(intent)) {
                const appId = intentMapping[intent]?.app;
                selectedApp = apps.find(a => a.id === appId) || null;
            }

            return {
                intent,
                confidence,
                selectedApp,
                rawResult: result,
                userText
            };
        } catch (error) {
            console.error('Erreur API NLP:', error);
            return fallbackLocalAnalysis(userText);
        }
    }

    function fallbackLocalAnalysis(userText) {
        const intentScores = {};
        const lowerText = userText.toLowerCase();

        Object.entries(intentMapping).forEach(([intent, config]) => {
            let score = 0;
            config.keywords.forEach(keyword => {
                if (lowerText.includes(keyword)) {
                    score += (keyword.split(' ').length > 1 ? 2 : 1);
                }
            });
            intentScores[intent] = score * config.weight;
        });

        const topIntent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0];
        const selectedApp = topIntent && topIntent[1] > 0 ? apps.find(a => a.id === intentMapping[topIntent[0]].app) : null;

        return {
            intent: topIntent ? topIntent[0] : null,
            confidence: topIntent ? topIntent[1] : 0,
            selectedApp,
            userText
        };
    }

    function generateContextualResponse(analysis) {
        const { selectedApp, intent, confidence } = analysis;

        if (intent === 'confirmation') {
            return {
                title: 'Parfait ! 🎉',
                message: 'Je suis ravi que cela vous convienne ! N\'hésitez pas à explorer l\'application ou à me poser d\'autres questions. 🌿',
                showConfirmation: false
            };
        }

        if (intent === 'negation') {
            return {
                title: 'Je comprends 🤔',
                message: 'Pas de problème ! Pouvez-vous me préciser ce dont vous avez besoin ? Je peux vous aider avec EnerGreen (énergie & empreinte carbone), EcoQuizz (apprentissage), GreenMap (cartographie) ou CleanSpot (déchets).',
                showConfirmation: false,
                showQuickActions: true
            };
        }

        if (intent === 'app_question') {
            return {
                title: 'Nos Applications EcoVerse 📱',
                message: `<div class="apps-overview">
                    <p>Voici nos 4 applications écologiques :</p>
                    <ul>
                        <li><strong>⚡ EnerGreen</strong> - Énergie & calcul d'empreinte carbone</li>
                        <li><strong>🧠 EcoQuizz</strong> - Apprentissage ludique</li>
                        <li><strong>🗺️ GreenMap</strong> - Points d'intérêt écologiques</li>
                        <li><strong>♻️ CleanSpot</strong> - Gestion des déchets</li>
                    </ul>
                    <p>Laquelle vous intéresse ?</p>
                </div>`,
                showConfirmation: false,
                showQuickActions: true
            };
        }

        if (intent === 'general_help') {
            return {
                title: 'Comment puis-je vous aider ? 🌱',
                message: 'Je suis là pour vous guider dans votre démarche écologique ! Parlez-moi de votre besoin spécifique et je vous orienterai vers la bonne application.',
                showConfirmation: false,
                showQuickActions: true
            };
        }

        if (!selectedApp || confidence < 0.3) {
            return {
                title: 'Précisons votre demande 🤔',
                message: 'Je n\'ai pas bien compris votre besoin. Pouvez-vous reformuler ? Par exemple : "réduire ma facture d\'électricité", "calculer mon empreinte carbone", "trouver des points de recyclage", "jouer à un quiz écologique", etc.',
                showConfirmation: false,
                showQuickActions: true
            };
        }

        let message = `<div class="nlp-response">
            <h4>${selectedApp.emoji} ${selectedApp.name}</h4>
            <p>${selectedApp.description}</p>
            <div class="app-features">`;

        selectedApp.features.forEach(feature => {
            message += `<li>✓ ${feature}</li>`;
        });

        message += `</div>
            <p class="recommendation-text">${selectedApp.recommendation}</p>
        </div>`;

        return {
            title: 'Voici ce qui vous correspond ! 🎯',
            message,
            showConfirmation: true,
            selectedApp: selectedApp
        };
    }

    function openChat() {
        console.log('openChat function called');
        if (puureChat) {
            puureChat.classList.add('open');
            console.log('Added open class to:', puureChat);
        }
        if (notificationDot) notificationDot.style.display = 'none';

        if (!onboardingStarted) {
            startOnboarding();
            onboardingStarted = true;
        }
    }

    function closeChat() {
        console.log('closeChat function called');
        if (puureChat) {
            puureChat.classList.remove('open');
            console.log('Removed open class from:', puureChat);
        }
    }

    if (toggleChatBtn) {
        toggleChatBtn.addEventListener('click', openChat);
    }
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', closeChat);
    }

    console.log('Event listeners attached to toggle button:', toggleChatBtn);
    console.log('Event listeners attached to close button:', closeChatBtn);

    function createMessage(text, isBot = true, delayClass = '') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = `msg-content ${delayClass}`;

        if (text.includes('<')) {
            contentDiv.innerHTML = text;
        } else {
            contentDiv.textContent = text;
        }

        msgDiv.appendChild(contentDiv);
        if (chatBody) {
            chatBody.appendChild(msgDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        if (isBot) {
            isWaitingForConfirmation = text.includes('répond à votre question') || text.includes('Parfait') || text.includes('correspond à votre besoin') || text.includes('Puis-je vous en dire plus');
        } else {
            isWaitingForConfirmation = false;
        }

        return msgDiv;
    }

    function startOnboarding() {
        createMessage('Bonjour, je suis <strong>Puure</strong>, votre assistant intelligent EcoVerse. 🌱');

        setTimeout(() => {
            createMessage('Grâce à ma compréhension avancée du langage naturel, je peux vous recommander l\'application la plus adaptée à vos besoins écologiques.', true, 'delay-1');
        }, 500);

        setTimeout(() => {
            const botMsg = createMessage('Que puis-je faire pour vous aujourd\'hui ?', true, 'delay-2');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'quick-actions';

            const actions = [
                { label: '⚡ Réduire mon énergie', query: 'Comment réduire ma consommation énergétique ?' },
                { label: '♻️ Gérer mes déchets', query: 'Aidez-moi à mieux trier mes déchets' },
                { label: '🗺️ Trouver des points verts', query: 'Où se trouvent les points d\'intérêt écologiques ?' },
                { label: '🧠 Tester mes connaissances', query: 'Je veux jouer au quiz écologique' }
            ];

            actions.forEach(action => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = action.label;
                chip.onclick = () => {
                    if (chatInput) {
                        chatInput.value = action.query;
                        sendMessage();
                    }
                };
                actionsDiv.appendChild(chip);
            });

            botMsg.appendChild(actionsDiv);
            if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
        }, 1200);
    }

    async function sendMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (text === '') return;

        const lowerText = text.toLowerCase();
        const isClosing = /merci|clair|parfait|au revoir|c\'est bon|pas besoin|rien d\'autre|plus besoin|\bok\b|c\'est tout|fini|terminé|bye|adieu|salut/i.test(lowerText);
        const isPositive = /\boui\b|exactement|tout à fait|ça me va|c\'est bon|formidable|correspond/i.test(lowerText);
        const isPositiveWithDetails = /\boui\b.*(?:dites?|expliquez?|plus|détails?|infos?|en savoir plus)/i.test(lowerText);
        const isNegative = /\bnon\b|pas vraiment|pas du tout|pas intéressé/i.test(lowerText);
        const isContinuing = /autre question|une autre question|j\'ai une autre question|autre chose|quelque chose d\'autre|encore une question/i.test(lowerText);

        // Vérifier AVANT de créer le message utilisateur (qui réinitialiserait isWaitingForConfirmation)
        const wasWaitingForConfirmation = isWaitingForConfirmation;

        createMessage(text, false);
        chatInput.value = '';

        if (isPositiveWithDetails && wasWaitingForConfirmation && currentSelectedApp) {
            // L'utilisateur confirme et demande plus de détails
            const details = getAppDetails(currentSelectedApp.id);
            if (details) {
                createMessage(details, true);
                isWaitingForConfirmation = false;
                currentSelectedApp = null;
            }
            return;
        } else if (isClosing || (isPositive && wasWaitingForConfirmation)) {
            createMessage('Excellent ! Je suis ravi d\'avoir pu vous aider. N\'hésitez pas à revenir si vous avez d\'autres questions. Excellente journée éco-responsable ! 🌿✨');
            return;
        }

        if (isNegative && wasWaitingForConfirmation) {
            createMessage('Je comprends ! Parlez-moi précisément de ce que vous recherchez. Je m\'adapterai à vos besoins. 🎯');
            return;
        }

        if (isContinuing) {
            isWaitingForConfirmation = false;
            createMessage('Bien sûr ! Je suis là pour vous aider. Quelle est votre nouvelle question ou quel autre besoin écologique avez-vous ? 🌱');
            return;
        }

        const typingMsg = createMessage('<i>Puure analyse votre demande...</i> <i class="ri-loader-4-line ri-spin"></i>', true);

        setTimeout(async () => {
            if (chatBody && typingMsg.parentNode === chatBody) {
                chatBody.removeChild(typingMsg);
            }

            const analysis = await analyzeWithNLP(text);
            const response = generateContextualResponse(analysis);

            createMessage(response.message, true);

            if (response.showConfirmation && analysis.selectedApp) {
                currentSelectedApp = analysis.selectedApp;
                setTimeout(() => {
                    createMessage('Est-ce que ' + analysis.selectedApp.name + ' correspond à votre besoin ? Puis-je vous en dire plus ?', true);
                }, 800);
            }
        }, 1200);
    }

    if (btnSend) {
        btnSend.addEventListener('click', sendMessage);
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});
