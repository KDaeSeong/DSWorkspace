// IndexedDB에서 데이터 로드
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [characterData, eventData, modifierData] = await Promise.all([
            loadFromIndexedDB("characterJson"),
            loadFromIndexedDB("eventJson"),
            loadFromIndexedDB("modifierJson"),
        ]);

        if (!characterData || !eventData || !modifierData) {
            alert("게임 데이터를 불러오는 중 문제가 발생했습니다. 다시 시작해주세요.");
            window.location.href = "헝거게임메인.html";
            return;
        }

        // 캐릭터 데이터 초기화
        gameState.players = characterData.map((char, index) => ({
            id: index,
            name: char.name || `플레이어${index}`,
            image: char.imageSrc || "default_image.png",
            isAlive: true,
            hasBenefit: false,
            participatedEvents: new Set(),
            deathDay: null, // 죽은 날 기록
            stats: {
                combat: modifierData.combat,
                defense: modifierData.defense,
                vitality: modifierData.vitality,
                spirit: modifierData.spirit,
                intelligence: modifierData.intelligence,
                stamina: modifierData.stamina,
                animal: modifierData.animal,
                weed: modifierData.weed,
                cooking: modifierData.cooking,
            },
            abilities: {
                handiness: modifierData.handiness,
                hunting: modifierData.hunting,
                climate: modifierData.climate,
            },
        }));

        // 이벤트 데이터와 보정치 반영
        gameState.eventData = eventData.map(event => ({
            ...event,
            targets: event.targets || 1, // 기본값 설정
        }));
        gameState.modifierData = modifierData;

        // 캐릭터 이미지 렌더링
        renderCharacterImages(gameState.players);
    } catch (error) {
        console.error("게임 초기화 중 오류:", error);
    }
});

async function saveToIndexedDB(id, data) {
    const dbRequest = indexedDB.open("HungerGameFiles", 2); // 필요 시 버전 업데이트

    return new Promise((resolve, reject) => {
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("uploadedFiles", "readwrite");
            const store = transaction.objectStore("uploadedFiles");
            store.put({ id, data });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error("IndexedDB 저장 실패"));
        };

        dbRequest.onerror = () => reject(new Error("IndexedDB 열기 실패"));
    });
}

async function loadFromIndexedDB(id) {
    const dbRequest = indexedDB.open("HungerGameFiles", 2);

    return new Promise((resolve, reject) => {
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("uploadedFiles", "readonly");
            const store = transaction.objectStore("uploadedFiles");
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(new Error("IndexedDB 데이터 로드 실패"));
        };

        dbRequest.onerror = () => reject(new Error("IndexedDB 열기 실패"));
    });
}

// 게임 상태
let gameState = {
    phase: "day",
    dayCount: 1,
    players: [],
    eventData: [],
    modifierData: {},
    eventResults: [],
    finished: false, // 게임 종료 여부
    winnerPending: false, // 승자 출력 대기 상태
};

// 진행 버튼 핸들러
const proceedButton = document.getElementById("proceed");
proceedButton.addEventListener("click", () => {
    if (gameState.finished) {
        window.location.href = "헝거게임메인.html";
        return;
    }
    updateGamePhase();
});


// 캐릭터 이미지 렌더링
function renderCharacterImages(players) {
    const playerDisplay = document.getElementById("player-display");
    playerDisplay.innerHTML = "";

    players.forEach((player) => {
        const playerElement = document.createElement("div");
        playerElement.className = "player-card";
        playerElement.id = `player-${player.id}`; // 각 플레이어를 식별할 수 있는 ID 추가

        playerElement.innerHTML = `
            <img src="${player.image}" alt="${player.name}" class="player-image" style="width: 220px; height: 220px;">
            <div class="player-name">${player.name}</div>
        `;
        playerDisplay.appendChild(playerElement);

        if (!player.isAlive) {
            updateCharacterStatus(player);
        }
    });
}


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



