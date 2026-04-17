/**
 * Perfect Paw Match - Premium Game Engine (14 Cards Version)
 * 3-Match Puzzle Logic with Zio & Zia Themes
 */

export const CARD_PAIRS = [
  { id: 1, name: 'Zia', img: '/assets/zia.png' },
  { id: 2, name: 'Zio', img: '/assets/zio.png' },
  { id: 3, name: 'Golden Paw', img: '/assets/item_01.png' },
  { id: 4, name: 'Indigo Bowtie', img: '/assets/item_02.png' },
  { id: 5, name: 'Fuchsia Ribbon', img: '/assets/item_03.png' },
  { id: 6, name: 'Crystal Ball', img: '/assets/item_04.png' },
  { id: 7, name: 'Royal Cat Bed', img: '/assets/item_05.png' },
  { id: 8, name: 'Silver Bag', img: '/assets/item_06.png' },
  { id: 9, name: 'Emerald Fish', img: '/assets/item_07.png' },
  { id: 10, name: 'Luxury Snack', img: '/assets/item_08.png' },
  { id: 11, name: 'Catnip Toy', img: '/assets/item_09.png' },
  { id: 12, name: 'Grooming Brush', img: '/assets/item_10.png' },
  { id: 13, name: 'Feather Wand', img: '/assets/item_11.png' },
  { id: 14, name: 'Premium Can', img: '/assets/item_12.png' }
];

const gameConfig = {
    icons: CARD_PAIRS, // Use CARD_PAIRS objects instead of emojis
    maxSlots: 7,
    stackSize: 24, // Must be multiple of 3
    rebaseDelay: 400,
    reportDelay: 1000
};

let gameState = {
    score: 0,
    level: 1,
    leftStack: [],
    rightStack: [],
    traySlots: [],
    isBusy: false,
    isGameOver: false
};

