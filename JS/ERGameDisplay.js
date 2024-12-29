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
                id: `player${index}`, // 'player0', 'player1', ...
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
    gameState.eventData = (eventData.data || []).map(event => {
        console.log("처리 중인 이벤트 데이터:", event);

        const killerIds = event.killer
            .map(id => {
                const match = id.match(/(\d+)/);
                return match ? `a${parseInt(match[1], 10) - 1}` : null;
            })
            .filter(Boolean);

        const killeeIds = event.killee
            .map(id => {
                const match = id.match(/(\d+)/);
                return match ? `b${parseInt(match[1], 10) - 1}` : null;
            })
            .filter(id => id && !killerIds.includes(id)); // 중복 제거

        console.log("초기화된 killer IDs:", killerIds);
        console.log("초기화된 killee IDs:", killeeIds);

        if (killerIds.length === 0 && killeeIds.length === 0) {
            console.warn(`유효하지 않은 이벤트 데이터: killer와 killee가 모두 비어 있습니다. 이벤트:`, event);
            return null; // 무효화된 이벤트
        }

        return {
            ...event,
            killer: killerIds,
            killee: killeeIds,
        };
    }).filter(Boolean);
        
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
};

// 특정 캐릭터가 죽었을 때 상태 업데이트

function updateCharacterStatus(player) {
    const playerElement = document.getElementById(`player-${player.id}`);

    if (playerElement) {
        const playerImage = playerElement.querySelector("img");

        if (!player.isAlive) {
            // 죽은 날: 흑백 처리
            playerImage.style.filter = "grayscale(100%)";
            playerImage.style.opacity = "0.5";
            // if (player.deathDay === gameState.dayCount) {
            // } else
             if (player.deathDay < gameState.dayCount) {
                // 다음 날: 이미지 제거
                playerElement.style.display = "none";
            }
        }
    }
}

// 이벤트 렌더링
function renderEvent({ text, images }) {
    const eventDisplay = document.querySelector(".event-display");
    const eventElement = document.createElement("div");
    eventElement.className = "event-appear";

    if (!images || images.length === 0) {
        console.warn("images 데이터가 비어 있습니다.");
        eventElement.innerHTML = `<div class="event-text">${text}</div>`;
    } else {
        const imagesHtml = images
        .filter(({ image, name }) => image && name)
        .map(({ image, name, isAlive }, index) => {
            return `
                <div id="event-char-${index}" class="event-char-frame" style="display: inline-block; margin: 0 10px;">
                    <img 
                        src="${image}" 
                        alt="${name}" 
                        class="event-char-image" 
                        style="
                            width: 300px; 
                            height: 300px; 
                            object-fit: cover; 
                            border: 3px solid gold; 
                            background-color: black; 
                            ${isAlive === false ? "filter: grayscale(100%);" : ""}
                        "
                    >
                    <div class="event-char-name" style="margin-top: 40px;">${name}</div>
                </div>
            `;
        })
        .join("");

        eventElement.innerHTML = `
            <div class="event-char">${imagesHtml}</div>
            <div class="event-text">${text}</div>
        `;
    }

    eventDisplay.appendChild(eventElement);
}

