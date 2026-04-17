/**
 * Perfect Paw Match - Premium Game Engine
 * 3-Match Puzzle Logic with Zio & Zia Themes
 */

const gameConfig = {
    // 14 Category icons from Stitch Guide
    icons: ['😺', '🔔', '🍭', '🥣', '🐾', '🎀', '🌿', '🪮', '🎾', '🍖', '🧶', '🦴', '🪴', '🥫'],
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
    console.log("🎮 Initializing Perfect Paw Match...");
    
    // Reset State
    gameState.score = 0;
    gameState.level = 1;
    gameState.isGameOver = false;
    gameState.traySlots = [];
    
    gameState.leftStack = generateSolvableStack(gameConfig.stackSize);
    gameState.rightStack = generateSolvableStack(gameConfig.stackSize);
    
    // UI Events
    dom.retryBtn.onclick = () => {
        if (gameState.isGameOver) {
            location.reload();
        } else {
            nextLevel();
        }
    };
    
    renderAll();
    showMessage("행운을 빌어요! 🐾");
}

function generateSolvableStack(size) {
    const pool = [];
    const numSets = size / 3;
    for (let i = 0; i < numSets; i++) {
        const icon = gameConfig.icons[Math.floor(Math.random() * gameConfig.icons.length)];
        pool.push(icon, icon, icon);
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
    
    dom.currentScore.textContent = String(gameState.score).padStart(4, '0');
    dom.currentLevel.textContent = String(gameState.level).padStart(2, '0');
}

function renderStack(side, stack) {
    const container = side === 'left' ? dom.leftStackEl : dom.rightStackEl;
    container.innerHTML = '';
    
    stack.forEach((icon, index) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.textContent = icon;
        
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
        const icon = gameState.traySlots[i];
        if (icon) {
            const card = document.createElement('div');
            card.className = 'game-card tray-card';
            card.textContent = icon;
            slot.appendChild(card);
        }
    });
}

// --- Logic ---

function selectCard(side) {
    if (gameState.isBusy || gameState.isGameOver) return;
    
    const stack = side === 'left' ? gameState.leftStack : gameState.rightStack;
    if (stack.length === 0) return;

    const icon = stack.pop();
    
    // Visual feedback
    showMessage(`Selected ${icon}`);
    
    gameState.traySlots.push(icon);
    renderAll();
    
    checkMatches();
}

function checkMatches() {
    const counts = {};
    gameState.traySlots.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });

    let matchedIcon = null;
    for (const icon in counts) {
        if (counts[icon] >= 3) {
            matchedIcon = icon;
            break;
        }
    }

    if (matchedIcon) {
        handleMatch(matchedIcon);
    } else {
        checkGameOver();
    }
}

function handleMatch(icon) {
    gameState.isBusy = true;
    showMessage(`${icon} 매칭 성공! ✨`);
    
    setTimeout(() => {
        // Remove 3 instances
        let removed = 0;
        gameState.traySlots = gameState.traySlots.filter(item => {
            if (item === icon && removed < 3) {
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
            reportToTelegram("WIN");
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
        reportToTelegram("LOSE");
    }
}

function nextLevel() {
    gameState.level++;
    gameState.traySlots = [];
    gameState.leftStack = generateSolvableStack(gameConfig.stackSize);
    gameState.rightStack = generateSolvableStack(gameConfig.stackSize);
    dom.overlay.classList.add('hidden');
    renderAll();
    showMessage(`LEVEL ${gameState.level} START!`);
}

// --- Utilities ---

function showMessage(text) {
    dom.messageBox.textContent = text;
    dom.messageBox.classList.remove('hidden');
    setTimeout(() => {
        if (dom.messageBox.textContent === text) {
            dom.messageBox.classList.add('hidden');
        }
    }, 2000);
}

function showOverlay(title, msg) {
    dom.overlayTitle.textContent = title;
    dom.overlayMsg.textContent = msg;
    dom.overlay.classList.remove('hidden');
    dom.retryBtn.textContent = title === "GAME OVER" ? "RESTART" : "NEXT STAGE";
}

/**
 * Report status to Telegram / n8n
 */
async function reportToTelegram(status) {
    const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
    const CHAT_ID = '8452005297';
    
    const report = `🐾 Perfect Paw Match 🐾\nStatus: ${status}\nScore: ${gameState.score}\nLevel: ${gameState.level}\nTime: ${new Date().toLocaleString()}`;
    
    console.log("📢 Reporting to Telegram...");
    
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: report
            })
        });
        console.log("✅ Telegram Report Sent!");
    } catch (err) {
        console.error("❌ Telegram Report Failed:", err);
    }
}

window.onload = initGame;
