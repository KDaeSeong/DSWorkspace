// window.open
const openLogin = document.getElementById("openLogin");
const openSignIn = document.getElementById("openSignIn");

// 새 탭으로 열기
openLogin.addEventListener("click", function () {
    if (openLogin.innerText.trim() === "로그인") {
        window.open("ERLogin.html", "_blank", "width=400, height=400, left=100, top=150");
    } else if (openLogin.innerText.trim() === "내 정보") {
        window.open("ERMyProfile.html", "_self");
    }
});

openSignIn.addEventListener("click", function () {
    if (openSignIn.innerText.trim() === "회원가입") {
        window.open("ERSignIn.html", "_blank", "width=1000, height=700, left=100, top=150");
    } else {
        localStorage.setItem("loginCheck", "false"); // 로그아웃 처리
        localStorage.setItem("loginID", "");
        window.open("ERMain.html", "_self");
        updateLoginState();
    }
});

function updateLoginState() {
    const loginCheck = localStorage.getItem("loginCheck");
    if (loginCheck === "true") {
        openLogin.innerText = "내 정보";
        openSignIn.innerText = "로그아웃";
    } else {
        openLogin.innerText = "로그인";
        openSignIn.innerText = "회원가입";
    }
}

// 초기 상태 업데이트
document.addEventListener("DOMContentLoaded", updateLoginState);

// 다른 창에서 로그인 상태 변경 감지
window.addEventListener("message", function (event) {
    if (event.data === "loginSuccess") {
        updateLoginState();
    }
});

window.addEventListener("storage", function (event) {
    if (event.key === "loginCheck") {
        updateLoginState();
    }
});


// IndexedDB 초기화
const DB_NAME = "HungerGameEventData";
const DB_VERSION = 1;

