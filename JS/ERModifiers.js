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



// IndexedDB 설정
const DB_NAME = "HungerGameModifierData";
const DB_VERSION = 1;

// IndexedDB 초기화
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 데이터 저장소 생성 (보정치용)
            if (!db.objectStoreNames.contains("modifiers")) {
                db.createObjectStore("modifiers", { keyPath: "id" });
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

// 페이지 로드 시 IndexedDB에서 보정치 데이터를 불러오기
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const modifiers = await loadFromIndexedDB("modifiers", "modifiersData");

        if (modifiers) {
            document.getElementById("combatModifier").value = modifiers.combat;
            document.getElementById("defenseModifier").value = modifiers.defense;
            document.getElementById("vitalityModifier").value = modifiers.vitality;
            document.getElementById("spiritModifier").value = modifiers.spirit;
            document.getElementById("intelligenceModifier").value = modifiers.intelligence;
            document.getElementById("staminaModifier").value = modifiers.stamina;
            document.getElementById("animalModifier").value = modifiers.animal;
            document.getElementById("weedModifier").value = modifiers.weed;
            document.getElementById("cookingModifier").value = modifiers.cooking;
            document.getElementById("handinessModifier").checked = modifiers.handiness;
            document.getElementById("huntingModifier").checked = modifiers.hunting;
            document.getElementById("climateModifier").checked = modifiers.climate;

        } 
    } catch (error) {
        console.error("IndexedDB에서 데이터를 불러오는 중 오류 발생:", error);
        alert("IndexedDB에서 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

// 저장 및 불러오기 이벤트 처리
document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.querySelector("#saveBtn #save a");
    const loadButton = document.querySelector("#saveBtn #load a");

    // 저장 버튼 클릭 이벤트
    saveButton.addEventListener("click", async () => {
        const modifiers = {
            combat: parseFloat(document.getElementById("combatModifier").value),
            defense: parseFloat(document.getElementById("defenseModifier").value),
            vitality: parseFloat(document.getElementById("vitalityModifier").value),
            spirit: parseFloat(document.getElementById("spiritModifier").value),
            intelligence: parseFloat(document.getElementById("intelligenceModifier").value),
            stamina: parseFloat(document.getElementById("staminaModifier").value),
            animal: parseFloat(document.getElementById("animalModifier").value),
            weed: parseFloat(document.getElementById("weedModifier").value),
            cooking: parseFloat(document.getElementById("cookingModifier").value),
            handiness: document.getElementById("handinessModifier").checked,
            hunting: document.getElementById("huntingModifier").checked,
            climate: document.getElementById("climateModifier").checked
        };

        // JSON으로 저장
        const blob = new Blob([JSON.stringify(modifiers, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "modifiers.json";
        a.click();
        URL.revokeObjectURL(a.href);

        // IndexedDB에 저장
        await saveToIndexedDB("modifiers", "modifiersData", modifiers);
        alert("보정치를 파일로 저장하고 IndexedDB에 반영했습니다!");
    });

    // 불러오기 버튼 클릭 이벤트
    loadButton.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";

        fileInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) {
                alert("파일을 선택하지 않았습니다.");
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const modifiers = JSON.parse(e.target.result);

                    document.getElementById("combatModifier").value = modifiers.combat;
                    document.getElementById("defenseModifier").value = modifiers.defense;
                    document.getElementById("vitalityModifier").value = modifiers.vitality;
                    document.getElementById("spiritModifier").value = modifiers.spirit;
                    document.getElementById("intelligenceModifier").value = modifiers.intelligence;
                    document.getElementById("staminaModifier").value = modifiers.stamina;
                    document.getElementById("animalModifier").value = modifiers.animal;
                    document.getElementById("weedModifier").value = modifiers.weed;
                    document.getElementById("cookingModifier").value = modifiers.cooking;
                    document.getElementById("handinessModifier").checked = modifiers.handiness;
                    document.getElementById("huntingModifier").checked = modifiers.hunting;
                    document.getElementById("climateModifier").checked = modifiers.climate;

                    // IndexedDB에 저장
                    await saveToIndexedDB("modifiers", "modifiersData", modifiers);

                    alert("보정치를 불러오고 IndexedDB에 반영했습니다!");
                } catch (error) {
                    alert("파일 형식이 잘못되었습니다.");
                    console.error(error);
                }
            };
            reader.readAsText(file);
        });

        fileInput.click();
    });
});