const dom = {
    currentScore: document.getElementById('current-score'),
    currentLevel: document.getElementById('current-level'),
    leftStackEl: document.getElementById('left-stack'),
    rightStackEl: document.getElementById('right-stack'),
    trayEl: document.getElementById('matching-slots'),
    slots: document.querySelectorAll('.slot'),
    messageBox: document.getElementById('message-display'),
    overlay: document.getElementById('game-overlay'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayMsg: document.getElementById('overlay-msg'),
    retryBtn: document.getElementById('retry-btn')
};

// --- Initialization ---

function initGame() {
    console.log("🎮 Initializing Perfect Paw Match (14 Cards)...");
    
    // Reset State
    gameState.score = 0;
    gameState.level = 1;
    gameState.isGameOver = false;
    gameState.traySlots = [];
    
    gameState.leftStack = generateSolvableStack(gameConfig.stackSize);
    gameState.rightStack = generateSolvableStack(gameConfig.stackSize);
    
    // UI Events
    if (dom.retryBtn) {
        dom.retryBtn.onclick = () => {
            if (gameState.isGameOver) {
                location.reload();
            } else {
                nextLevel();
            }
        };
    }
    
    renderAll();
    showMessage("행운을 빌어요! 🐾");
}

function generateSolvableStack(size) {
    const pool = [];
    const numSets = size / 3;
    for (let i = 0; i < numSets; i++) {
        const card = gameConfig.icons[Math.floor(Math.random() * gameConfig.icons.length)];
        pool.push(card, card, card);
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

// --- Rendering ---

function renderAll() {
    renderStack('left', gameState.leftStack);
    renderStack('right', gameState.rightStack);
    renderTray();
    
    if (dom.currentScore) dom.currentScore.textContent = String(gameState.score).padStart(4, '0');
    if (dom.currentLevel) dom.currentLevel.textContent = String(gameState.level).padStart(2, '0');
}

function renderStack(side, stack) {
    const container = side === 'left' ? dom.leftStackEl : dom.rightStackEl;
    if (!container) return;
    container.innerHTML = '';
    
    stack.forEach((cardData, index) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        // Use image instead of emoji
        const img = document.createElement('img');
        img.src = cardData.img;
        img.alt = cardData.name;
        card.appendChild(img);
        
        // Z-Index and Offset for depth
        const offset = (stack.length - 1 - index) * 2;
        card.style.bottom = `${offset}px`;
        card.style.transform = `scale(${1 - (stack.length - 1 - index) * 0.01})`;
        
        // Only top card is active
        if (index === stack.length - 1) {
            card.style.zIndex = 100;
            card.onclick = () => selectCard(side);
        } else {
            card.style.opacity = '0.4';
            card.style.pointerEvents = 'none';
        }
        
        container.appendChild(card);
    });
}

function renderTray() {
    dom.slots.forEach((slot, i) => {
        slot.innerHTML = '';
        const cardData = gameState.traySlots[i];
        if (cardData) {
            const card = document.createElement('div');
            card.className = 'game-card tray-card';
            
            const img = document.createElement('img');
            img.src = cardData.img;
            img.alt = cardData.name;
            card.appendChild(img);
            
            slot.appendChild(card);
        }
    });
}

// --- Logic ---

function selectCard(side) {
    if (gameState.isBusy || gameState.isGameOver) return;
    
    const stack = side === 'left' ? gameState.leftStack : gameState.rightStack;
    if (stack.length === 0) return;

    const cardData = stack.pop();
    
    // Visual feedback
    showMessage(`${cardData.name} 선택됨`);
    
    gameState.traySlots.push(cardData);
    renderAll();
    
    checkMatches();
}

function checkMatches() {
    const counts = {};
    gameState.traySlots.forEach(item => {
        counts[item.id] = (counts[item.id] || 0) + 1;
    });

    let matchedId = null;
    for (const id in counts) {
        if (counts[id] >= 3) {
            matchedId = parseInt(id);
            break;
        }
    }

    if (matchedId) {
        handleMatch(matchedId);
    } else {
        checkGameOver();
    }
}

function handleMatch(matchedId) {
    gameState.isBusy = true;
    const cardData = CARD_PAIRS.find(c => c.id === matchedId);
    showMessage(`${cardData.name} 매칭 성공! ✨`);
    
    setTimeout(() => {
        // Remove 3 instances
        let removed = 0;
        gameState.traySlots = gameState.traySlots.filter(item => {
            if (item.id === matchedId && removed < 3) {
                removed++;
                return false;
            }
            return true;
        });
        
        gameState.score += 150;
        gameState.isBusy = false;
        renderAll();
        
        // Check for Win
        if (gameState.leftStack.length === 0 && gameState.rightStack.length === 0 && gameState.traySlots.length === 0) {
            showOverlay("STAGE CLEAR!", "모든 고양이 용품을 찾았습니다! ✨");
            reportStatus("WIN");
        } else {
            // Check for chain matches
            checkMatches();
        }
    }, gameConfig.rebaseDelay);
}

function checkGameOver() {
    if (gameState.traySlots.length >= gameConfig.maxSlots) {
        gameState.isGameOver = true;
        showOverlay("GAME OVER", "슬롯이 가득 찼습니다. 😿");
        reportStatus("LOSE");
    }
}

function nextLevel() {
    gameState.level++;
    gameState.traySlots = [];
    gameState.leftStack = generateSolvableStack(gameConfig.stackSize);
    gameState.rightStack = generateSolvableStack(gameConfig.stackSize);
    if (dom.overlay) dom.overlay.classList.add('hidden');
    renderAll();
    showMessage(`LEVEL ${gameState.level} START!`);
}

// --- Utilities ---

function showMessage(text) {
    if (!dom.messageBox) return;
    dom.messageBox.textContent = text;
    dom.messageBox.classList.remove('hidden');
    setTimeout(() => {
        if (dom.messageBox.textContent === text) {
            dom.messageBox.classList.add('hidden');
        }
    }, 2000);
}

function showOverlay(title, msg) {
    if (!dom.overlay) return;
    dom.overlayTitle.textContent = title;
    dom.overlayMsg.textContent = msg;
    dom.overlay.classList.remove('hidden');
    if (dom.retryBtn) dom.retryBtn.textContent = title === "GAME OVER" ? "RESTART" : "NEXT STAGE";
}

/**
 * Report status to Telegram & n8n
 */
async function reportStatus(status) {
    const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
    const CHAT_ID = '8452005297';
    const N8N_WEBHOOK_URL = 'http://localhost:88/webhook/perfect-paw-match';
    
    const reportData = {
        app: "Perfect Paw Match",
        status: status,
        score: gameState.score,
        level: gameState.level,
        timestamp: new Date().toISOString()
    };
    
    const reportText = `🐾 Perfect Paw Match 🐾\nStatus: ${status}\nScore: ${gameState.score}\nLevel: ${gameState.level}\nTime: ${new Date().toLocaleString()}`;
    
    console.log("📢 Reporting to Telegram & n8n...");
    
    // Telegram
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: reportText
            })
        });
        console.log("✅ Telegram Report Sent!");
    } catch (err) {
        console.error("❌ Telegram Report Failed:", err);
    }

    // n8n
    try {
        await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        console.log("✅ n8n Report Sent!");
    } catch (err) {
        console.warn("⚠️ n8n Report failed:", err);
    }
}

window.onload = initGame;
