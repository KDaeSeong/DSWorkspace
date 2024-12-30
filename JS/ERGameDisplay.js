async function initIndexedDB(dbName, storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function loadIndexedDB(dbName, storeName, key = null) {
    const db = await initIndexedDB(dbName, storeName);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = key ? store.get(key) : store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// DOMContentLoaded에서 데이터 로드 및 초기화
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 데이터 로드
        let characterData = await loadIndexedDB("HungerGameCharacterData", "characters", "charactersData");
        let charDetails = await loadIndexedDB("HungerGameCharDetailsData", "charDetails");
        let eventData = await loadIndexedDB("HungerGameEventData", "events", "eventsData");
        let modifierData = await loadIndexedDB("HungerGameModifierData", "modifiers", "modifiersData");


        // 기본값 설정
        characterData.data = characterData.data || [];
        if (!characterData.data || characterData.data.length === 0) {
            console.warn("characterData가 비어 있습니다. 기본 데이터를 설정합니다.");
            characterData.data = [
                { id: 0, name: "기본 플레이어1", imageSrc: "default_image.png" },
                { id: 1, name: "기본 플레이어2", imageSrc: "default_image.png" },
            ];
        }
        
        // 매핑 및 초기화
        gameState.players = characterData.data.map((char, index) => {
            const detail = charDetails.find(detail => detail.id === char.id) || {};
            return {
                ...char,
                id: String(index), // 이벤트에서 사용하는 ID 형식으로 변경
                name: char.name || `플레이어${index + 1}`,
                isAlive: true,
                kills: 0,
                image: char.imageSrc || "default_image.png",
                hasBenefit: false,
                participatedEvents: new Set(),
                deathDay: null,
                stats: {
                    physique: detail.physique || "중간",
                    strength: detail.attributes?.[0] || "중",
                    agility: detail.attributes?.[1] || "중",
                    handiness: detail.attributes?.[2] || "중",
                    dexterity: detail.attributes?.[3] || "중",
                    intelligence: detail.attributes?.[4] || "중",
                    shooting: detail.attributes?.[5] || "중",
                    stamina: detail.attributes?.[6] || "중",
                },
            };
        });
        
        

        
    // 이벤트 데이터 초기화
    console.log("초기 이벤트 데이터:", eventData);
    // 이벤트 데이터 초기화 시 killer, killee를 gameState.players에 매핑
    gameState.eventData = (eventData.data || []).map((event, index) => {
        if (!event || typeof event !== "object" || !event.textEvent) {
            console.warn(`Invalid event detected during initialization at index ${index}:`, event);
            return null;
        }
    
        // ID 검증
        const killerIds = (event.killer || []).map(id => id.startsWith("a") ? id : `a${id}`);
        const killeeIds = (event.killee || []).map(id => id.startsWith("b") ? id : `b${id}`);
    
        return {
            ...event,
            killer: killerIds.map(id => ({ id })),
            killee: killeeIds.map(id => ({ id })),
        };
    }).filter(Boolean);
    
    console.log("Filtered and Initialized Event Data:", gameState.eventData);
    

        
    // 보정치 객체 생성
    gameState.modifiers = {
        stats: modifierData.data.stats || {},
        abilities: modifierData.data.abilities || {},
    };

    renderCharacterImages(gameState.players);

    } catch (error) {
        console.error("게임 초기화 중 오류:", error);
    }
});

// 게임 상태 객체
let gameState = {
    phase: "day",
    dayCount: 1,
    players: [],
    eventData: [],
    modifierData: {},
    modifiers: {},
    eventResults: [],
    finished: false,
    winnerPending: false,
    killerLogs: [], // 추가
};

// 특정 캐릭터가 죽었을 때 상태 업데이트
function updateCharacterStatus(player) {
    if (!player) {
        console.error("player가 undefined입니다.");
        return;
    }

    const playerElement = document.getElementById(`player-${player.id}`);
    if (!playerElement) {
        console.warn(`ID가 ${player.id}인 DOM 요소를 찾을 수 없습니다.`);
        return;
    }

    const playerImage = playerElement.querySelector("img");
    if (!player.isAlive) {
        playerImage.style.filter = "grayscale(100%)";
        playerImage.style.opacity = "0.5";

        if (player.deathDay < gameState.dayCount) {
            playerElement.style.display = "none";
        }
    }
}




    document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("Loading character data...");
        let characterData = await loadIndexedDB("HungerGameCharacterData", "characters", "charactersData");
        console.log("Character data loaded:", characterData);

        let charDetails = await loadIndexedDB("HungerGameCharDetailsData", "charDetails");
        console.log("Character details loaded:", charDetails);

        gameState.players = characterData.data.map((char, index) => ({
            ...char,
            id: `player${index}`,
            name: char.name || `플레이어${index + 1}`,
        }));

        console.log("Initialized players:", gameState.players);
    } catch (error) {
        console.error("Error initializing game:", error);
    }
});