function determineEventType(event) {
    if (event.healTarget && event.healTarget !== "X") {
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

    console.log("전투 이벤트로 분류되지 않은 이벤트:", event.textEvent);
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

// 이벤트 처리
// 데이터를 기반으로 killer와 killee를 선정하고 이벤트를 처리하는 로직
function getRandomWeightedPlayer(players, usedPlayers, eventType, excludeId = null) {
    let validPlayers = players.filter(
        (player) =>
            player.isAlive &&
            !usedPlayers.has(player.id) &&
            player.id !== excludeId
    );


    if (validPlayers.length === 0) {
        console.error("여전히 유효한 플레이어를 찾을 수 없습니다.");
        return null;
    }

    const weights = validPlayers.map((player) => {
        const stats = player.stats || {};
        switch (eventType) {
            case "근접전":
                return (stats.strength === "상" ? 3 : stats.strength === "중" ? 2 : 1);
            case "원거리전":
                return (stats.shooting === "상" ? 3 : stats.shooting === "중" ? 2 : 1);
            case "계략":
                return (stats.intelligence === "상" ? 3 : stats.intelligence === "중" ? 2 : 1);
            default:
                return 1;
        }
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
        console.error("모든 플레이어의 가중치가 0입니다.");
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

    console.error("플레이어 선택 실패");
    return null;
}



// 이벤트 처리 로직 개선

function processPhase(phase) {
    if (!gameState.eventData) {
        console.error("eventData가 로드되지 않았습니다.");
        return;
    }

    const eligibleEvents = gameState.eventData.filter(
        (event) => event.dayNight === phase || event.dayNight === "전체"
    );

    const alivePlayers = gameState.players.filter((player) => player.isAlive);

    if (alivePlayers.length <= 1) {
        console.warn("남은 플레이어가 1명 이하이므로 이벤트를 건너뜁니다.");
        gameState.finished = true;
        gameState.winnerPending = true;
        return;
    }

    // 중복 참여를 방지하기 위한 Set 초기화
    let usedPlayers = new Set();

    const eventCount = Math.min(alivePlayers.length, 5); // 낮/밤 동안 발생할 최대 이벤트 수

    for (let i = 0; i < eventCount; i++) {
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        const eventType = determineEventType(event.textEvent);
        const eventImages = [];
        let eventText = event.textEvent;

        if (event.killer === "X" && event.healTarget !== "X") {
            // 생존 이벤트 처리
            const survivor = getRandomWeightedPlayer(gameState.players, usedPlayers, eventType);
            if (!survivor) {
                console.warn("생존 이벤트에서 유효한 대상을 찾을 수 없습니다.", event);
                continue;
            }

            survivor.hasBenefit = true; // 생존 보너스 부여
            eventImages.push({
                image: survivor.image,
                name: survivor.name,
                isAlive: survivor.isAlive,
            });

            eventText = `${survivor.name} ${event.textEvent.replace(/%0/g, "")}`;
        } else {
            // 일반 이벤트 처리
            const killer = getRandomWeightedPlayer(gameState.players, usedPlayers, eventType);
            if (!killer) {
                console.warn("killer를 찾을 수 없어 이벤트를 건너뜁니다.", event);
                continue;
            }

            const killee = getRandomWeightedPlayer(
                gameState.players,
                usedPlayers,
                eventType,
                killer.id
            );
            if (!killee) {
                console.warn("killee를 찾을 수 없어 이벤트를 건너뜁니다.", event);
                continue;
            }

            killee.isAlive = false;
            killee.deathDay = gameState.dayCount;

            killer.kills = (killer.kills || 0) + 1; // 킬 카운트 증가

            eventImages.push(
                { image: killer.image, name: killer.name, isAlive: killer.isAlive },
                { image: killee.image, name: killee.name, isAlive: killee.isAlive }
            );

            eventText = event.textEvent
                .replace(/^[a\d]$/g, killer.name)
                .replace(/^[b\d]$/g, killee.name);

            usedPlayers.add(killer.id); // killer 제한 추가
            usedPlayers.add(killee.id); // killee 제한 추가

            // 킬 로그 저장
            gameState.killerLogs = gameState.killerLogs || [];
            gameState.killerLogs.push(eventText);
        }

        renderEvent({ text: eventText, images: eventImages });
    }

    gameState.players.forEach((player) => updateCharacterStatus(player));
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
                    font-size: 40px; 
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
                             style="width: 150px; 
                                    height: 150px; 
                                    object-fit: cover; 
                                    border: 3px solid gold; 
                                    border-radius: 10px;">
                        <div>
                            <h2 style="margin: 0; font-size: 24px; color: #333;">
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
                             style="width: 100px; 
                                    height: 100px; 
                                    object-fit: cover; 
                                    border: 3px solid #ddd; 
                                    border-radius: 10px;">
                        <div style="margin-top: 5px; font-size: 14px; color: #333;">
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