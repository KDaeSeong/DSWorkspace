function processPhase(phase) {
    if (!gameState.eventData) {
        console.error("eventData가 로드되지 않았습니다.");
        return;
    }

    const eligibleEvents = gameState.eventData.filter(
        (event) => event.dayNight === phase || event.dayNight === "전체"
    );

    const usedPlayers = new Set();
    const alivePlayers = gameState.players.filter((player) => player.isAlive);
    const eventsToTrigger = getRandomSubset(eligibleEvents, Math.max(1, Math.floor(Math.random() * eligibleEvents.length)));

    eventsToTrigger.forEach((randomEvent) => {
        let killer = null;
        let killee = null;
        let healTarget = null;
        const eventImages = [];

        // 플레이어가 2명 남았을 경우, 무작위로 한 명을 제외하고 killer 역할 금지
        if (alivePlayers.length === 2) {
            const restrictedPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
            usedPlayers.add(restrictedPlayer); // 제외된 플레이어를 usedPlayers에 추가
        }

        if (randomEvent.killer !== "X" && randomEvent.killee !== "X") {
            killer = getRandomTarget(gameState.players, usedPlayers);
            killee = getRandomTarget(gameState.players, usedPlayers, killer?.id);

            if (killer) {
                eventImages.push({ image: killer.image, name: killer.name, isAlive: killer.isAlive });
                console.log(`${killer.name}이(가) killer로 선택되었습니다.`);
            }
            if (killee) {
                killee.isAlive = false; // killee가 죽었음을 표시
                killee.deathDay = gameState.dayCount; // 죽은 날 기록
                eventImages.push({ image: killee.image, name: killee.name, isAlive: killee.isAlive });
                console.log(`${killee.name}이(가) killee로 선택되었습니다.`);
            }
        } else if (randomEvent.killer === "X" && randomEvent.healTarget !== "X") {
            // killer가 "X"이고 healTarget이 있는 경우 (이로운 효과)
            healTarget = getRandomTarget(gameState.players, usedPlayers);
            if (healTarget) {
                healTarget.hasBenefit = true; // 이로운 효과 부여
                eventImages.push({ image: healTarget.image, name: healTarget.name, isAlive: healTarget.isAlive });
                console.log(`${healTarget.name}이(가) healTarget으로 선택되었습니다.`);
            }
        }

        let eventText = randomEvent.textEvent
            .replace(/%0/g, killer ? killer.name : "")
            .replace(/%1/g, killee ? killee.name : "");

        if (healTarget) {
            eventText = `${healTarget.name} ${eventText}`;
        }

        renderEvent({
            text: eventText,
            images: eventImages,
        });
    });

    gameState.players.forEach((player) => updateCharacterStatus(player)); // 상태 업데이트
}