function determineEventType(event) {
    console.log("Calling determineEventType with event:", event);
    if (!event || typeof event !== "object" || !event.textEvent) {
        console.error("Invalid event detected in determineEventType:", event);
        return "기타"; // 기본값 반환
    }

    if (event.healTarget && event.healTarget !== "") {
        return "생존";
    }

    const eventMappings = [
        { type: "근접전", keywords: [/둔기를 내리쳐/, /교살했습니다/] },
        { type: "원거리전", keywords: [/저격했습니다/, /돌팔매로/] },
        { type: "계략", keywords: [/함정에 빠트렸습니다/, /기습/] },
    ];

    for (const mapping of eventMappings) {
        if (mapping.keywords.some((regex) => regex.test(event.textEvent))) {
            return mapping.type;
        }
    }
    

    return "기타";
}



function getRandomSubsetForAllPlayers(players, events, usedPlayers) {
    const playerEvents = [];
    players.forEach((player) => {
        if (player.isAlive && !usedPlayers.has(player.id)) {
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            usedPlayers.add(player.id);
            playerEvents.push({ player, event: randomEvent });
        }
    });
    return playerEvents;
}

function validateEventData(event) {
    const killers = (event.killer || []).map(k => k.player?.id || k.id || k);
    const killees = (event.killee || []).map(k => k.player?.id || k.id || k);
    const commonIds = killers.filter(killerId => killees.includes(killerId));

    if (commonIds.length > 0) {
        console.error("킬러와 킬리에 동일한 ID가 포함되어 있습니다:", killers, killees, "공통 ID:", commonIds);
        return false; // 이벤트를 무효로 처리
    }
    return true;
}


