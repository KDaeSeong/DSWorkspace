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
        
        // if (characterData.data.length === 0) {
        //     console.warn("characterData.data가 비어 있습니다. 기본값을 설정합니다.");
        //     characterData.data = [
        //         { id: 0, name: "기본 플레이어1", imageSrc: "default_image.png" },
        //         { id: 1, name: "기본 플레이어2", imageSrc: "default_image.png" },
        //     ];
        // }

        // 매핑 및 초기화
        gameState.players = characterData.data.map((char, index) => {
            const detail = charDetails.find(detail => detail.id === char.id) || {};
            return {
                id: char.id ?? index, // 기본 ID 설정
                name: detail.name || char.name || `플레이어${index}`,
                image: char.imageSrc || "default_image.png",
                isAlive: true,
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
        
        // 플레이어 데이터 검증 및 초기화
        // gameState.players.forEach((player, index) => {
        //     if (!player.id && player.id !== 0) {
        //         console.error(`플레이어 ${index}의 ID가 유효하지 않습니다. 기본값으로 설정합니다.`);
        //         player.id = index; // 기본 ID 설정
        //     }
        // });

        console.log("초기화된 플레이어 데이터:", gameState.players);

        // 이벤트 데이터 초기화
        gameState.eventData = (eventData.data || []).map(event => ({
            ...event,
            targets: event.targets || 1,
        }));
        console.log("초기화된 이벤트 데이터:", gameState.eventData);

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


// 진행 버튼 핸들러




// 특정 캐릭터가 죽었을 때 상태 업데이트

function updateCharacterStatus(player) {
    const playerElement = document.getElementById(`player-${player.id}`);

    if (playerElement) {
        const playerImage = playerElement.querySelector("img");

        if (!player.isAlive) {
            if (player.deathDay === gameState.dayCount) {
                // 죽은 날: 흑백 처리
                playerImage.style.filter = "grayscale(100%)";
                playerImage.style.opacity = "0.5";
            } else if (player.deathDay < gameState.dayCount) {
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

    const imagesHtml = images
        .filter(({ image, name }) => image && name)
        .map(({ image, name, isAlive }) => `
            <div class="event-char-frame" style="display: inline-block; margin: 0 10px;">
                <img src="${image}" alt="${name}" class="event-char-image" style="width: 220px; height: 220px; border: 1px solid black; background-color: black; border-radius: 50%; ${isAlive ? '' : 'filter: grayscale(100%);'}">
                <div class="event-char-name" style="margin-top: 40px;">${name}</div>
            </div>
        `).join("");

    eventElement.innerHTML = `
        <div class="event-char">${imagesHtml}</div>
        <div class="event-text">${text}</div>
    `;
    eventDisplay.appendChild(eventElement);
}

function determineEventType(textEvent) {
    const eventMappings = [
        { type: "근접전", keywords: [/둔기를 내리쳐/, /교살했습니다/] },
        { type: "원거리전", keywords: [/저격했습니다/, /돌팔매로/] },
        { type: "계략", keywords: [/함정에 빠트렸습니다/] },
        { type: "생존", keywords: [/생존/, /이로운 효과/] },
    ];

    for (const mapping of eventMappings) {
        if (mapping.keywords.some((regex) => regex.test(textEvent))) {
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


// 이벤트 처리
// 데이터를 기반으로 killer와 killee를 선정하고 이벤트를 처리하는 로직
function getRandomWeightedPlayer(players, usedPlayers, eventType, excludeId = null) {
    console.log("getRandomWeightedPlayer 호출");
    console.log("players 상태:", players);
    console.log("usedPlayers 상태:", Array.from(usedPlayers));
    console.log("excludeId:", excludeId);
    console.log("eventType:", eventType);

    // validPlayers 선언 및 초기화
    let validPlayers = players.filter(
        (player) =>
            player.isAlive &&
            !usedPlayers.has(player.id) &&
            player.id !== excludeId
    );

    console.log("필터링된 유효한 플레이어:", validPlayers);

    if (validPlayers.length === 0) {
        console.error("유효한 플레이어를 찾을 수 없습니다.", { players, usedPlayers, excludeId, eventType });
        return null;
    }

    const weights = validPlayers.map((player) => {
        const stats = player.stats;
        switch (eventType) {
            case "근접전":
                return (stats.strength === "높음" ? 3 : stats.strength === "중" ? 2 : 1) +
                       (stats.physique === "높음" ? 2 : stats.physique === "중" ? 1 : 0);
            case "원거리전":
                return (stats.shooting === "높음" ? 3 : stats.shooting === "중" ? 2 : 1) +
                       (stats.agility === "높음" ? 2 : stats.agility === "중" ? 1 : 0);
            case "생존":
                return (stats.intelligence === "높음" ? 3 : stats.intelligence === "중" ? 2 : 1) +
                       (stats.stamina === "높음" ? 2 : stats.stamina === "중" ? 1 : 0);
            case "계략":
                return (stats.intelligence === "높음" ? 3 : stats.intelligence === "중" ? 2 : 1) +
                       (stats.dexterity === "높음" ? 2 : stats.dexterity === "중" ? 1 : 0);
            default:
                return 1;
        }
    });

    console.log("계산된 가중치:", weights);

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
        console.error("가중치가 0인 플레이어만 존재합니다.");
        return null;
    }

    let randomValue = Math.random() * totalWeight;
    for (let i = 0; i < validPlayers.length; i++) {
        randomValue -= weights[i];
        if (randomValue <= 0) {
            const selectedPlayer = validPlayers[i];
            if (!selectedPlayer || selectedPlayer.id === undefined) {
                console.error("선택된 플레이어가 유효하지 않습니다.", selectedPlayer);
                return null;
            }
            usedPlayers.add(selectedPlayer.id); // 유효한 플레이어만 추가
            console.log("선택된 플레이어:", selectedPlayer);
            return selectedPlayer;
        }
    }

    console.error("유효한 플레이어를 선택하지 못했습니다.");
    return null;
}



function updateGamePhase() {
    const display = document.getElementById("day-night-display");
    const eventDisplay = document.querySelector(".event-display");

    if (gameState.finished) {
        if (gameState.winnerPending) {
            // 최종 승자 표시 단계
            display.innerHTML = "";
            eventDisplay.innerHTML = "";

            const alivePlayers = gameState.players.filter((player) => player.isAlive);
            const winner = alivePlayers[0];

            if (winner) {
                display.innerHTML = `
                    <h1>승자: ${winner.name}</h1>
                    <img src="${winner.image}" alt="${winner.name}" style="width: 220px; height: 220px; border: 2px solid black; border-radius: 50%; margin-top: 70px; margin-left: 30px">
                `;
            } else {
                display.innerHTML = `<h1>모두 탈락했습니다.</h1>`;
            }

            gameState.winnerPending = false; // 승자 대기 플래그 해제
            proceedButton.textContent = "킬 순위 보기";
            proceedButton.style.fontSize = "30px";

            return;
        }

        if (!gameState.rankDisplayed) {
            // 킬 순위 보기 단계
            display.innerHTML = "킬 순위";
            eventDisplay.innerHTML = "<div style='text-align: center; padding: 20px; background-color: #f4f4f4; border-radius: 10px;'>킬 순위</div>";

            const killCounts = gameState.players.map((player) => ({
                name: player.name,
                kills: player.kills || 0,
                image: player.image // 이미지 추가
            }));

            killCounts.sort((a, b) => b.kills - a.kills); // 킬 수에 따라 정렬

            killCounts.forEach((player, index) => {
                const rankElement = document.createElement("div");
                rankElement.style.marginBottom = "20px";
                rankElement.style.textAlign = "center";
                rankElement.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center;">
                        <img src="${player.image}" alt="${player.name}" style="width: ${index === 0 ? '150px' : '100px'}; height: ${index === 0 ? '150px' : '100px'}; border-radius: 50%; margin-right: 20px; border: 3px solid ${index === 0 ? 'gold' : '#ddd'};">
                        <div>
                            <h3 style="margin: 0; font-size: ${index === 0 ? '24px' : '18px'};">${index + 1}위: ${player.name} (${player.kills} 킬)</h3>
                        </div>
                    </div>
                `;
                eventDisplay.appendChild(rankElement);
            });

            gameState.rankDisplayed = true;
            proceedButton.textContent = "킬 로그 보기";

            return;
        }

        if (!gameState.logsDisplayed) {
            // 킬 로그 보기 단계
            display.innerHTML = "킬 로그";
            eventDisplay.innerHTML = "<div style='text-align: center; padding: 20px; background-color: #f4f4f4; border-radius: 10px;'>킬 로그</div>";

            gameState.killerLogs = gameState.killerLogs || []; // 킬 로그 초기화

            gameState.killerLogs.forEach((log) => {
                const logElement = document.createElement("div");
                logElement.style.marginBottom = "10px";
                logElement.style.padding = "10px";
                logElement.style.border = "1px solid #ddd";
                logElement.style.borderRadius = "5px";
                logElement.style.backgroundColor = "#fff";
                logElement.innerHTML = `<p>${log}</p>`;
                eventDisplay.appendChild(logElement);
            });

            gameState.logsDisplayed = true;
            proceedButton.textContent = "헝거게임 메인 화면으로";

            return;
        }

        // 모든 단계가 완료된 후에만 메인 화면으로 이동
        if (gameState.rankDisplayed && gameState.logsDisplayed) {
            console.log("모든 단계 완료: 메인 화면으로 이동합니다.");
            window.location.href = "헝거게임메인.html";
        }

        return;
    }

    // 게임 진행 중일 경우
    display.innerHTML = "";
    eventDisplay.innerHTML = "";

    if (gameState.phase === "day") {
        display.classList.remove("night-mode");
        display.innerHTML = `<h1>${gameState.dayCount}일차 낮</h1>`;
        processPhase("낮");
        gameState.phase = "night";
    } else {
        display.classList.add("night-mode");
        display.innerHTML = `<h1>${gameState.dayCount}일차 밤</h1>`;
        processPhase("밤");
        gameState.phase = "day";
        gameState.dayCount++;
    }

    checkGameEnd(); // 게임 종료 조건 확인
}

function checkGameEnd() {
    const alivePlayers = gameState.players.filter((player) => player.isAlive);

    if (alivePlayers.length === 1 && !gameState.finished) {
        // 한 명만 남으면 즉시 게임 종료
        console.log(`게임 종료: 최종 승자는 ${alivePlayers[0].name}입니다.`);
        gameState.winnerPending = true;
        gameState.finished = true; // 게임 종료 상태 설정

        // 단계별 진행 상태 초기화
        gameState.rankDisplayed = false;
        gameState.logsDisplayed = false;
        return;
    }

    if (alivePlayers.length === 0) {
        console.log("게임 종료: 모든 플레이어가 사망했습니다.");
        gameState.winnerPending = true;
        gameState.finished = true;

        // 단계별 진행 상태 초기화
        gameState.rankDisplayed = false;
        gameState.logsDisplayed = false;
    }
}

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
                .replace(/%0/g, killer.name)
                .replace(/%1/g, killee.name);

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
            <img src="${playerImage}" alt="${player.name}" class="player-image" style="width: 220px; height: 220px;">
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