// 이벤트 처리
// 데이터를 기반으로 killer와 killee를 선정하고 이벤트를 처리하는 로직// 데이터를 기반으로 killer와 killee를 선정하고 이벤트를 처리하는 로직
function getRandomWeightedPlayer(players, usedPlayers, eventType, excludeId = null) {
    const validPlayers = players.filter(
        (player) =>
            player.isAlive &&
            !usedPlayers.has(player.id) &&
            player.id !== excludeId
    );

    if (validPlayers.length === 0) {
        console.warn("유효한 플레이어를 찾을 수 없습니다. 모든 플레이어가 사용되었을 수 있습니다.", { validPlayers, usedPlayers, excludeId, eventType });

        // 모든 플레이어가 usedPlayers에 포함된 경우 초기화
        if (usedPlayers.size >= players.length) {
            console.info("usedPlayers 초기화 후 다시 시도합니다.");
            usedPlayers.clear();

            return getRandomWeightedPlayer(players, usedPlayers, eventType, excludeId);
        }
        return null;
    }

    const weights = validPlayers.map((player) => {
        switch (eventType) {
            case "근접전":
                return player.stats.combat + player.stats.vitality;
            case "원거리전":
                return player.stats.shooting + player.stats.agility;
            case "생존":
                return player.stats.intelligence + player.stats.stamina;
            case "계략":
                return player.stats.intelligence + player.stats.spirit;
            default:
                return 1;
        }
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
        console.warn("가중치가 0인 플레이어만 남아있습니다.", { validPlayers, eventType });
        return null;
    }

    let randomValue = Math.random() * totalWeight;

    for (let i = 0; i < validPlayers.length; i++) {
        randomValue -= weights[i];
        if (randomValue <= 0) {
            const selectedPlayer = validPlayers[i];
            usedPlayers.add(selectedPlayer.id);
            return selectedPlayer;
        }
    }

    return null;
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

// 프로세스 페이즈 
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

    const usedPlayers = new Set(); // 캐릭터 중복 참여 방지
    const eventCount = Math.min(alivePlayers.length, 5); // 낮/밤 동안 발생할 최대 이벤트 수

    for (let i = 0; i < eventCount; i++) {
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        let killer = null;
        let killee = null;
        const eventImages = [];

        const eventType = determineEventType(event.textEvent);

        // 생존 이벤트 처리
        if (event.killer === "X" && event.healTarget !== "X") {
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

            const eventText = `${survivor.name} ${event.textEvent.replace(/%0/g, "")}`;
            renderEvent({ text: eventText, images: eventImages });
            usedPlayers.add(survivor.id); // 생존자 제한 추가
            continue;
        }

        // 일반 이벤트 처리
        killer = getRandomWeightedPlayer(gameState.players, usedPlayers, eventType);
        if (!killer) {
            console.warn("killer를 찾을 수 없어 이벤트를 건너뜁니다.", event);
            continue;
        }
        usedPlayers.add(killer.id); // killer 제한 추가

        killee = getRandomWeightedPlayer(
            gameState.players,
            usedPlayers,
            eventType,
            killer.id
        );
        if (!killee) {
            console.warn("killee를 찾을 수 없어 이벤트를 건너뜁니다.", event);
            continue;
        }
        usedPlayers.add(killee.id); // killee 제한 추가

        killee.isAlive = false;
        killee.deathDay = gameState.dayCount;

        eventImages.push(
            { image: killer.image, name: killer.name, isAlive: killer.isAlive },
            { image: killee.image, name: killee.name, isAlive: killee.isAlive }
        );

        const eventText = event.textEvent
            .replace(/%0/g, killer.name)
            .replace(/%1/g, killee.name);

        renderEvent({ text: eventText, images: eventImages });
    }

    gameState.players.forEach((player) => updateCharacterStatus(player));
}

function updateGamePhase() {
    if (gameState.finished) return; // 게임이 끝난 경우 더 이상 진행하지 않음

    const display = document.getElementById("day-night-display");
    const eventDisplay = document.querySelector(".event-display");

    // 승자 대기 상태인 경우 승자 출력
    if (gameState.winnerPending) {
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

        gameState.finished = true; // 게임 종료 플래그 설정
        proceedButton.textContent = "헝거게임 메인 화면으로";
        proceedButton.style.fontSize = "30px";

        return;
    }

    // 일반 게임 진행
    display.innerHTML = "";
    eventDisplay.innerHTML = "";

    if (gameState.phase === "day") {
        display.innerHTML = `<h1>${gameState.dayCount}일차 낮</h1>`;
        processPhase("낮");
        gameState.phase = "night";
    } else {
        display.innerHTML = `<h1>${gameState.dayCount}일차 밤</h1>`;
        processPhase("밤");
        gameState.phase = "day";
        gameState.dayCount++;
    }

    checkGameEnd(); // 게임 종료 조건 확인
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


// 게임 종료 조건 확인
function checkGameEnd() {
    const alivePlayers = gameState.players.filter((player) => player.isAlive);

    if (alivePlayers.length <= 1 && !gameState.winnerPending) {
        // 승자 출력 대기 플래그 설정
        gameState.winnerPending = true;
    }
}



// function processPhase(phase) {
//     if (!gameState.eventData) {
//         console.error("eventData가 로드되지 않았습니다.");
//         return;
//     }

//     const eligibleEvents = gameState.eventData.filter(
//         (event) => event.dayNight === phase || event.dayNight === "전체"
//     );

//     const usedPlayers = new Set();
//     const alivePlayers = gameState.players.filter((player) => player.isAlive);

//     // 남은 플레이어가 1명 이하인 경우 처리
//     if (alivePlayers.length <= 1) {
//         console.warn("남은 플레이어가 1명 이하이므로 killer 이벤트를 건너뜁니다.");
//         return;
//     }

//     // const eventsToTrigger = getRandomSubsetWithDuplicates(eligibleEvents, 5);
//     const eventsToTrigger = getRandomSubsetWithDuplicates(eligibleEvents, Math.max(1, Math.floor(Math.random() * eligibleEvents.length)));

//     eventsToTrigger.forEach((randomEvent) => {
//         let killer = null;
//         let killee = null;
//         let healTarget = null;
//         const eventImages = [];

//         // killer가 필요 없는 이벤트 처리
//         if (randomEvent.killer === "X") {
//             if (randomEvent.healTarget !== "X") {
//                 healTarget = getRandomTarget(gameState.players, usedPlayers);
//                 if (healTarget) {
//                     healTarget.hasBenefit = true; // 이로운 효과 부여
//                     eventImages.push({ image: healTarget.image, name: healTarget.name, isAlive: healTarget.isAlive });
//                 }
//             }

//             let eventText = randomEvent.textEvent
//                 .replace(/%0/g, "")
//                 .replace(/%1/g, healTarget ? healTarget.name : "");

//             if (healTarget) {
//                 eventText = `${healTarget.name} ${eventText}`;
//             }

//             renderEvent({
//                 text: eventText,
//                 images: eventImages,
//             });
//             return; // 이벤트 처리 완료 후 다음 이벤트로 이동
//         }

//         // killer 이벤트 처리 (남은 플레이어가 2명 이상인 경우에만 실행)
//         if (alivePlayers.length > 1) {
//             killer = getRandomTarget(gameState.players, usedPlayers);

//             if (!killer) {
//                 console.warn("killer를 찾을 수 없어 이벤트를 스킵합니다:", randomEvent);
//                 return;
//             }

//             killee = getRandomTarget(gameState.players, usedPlayers, killer.id);

//             if (killer) {
//                 eventImages.push({ image: killer.image, name: killer.name, isAlive: killer.isAlive });
//             }
//             if (killee) {
//                 killee.isAlive = false; // killee가 죽었음을 표시
//                 killee.deathDay = gameState.dayCount; // 죽은 날 기록
//                 eventImages.push({ image: killee.image, name: killee.name, isAlive: killee.isAlive });
//                 let eventText = randomEvent.textEvent
//                 .replace(/%0/g, killer ? killer.name : "")
//                 .replace(/%1/g, killee ? killee.name : "");
    
//                 renderEvent({
//                     text: eventText,
//                     images: eventImages,
//                 });
//             }

            
//         }
//     });

//     // 모든 플레이어 상태 업데이트
//     gameState.players.forEach((player) => updateCharacterStatus(player));
// }



// // 무작위 대상 선택
// function getRandomTarget(players, usedPlayers, excludeId = null) {
//     // 살아있는 플레이어 중에서 사용되지 않은 플레이어를 필터링
//     const validPlayers = players.filter(
//         (player) => player.isAlive && !usedPlayers.has(player.id) && player.id !== excludeId
//     );

//     if (validPlayers.length === 0) return null;

//     // 가중치를 적용하여 선택
//     const weightedPlayers = validPlayers.flatMap((player) =>
//         player.hasBenefit ? [player, player] : [player] // hasBenefit이 true인 경우 가중치 추가
//     );

//     const target = weightedPlayers[Math.floor(Math.random() * weightedPlayers.length)];
//     usedPlayers.add(target.id);
//     return target;
// }