// 이벤트 처리
// 데이터를 기반으로 killer와 killee를 선정하고 이벤트를 처리하는 로직
function getRandomWeightedPlayer(players, usedPlayers, eventType, excludeId = null) {
    const validPlayers = players.filter(
        (player) =>
            player.isAlive &&
            !usedPlayers.has(player.id) &&
            player.id !== excludeId // 동일 ID 제외
    );

    if (validPlayers.length === 0) {
        console.error("No valid players available. excludeId:", excludeId);
        return null;
    }

    const weights = validPlayers.map((player) => {
        const stats = player.stats || {};
        switch (eventType) {
            case "근접전":
                return stats.strength === "상" ? 3 : stats.strength === "중" ? 2 : 1;
            case "원거리전":
                return stats.shooting === "상" ? 3 : stats.shooting === "중" ? 2 : 1;
            case "계략":
                return stats.intelligence === "상" ? 3 : stats.intelligence === "중" ? 2 : 1;
            default:
                return 1;
        }
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
        console.error("All players have zero weight.");
        return null;
    }

    let randomValue = Math.random() * totalWeight;
    for (let i = 0; i < validPlayers.length; i++) {
        randomValue -= weights[i];
        if (randomValue <= 0) {
            usedPlayers.add(validPlayers[i].id);
            return validPlayers[i];
        }
    }

    console.error("Failed to select a player.");
    return null;
}


// 이벤트 처리 로직 개선
function processPhase(phase) {
    const eligibleEvents = gameState.eventData.filter(
        (event) => event && typeof event === "object" && event.textEvent &&
        (event.dayNight === phase || event.dayNight === "전체")
    );

    if (eligibleEvents.length === 0) {
        console.warn("No eligible events found for the current phase:", phase);
        return;
    }

    console.log("Filtered Eligible Events:", eligibleEvents);

    const maxEvents = Math.min(eligibleEvents.length, 100);
    for (let i = 0; i < maxEvents; i++) {
        const randomIndex = Math.floor(Math.random() * eligibleEvents.length);
        const event = eligibleEvents[randomIndex];

        if (!event || typeof event !== "object") {
            console.warn(`Invalid event selected at index ${randomIndex}. Skipping.`);
            continue;
        }

        console.log(`Processing event at index ${randomIndex}:`, event);
        const eventType = determineEventType(event);
        console.log("Determined Event Type:", eventType);

        // 필요한 플레이어 수 계산
        const requiredKillers = event.killer.length;
        const requiredKillees = event.killee.length;

        // 사용 가능한 플레이어 필터링
        const availablePlayers = gameState.players.filter(
            (player) => player.isAlive && !usedPlayers.has(player.id)
        );

        if (availablePlayers.length < requiredKillers + requiredKillees) {
            console.warn("사용 가능한 플레이어가 부족합니다. 이벤트를 스킵합니다.");
            continue; // 다음 이벤트로 넘어감
        }

        // 킬러 선택
        const killers = [];
        for (let j = 0; j < requiredKillers; j++) {
            const killer = getRandomWeightedPlayer(availablePlayers, usedPlayers, determineEventType());
            if (killer) {
                killers.push(killer);
            } else {
                console.warn("킬러 선택 실패. 이벤트를 스킵합니다.");
                break;
            }
        }

        // 킬리 선택
        const killees = [];
        for (let j = 0; j < requiredKillees; j++) {
            const killee = getRandomWeightedPlayer(availablePlayers, usedPlayers, determineEventType());
            if (killee) {
                killees.push(killee);
            } else {
                console.warn("킬리 선택 실패. 이벤트를 스킵합니다.");
                break;
            }
        }

        if (killers.length < requiredKillers || killees.length < requiredKillees) {
            console.warn("킬러 또는 킬리 선택 실패. 이벤트를 스킵합니다.");
            continue;
        }

        // 텍스트 변환
        let eventText = event.textEvent;
        killers.forEach((killer, idx) => {
            eventText = eventText.replace(new RegExp(`a${idx + 1}`, "g"), killer.name);
        });
        killees.forEach((killee, idx) => {
            eventText = eventText.replace(new RegExp(`b${idx + 1}`, "g"), killee.name);
        });

        // 결과 출력
        console.log("Processed Event Text:", eventText);
        renderEvent({
            text: eventText,
            images: [
                ...killers.map(killer => ({
                    image: killer.image,
                    name: killer.name,
                    isAlive: killer.isAlive,
                })),
                ...killees.map(killee => ({
                    image: killee.image,
                    name: killee.name,
                    isAlive: killee.isAlive,
                })),
            ],
        });
    }
}



// 무작위 하위 집합 선택
function getRandomSubsetWithDuplicates(array, size) {
    const result = [];
    for (let i = 0; i < size; i++) {
        const randomIndex = Math.floor(Math.random() * array.length);
        result.push(array[randomIndex]);
    }
    return result;
}


// 캐릭터 이미지 렌더링

function renderCharacterImages(players) {
    console.log("렌더링할 플레이어 데이터:", players);
    const playerDisplay = document.getElementById("player-display");

    if (!playerDisplay) {
        console.error("'#player-display' 요소를 찾을 수 없습니다.");
        return;
    }

    playerDisplay.innerHTML = ""; // 기존 내용을 비웁니다.

    players.forEach((player) => {
        if (!player.name || !player.image) {
            console.warn("플레이어 데이터가 부족합니다:", player);
            return;
        }

        const playerImage = player.image || "default_image.png"; // 기본 이미지 설정
        const playerElement = document.createElement("div");
        playerElement.className = "player-card";
        playerElement.id = `player-${player.id}`;

        playerElement.innerHTML = `
            <img src="${playerImage}" alt="${player.name}" class="player-image" style="width: 220px; height: 220px; object-fit: cover; ">
            <div class="player-name">${player.name}</div>
        `;

        playerDisplay.appendChild(playerElement);
    });

    console.log("플레이어 이미지 렌더링 완료");
}


const proceedButton = document.getElementById("proceed");
proceedButton.addEventListener("click", () => {
    updateGamePhase();
});


function updateGamePhase() {
    const display = document.getElementById("day-night-display");
    const eventDisplay = document.querySelector(".event-display");

    if (gameState.finished) {
        if (gameState.winnerPending) {
            // 최종 승자 표시 단계
            display.innerHTML = "";
            eventDisplay.innerHTML = "";
            display.classList.remove("night-mode")
            display.classList.add("day-mode")
            const alivePlayers = gameState.players.filter((player) => player.isAlive);
            const winner = alivePlayers[0];

            if (winner) {
                display.innerHTML = 
                    `<h1>승자: ${winner.name}</h1>`
                   
                ;

                // 플레이어 이미지 영역을 최종 승자로 대체
                const playerDisplay = document.getElementById("player-display");
                const playerCard = document.getElementsByClassName("player-card");
                if (playerDisplay) {
                    playerDisplay.innerHTML = 
                        `<div id="winner-card" class="player-card">
                            <img src="${winner.image}" alt="${winner.name}" class="player-image" style="width: 600px; height: 600px; object-fit: cover; border: 10px solid gold; border-radius: 50%; margin: 20px auto; display: block;">
                        </div>`
                    ;
                    playerCard[0].style.width = "660px"
                    playerCard[0].style.height = "660px"
                }
            } else {
                display.innerHTML = `<h1>모두 탈락했습니다.</h1>`;
            }

            gameState.winnerPending = false; // 승자 대기 플래그 해제
            proceedButton.textContent = "킬 순위 보기";
            proceedButton.style.fontSize = "60px";
            proceedButton.style.width = "400px";
            proceedButton.style.height = "150px";
            proceedButton.style.color = "white";
            proceedButton.style.fontFamily = "NanumSquareAcb";
            proceedButton.style.fontWeight = "bold";

            return;
        }

        if (!gameState.rankDisplayed) {
            // 킬 순위 보기 단계
            const winnerCard = document.getElementById("winner-card");
            if (winnerCard) {
                winnerCard.remove();
            }
            display.innerHTML = "킬 순위";
            display.height = "500px";
            eventDisplay.innerHTML = `
                <div style="
                    text-align: center; 
                    font-size: 80px; 
                    font-weight: bold; 
                    padding: 20px; 
                    background-color: #f4f4f4; 
                    border-radius: 10px;
                ">
                    킬 순위
                </div>
            `;
            eventDisplay.style.border = "3px solid black";
            eventDisplay.style.backgroundColor = "white";
            eventDisplay.style.display = "flex";
            eventDisplay.style.flexDirection = "column";
            eventDisplay.style.justifyContent = "center";
            eventDisplay.style.alignItems = "center";
            eventDisplay.style.textAlign = "center";
        
            // 킬 순위 데이터 준비
            const killCounts = gameState.players.map((player) => ({
                name: player.name,
                kills: player.kills || 0,
                image: player.image,
            }));
        
            // 킬 수에 따라 정렬
            killCounts.sort((a, b) => b.kills - a.kills);
        
            // 승자 표시 (1위)
            const winner = killCounts.shift(); // 1위는 배열에서 제거하여 따로 처리
            
            if (winner) {
                const winnerElement = document.createElement("div");
                winnerElement.style.marginBottom = "30px";
                winnerElement.style.textAlign = "center";
                winnerElement.innerHTML = `
                    <div style="
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        gap: 20px;
                    ">
                        <img src="${winner.image}" alt="${winner.name}" 
                             style="width: 600px; 
                                    height: 600px; 
                                    object-fit: cover; 
                                    border: 3px solid gold; 
                                    margin: 100px;
                                    border-radius: 10px;">
                        <div>
                            <h2 style="margin: 0; font-size: 60px; font-weight: bold; color: #333;">
                                1위: ${winner.name} (${winner.kills} 킬)
                            </h2>
                        </div>
                    </div>
                `;
                eventDisplay.appendChild(winnerElement);
            }
        
            // 나머지 순위를 한 줄에 최대 8명씩 표시
            const rows = Math.ceil(killCounts.length / 8); // 필요한 행 수 계산
            for (let i = 0; i < rows; i++) {
                const rowElement = document.createElement("div");
                rowElement.style.display = "flex";
                rowElement.style.justifyContent = "center";
                rowElement.style.gap = "20px";
                rowElement.style.marginBottom = "20px";
        
                const rowPlayers = killCounts.slice(i * 8, (i + 1) * 8); // 현재 행에 포함될 캐릭터들
                rowPlayers.forEach((player) => {
                    const playerElement = document.createElement("div");
                    playerElement.style.textAlign = "center";
                    playerElement.innerHTML = `
                        <img src="${player.image}" alt="${player.name}" 
                             style="width: 300px; 
                                    height: 300px; 
                                    object-fit: cover; 
                                    border: 3px solid #ddd; 
                                    margin: 30px;
                                    border-radius: 10px;">
                        <div style="margin-top: 5px; font-size: 40px; color: #333;">
                            ${player.name} (${player.kills} 킬)
                        </div>
                    `;
                    rowElement.appendChild(playerElement);
                });
        
                eventDisplay.appendChild(rowElement);
            }
        
            // 진행 버튼 스타일 수정
            gameState.rankDisplayed = true;
            proceedButton.textContent = "킬 로그 보기";
            proceedButton.style.fontSize = "60px";
            proceedButton.style.width = "400px";
            proceedButton.style.height = "150px";
            proceedButton.style.color = "white";
            proceedButton.style.fontFamily = "NanumSquareAcb";
            proceedButton.style.fontWeight = "bold";
            return;
        }
        

        if (!gameState.logsDisplayed) {
            // 킬 로그 보기 단계
            const winnerCard = document.getElementById("winner-card");
            if (winnerCard) {
                winnerCard.remove();
            }
            display.innerHTML = "킬 로그";
            eventDisplay.innerHTML = "<div style='text-align: center; font-weight:bold; font-size: 50px; padding: 20px; background-color: #f4f4f4; border-radius: 10px;'>킬 로그</div>";

            gameState.killerLogs = gameState.killerLogs || []; // 킬 로그 초기화

            gameState.killerLogs.forEach((log) => {
                const logElement = document.createElement("div");
                logElement.style.marginBottom = "10px";
                logElement.style.padding = "10px";
                logElement.style.fontSize = "60px";
                logElement.style.border = "1px solid #ddd";
                logElement.style.borderRadius = "5px";
                logElement.style.backgroundColor = "#fff";
                logElement.innerHTML = `<p>${log}</p>`;
                eventDisplay.appendChild(logElement);
            });

            gameState.logsDisplayed = true;
            proceedButton.textContent = "헝거게임 메인 화면으로";
            proceedButton.style.fontSize = "60px";
            proceedButton.style.width = "400px"
            proceedButton.style.height = "150px";
            proceedButton.style.color = "white";
            proceedButton.style.fontFamily = "NanumSquareAcb";
            proceedButton.style.fontWeight = "bold";

            return;
        }

        // 모든 단계가 완료된 후에만 메인 화면으로 이동
        if (gameState.rankDisplayed && gameState.logsDisplayed) {
            console.log("모든 단계 완료: 메인 화면으로 이동합니다.");
            window.location.href = "ERMain.html";
        }

        return;
    }

    // 게임 진행 중일 경우
    display.innerHTML = "";
    eventDisplay.innerHTML = "";
    console.log(gameState.phase);
    if (gameState.phase === "day") {
        display.innerHTML = `<h1>${gameState.dayCount}일차 낮</h1>`;
        gameState.phase = "night";
        console.log("낮 모드 적용");
        display.classList.remove("night-mode");
        display.classList.add("day-mode");
        processPhase("밤");
    } else {
        display.innerHTML = `<h1>${gameState.dayCount}일차 밤</h1>`;
        gameState.phase = "day";
        display.classList.add("night-mode");
        display.classList.remove("day-mode");
        console.log("밤 모드 적용");
        processPhase("낮");
        gameState.dayCount++;
    }

}


// console.log("Initialized Players:", gameState.players);
// 이벤트 렌더링'

function renderEvent({ text, images }) {
        const killerMatches = text.match(/a(\d+)/g) || [];
        const killeeMatches = text.match(/b(\d+)/g) || [];
    
        const killerIds = [...new Set(killerMatches.map(match => match.match(/a(\d+)/)[1]))];
        const killeeIds = [...new Set(killeeMatches.map(match => match.match(/b(\d+)/)[1]))];
    
        // 중복된 ID 제거
        const commonIds = killerIds.filter(id => killeeIds.includes(id));
        if (commonIds.length > 0) {
            console.warn("Duplicate IDs found between killers and killees. Skipping event.");
            return;
        }
    
        const updatedText = text
        .replace(/a(\d+)/g, (_, id) => {
            const killer = gameState.players.find(p => p.id === id && p.isAlive);
            return killer ? killer.name : `a${id}`;
        })
        .replace(/b(\d+)/g, (_, id) => {
            const killee = gameState.players.find(p => p.id === id && p.isAlive);
            return killee ? killee.name : `b${id}`;
        });
        
        console.log("Converted Text Before Rendering:", updatedText);
        console.log(`Converted Text: ${updatedText}`);
    

    // 이미지 출력 유지
    const imagesHtml = images
        .map(({ image, name, isAlive }, index) => `
            <div id="event-char-${index}" class="event-char-frame" style="display: inline-block; margin: 0 10px;">
                <img 
                    src="${image}" 
                    alt="${name}" 
                    class="event-char-image" 
                    style="width: 300px; height: 300px; object-fit: cover; border: 3px solid gold; background-color: black; ${!isAlive ? "filter: grayscale(100%);" : ""}"
                >
                <div class="event-char-name" style="margin-top: 40px;">${name}</div>
            </div>
        `).join("");

    const eventDisplay = document.querySelector(".event-display");
    const eventElement = document.createElement("div");
    eventElement.className = "event-appear";
    eventElement.innerHTML = `
        <div class="event-char">${imagesHtml}</div>
        <div class="event-text">${updatedText}</div>
    `;

    eventDisplay.appendChild(eventElement);
}