// IndexedDB 초기화
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 데이터 저장소 생성 (이벤트용)
            if (!db.objectStoreNames.contains("events")) {
                db.createObjectStore("events", { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}


// 데이터 저장
async function saveToIndexedDB(storeName, id, data) {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        store.put({ id, data });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// 데이터 불러오기
async function loadFromIndexedDB(storeName, id) {
    const db = await initIndexedDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = (event) => resolve(event.target.result?.data || null);
        request.onerror = (event) => reject(event.target.error);
    });
}


// 이벤트 추가 및 IndexedDB 연동
document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#adEventDiv table tbody");
    if (!tableBody) {
        console.error("tableBody를 찾을 수 없습니다. HTML 구조를 확인하세요.");
        return;
    }

    const addEventButton = document.getElementById("addEvent");
    const closePopupButton = document.getElementById("closePopup");
    const popupForm = document.getElementById("popupForm");
    const eventForm = document.getElementById("eventForm");

    addEventButton.addEventListener("click", () => {
        popupForm.style.display = "block";
    });

    closePopupButton.addEventListener("click", () => {
        popupForm.style.display = "none";
        eventForm.reset();
    });

    eventForm.addEventListener("submit", (event) => {
        event.preventDefault();
    
        const textEvent = document.querySelector("#popupForm textarea[name='eventName']").value;
        const killer = document.getElementById("popupKiller").value.split(",").map(item => item.trim());
        const killee = document.getElementById("popupKillee").value.split(",").map(item => item.trim());
        const heal = document.getElementById("popupHeal").checked;
        const benefitTarget = document.getElementById("popupbenefitTarget").value;
        const dayNight = document.getElementById("popupDayNight").value;
    
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td><textarea class="long-input" rows="5" cols="70" style="resize: none;" readonly>${textEvent}</textarea></td>
            <td><input type="text" class="short-input" value="${killer.join(", ") || ""}" readonly></td>
            <td><input type="text" class="short-input" value="${killee.join(", ") || ""}" readonly></td>
            <td><input type="checkbox" ${heal ? "checked" : ""} disabled></td>
            <td><input type="text" class="short-input" value="${benefitTarget || ""}" readonly></td>
            <td>
                <select class="short-select" disabled>
                    <option value="낮" ${dayNight === "낮" ? "selected" : ""}>낮</option>
                    <option value="밤" ${dayNight === "밤" ? "selected" : ""}>밤</option>
                    <option value="전체" ${dayNight === "전체" ? "selected" : ""}>전체</option>
                </select>
            </td>
            <td><input type="checkbox" class="delete-checkbox"></td>
        `;
        tableBody.appendChild(newRow);
    
        popupForm.style.display = "none";
        eventForm.reset();
    });
    

    document.getElementById("deleteEvent").addEventListener("click", () => {
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach((row) => {
            const checkbox = row.querySelector(".delete-checkbox");
            if (checkbox && checkbox.checked) {
                tableBody.removeChild(row);
            }
        });
    });

    const saveButton = document.querySelector("#save h1");
    const loadButton = document.querySelector("#load h1");

    saveButton.addEventListener("click", async () => {
        try {
            const eventData = [];
            tableBody.querySelectorAll("tr").forEach((row) => {
                const textEvent = row.querySelector("textarea")?.value || "";
                const inputs = row.querySelectorAll("input.short-input");
                const healCheckbox = row.querySelector("input[type='checkbox']");
                const dayNightSelect = row.querySelector("select.short-select");
    
                const killer = inputs[0]?.value ? inputs[0]?.value.split(",").map(item => item.trim()) : [];
                const killee = inputs[1]?.value ? inputs[1]?.value.split(",").map(item => item.trim()) : [];
                const heal = healCheckbox?.checked || false;
<<<<<<< HEAD
                const benefitTarget = inputs[2]?.value ? [inputs[2]?.value.trim()] : [];
=======
                const benefitTarget = inputs[2]?.value ? inputs[2]?.value.split(",").map(item => item.trim()) : [];
>>>>>>> c2cbc3ced56b7ae3577305038f11e309910736d9
                const dayNight = dayNightSelect?.value || "";
    
                eventData.push({ textEvent, killer, killee, heal, benefitTarget, dayNight });
            });
    
            if (eventData.length === 0) {
                alert("저장할 이벤트가 없습니다.");
                return;
            }
    
            // JSON 파일로 저장
            saveToJSONFile(eventData, "eventData.json");
    
            // IndexedDB에 저장
            await saveToIndexedDB("events", "eventsData", eventData);
            alert("이벤트가 저장되었습니다!");
        } catch (error) {
            console.error("저장 중 오류 발생:", error);
            alert("이벤트 저장 중 문제가 발생했습니다. 콘솔을 확인하세요.");
        }
    });
    
    loadButton.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
    
        input.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) {
                alert("파일을 선택하지 않았습니다.");
                return;
            }
    
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    let savedData = JSON.parse(e.target.result);
    
                    // 필드 이름 변경 및 빈 값 처리
                    savedData = savedData.map(event => ({
                        ...event,
                        killer: event.killer || [],
                        killee: event.killee || [],
<<<<<<< HEAD
                        benefitTarget: event.benefitTarget || [], // benefitTarget을 benefitTarget으로 변경
=======
                        benefitTarget: event.benefitTarget || [], 
>>>>>>> c2cbc3ced56b7ae3577305038f11e309910736d9
                    }));
    
                    // IndexedDB에 저장
                    await saveToIndexedDB("events", "eventsData", savedData);
    
                    // 테이블 초기화 후 데이터 로드
                    tableBody.innerHTML = "";
                    savedData.forEach((event) => {
                        const newRow = document.createElement("tr");
                        newRow.innerHTML = `
                            <td><textarea class="long-input" rows="5" cols="70" style="resize: none;" readonly>${event.textEvent}</textarea></td>
                            <td><input type="text" class="short-input" value="${event.killer.join(", ")}" readonly></td>
                            <td><input type="text" class="short-input" value="${event.killee.join(", ")}" readonly></td>
                            <td><input type="checkbox" ${event.heal ? "checked" : ""} disabled></td>
                            <td><input type="text" class="short-input" value="${event.benefitTarget.join(", ")}" readonly></td>
                            <td>
                                <select class="short-select" disabled>
                                    <option value="낮" ${event.dayNight === "낮" ? "selected" : ""}>낮</option>
                                    <option value="밤" ${event.dayNight === "밤" ? "selected" : ""}>밤</option>
                                    <option value="전체" ${event.dayNight === "전체" ? "selected" : ""}>전체</option>
                                </select>
                            </td>
                            <td><input type="checkbox" class="delete-checkbox"></td>`;
                        tableBody.appendChild(newRow);
                    });
    
                    alert("이벤트를 불러오고 IndexedDB에 반영했습니다!");
                } catch (error) {
                    alert("파일 형식이 잘못되었습니다.");
                    console.error(error);
                }
            };
            reader.readAsText(file);
        });
    
        input.click();
    });
    
    
});

function saveToJSONFile(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 페이지 로드 시 IndexedDB에서 이벤트 데이터 불러오기

// IndexedDB에서 데이터 로드 시
// IndexedDB에서 데이터 로드 시
document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#adEventDiv table tbody");

    try {
        const eventData = await loadFromIndexedDB("events", "eventsData");

        if (eventData && eventData.length > 0) {
            eventData.forEach((event) => {
                const newRow = document.createElement("tr");
                newRow.innerHTML = `
                    <td><textarea class="long-input" rows="5" cols="70" style="resize: none;" readonly>${event.textEvent}</textarea></td>
                    <td><input type="text" class="short-input" value="${event.killer.join(", ")}" readonly></td>
                    <td><input type="text" class="short-input" value="${event.killee.join(", ")}" readonly></td>
                    <td><input type="checkbox" ${event.heal ? "checked" : ""} disabled></td>
                    <td><input type="text" class="short-input" value="${event.benefitTarget.join(", ")}" readonly></td>
                    <td>
                        <select class="short-select" disabled>
                            <option value="낮" ${event.dayNight === "낮" ? "selected" : ""}>낮</option>
                            <option value="밤" ${event.dayNight === "밤" ? "selected" : ""}>밤</option>
                            <option value="전체" ${event.dayNight === "전체" ? "selected" : ""}>전체</option>
                        </select>
                    </td>
                    <td><input type="checkbox" class="delete-checkbox"></td>`;
                tableBody.appendChild(newRow);
            });
        }
    } catch (error) {
        console.error("IndexedDB에서 데이터를 불러오는 중 오류 발생:", error);
        alert("IndexedDB에서 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});




