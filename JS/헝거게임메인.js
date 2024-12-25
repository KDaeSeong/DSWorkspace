const openLogin = document.getElementById("openLogin");
const openSignIn = document.getElementById("openSignIn");
const openFile = document.getElementById("openFile");
const printFile = document.getElementById("printFile");

// 조건에 따라 창 다르게 열기
openLogin.addEventListener("click", function () {
    if (openLogin.innerText.trim() === "로그인") {
        window.open("헝거게임로그인.html", "_blank", "width=500, height=500, left=100, top=150");
    } else if (openLogin.innerText.trim() === "내 정보") {
        window.open("헝거게임내정보.html", "_self");
    }
});

openSignIn.addEventListener("click", function () {
    if (openSignIn.innerText.trim() === "회원가입") {
        window.open("헝거게임회원가입.html", "_blank", "width=1000, height=870, left=100, top=120");
    } else {
        localStorage.setItem("loginCheck", "false"); // 로그아웃 처리
        localStorage.setItem("loginID", "");
        window.open("헝거게임메인.html", "_self");
        updateLoginState();
    }
});



// indexedDB 초기화
const DB_NAME = "HungerGameFiles";
const DB_VERSION = 2; // 기존 1에서 2로 업데이트


// IndexedDB 초기화
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
        
            if (!db.objectStoreNames.contains("uploadedFiles")) {
                db.createObjectStore("uploadedFiles", { keyPath: "id" }); // 파일 데이터 저장
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// json 데이터 저장 함수
async function saveToIndexedDB(id, data) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("uploadedFiles", "readwrite");
        const store = transaction.objectStore("uploadedFiles");
        store.put({ id, data });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// json 데이터 불러오기 함수
async function loadFromIndexedDB(id) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("uploadedFiles", "readonly");
        const store = transaction.objectStore("uploadedFiles");
        const request = store.get(id);

        request.onsuccess = (event) => resolve(event.target.result?.data || null);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveUserInfo(userId, userInfo) {
    try {
        const db = await initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("userInfo", "readwrite");
            const store = transaction.objectStore("userInfo");
            store.put({ id: userId, data: userInfo });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("saveUserInfo 실행 중 오류 발생:", error);
        throw error;
    }
}

async function loadUserInfo(userId) {
    try {
        const db = await initIndexedDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("userInfo", "readonly");
            const store = transaction.objectStore("userInfo");
            const request = store.get(userId);

            request.onsuccess = (event) => resolve(event.target.result?.data || null);
            request.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("loadUserInfo 실행 중 오류 발생:", error);
        throw error;
    }
}


// 파일 업로드 트리거
const triggerFileUpload = document.getElementById("triggerFileUpload");
triggerFileUpload.addEventListener("click", function(event) {
    event.preventDefault(); // 기본 링크 동작 방지
    openFile.click(); // 파일 입력창을 클릭
});

// 파일 업로드 및 IndexedDB에 저장
openFile.addEventListener("change", async function(event) {
    const file = event.target.files[0]; // 선택된 파일 가져오기
    if (!file) {
        alert("파일을 선택해주세요.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const importedData = JSON.parse(e.target.result); // 파일 내용을 JSON으로 변환
            if (!Array.isArray(importedData)) {
                throw new Error("JSON 데이터는 배열 형식이어야 합니다."); // JSON 형식 확인
            }

            // IndexedDB에 저장
            await saveUserInfo(importedData);

            alert("회원정보를 성공적으로 저장했습니다!");
        } catch (error) {
            alert("파일이 올바른 형식이 아닙니다."); // JSON 형식 오류 처리
            console.error(error);
        }
    };
    reader.readAsText(file); // 파일 읽기
});

// JSON 파일로 다운로드
printFile.addEventListener("click", async function() {
    try {
        const userList = await loadUserInfo(); // IndexedDB에서 데이터 불러오기
        if (!userList || userList.length === 0) {
            alert("내보낼 회원정보가 없습니다.");
            return;
        }

        const blob = new Blob([JSON.stringify(userList, null, 2)], { type: "application/json" }); // JSON 파일 생성
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "user_data.json";
        a.click();

        URL.revokeObjectURL(url);
        alert("회원정보를 성공적으로 내보냈습니다.");
    } catch (error) {
        alert("회원정보 내보내기 중 오류가 발생했습니다.");
        console.error(error);
    }
});

// 페이지 로드 시 IndexedDB에서 데이터 로드
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const userList = await loadUserInfo(); // IndexedDB에서 회원정보 불러오기
        if (userList) {
            console.log("회원정보를 성공적으로 불러왔습니다.", userList);
        } else {
            console.log("저장된 회원정보가 없습니다.");
        }
    } catch (error) {
        console.error("회원정보를 불러오는 중 오류가 발생했습니다.", error);
    }
});

// IndexedDB에 데이터 저장
async function saveUserInfo(data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("HungerGameUserDB", 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("users")) {
                db.createObjectStore("users", { keyPath: "id" });
            }
        };

        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(["users"], "readwrite");
            const store = transaction.objectStore("users");

            data.forEach(user => {
                store.put(user); // 사용자 데이터 저장
            });

            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onerror = function (event) {
                reject(event.target.error);
            };
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

// IndexedDB에서 데이터 불러오기
async function loadUserInfo() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("HungerGameUserDB", 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("users")) {
                db.createObjectStore("users", { keyPath: "id" });
            }
        };

        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(["users"], "readonly");
            const store = transaction.objectStore("users");

            const users = [];
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = function (event) {
                const cursor = event.target.result;
                if (cursor) {
                    users.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(users);
                }
            };

            cursorRequest.onerror = function (event) {
                reject(event.target.error);
            };
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

function updateLoginState() {
    const loginCheck = localStorage.getItem("loginCheck");
    if (loginCheck === "true") {
        openLogin.innerText = "내 정보";
        openSignIn.innerText = "로그아웃";
        document.getElementById("settingChar").style.display = "block";
        document.getElementById("settingEvent").style.display = "block";
        document.getElementById("settingModifier").style.display = "block";
        document.getElementById("settingChar").style.display = "flex";
        document.getElementById("settingEvent").style.display = "flex";
        document.getElementById("settingModifier").style.display = "flex";
    } else {
        openLogin.innerText = "로그인";
        openSignIn.innerText = "회원가입";
        document.getElementById("settingChar").style.display = "none";
        document.getElementById("settingEvent").style.display = "none";
        document.getElementById("settingModifier").style.display = "none";
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


// JSON 업로드 상태 체크를 위한 변수
let uploadedFiles = {
    characterJson: null,
    eventJson: null,
    modifierJson: null,
};

// 파일 읽기 함수
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

// 파일 업로드 버튼에 이벤트 추가
document.getElementById("uploadCharacterBtn").addEventListener("click", () => {
    document.getElementById("characterJson").click(); // 파일 선택창 열기
});

document.getElementById("uploadEventBtn").addEventListener("click", () => {
    document.getElementById("eventJson").click(); // 파일 선택창 열기
});

document.getElementById("uploadModifierBtn").addEventListener("click", () => {
    document.getElementById("modifierJson").click(); // 파일 선택창 열기
});

// 파일 변경 이벤트 처리
document.querySelectorAll("input[type='file']").forEach((input) => {
    input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert("파일을 선택하세요.");
            return;
        }

        // 파일 ID 매핑
        const id = event.target.id; // characterJson, eventJson, modifierJson

        try {
            const fileContent = await readFile(file);
            const data = JSON.parse(fileContent);

            // 파일별 데이터 검증
            if (id === "characterJson") {
                if (!Array.isArray(data) || !data.every((item) => item.gender && typeof item.gender === "string")) {
                    alert("올바른 캐릭터 JSON 파일이 아닙니다.");
                    clearFileInput(event.target);
                    return;
                }
            } else if (id === "eventJson") {
                if (!Array.isArray(data) || !data.every((item) => item.killer && typeof item.killer === "string")) {
                    alert("올바른 이벤트 JSON 파일이 아닙니다.");
                    clearFileInput(event.target);
                    return;
                }
            } else if (id === "modifierJson") {
                if (
                    typeof data !== "object" ||
                    data === null ||
                    !("handiness" in data) ||
                    typeof data.handiness !== "boolean"
                ) {
                    alert("올바른 보정치 JSON 파일이 아닙니다.");
                    clearFileInput(event.target);
                    return;
                }
            }

            // IndexedDB에 저장
            await saveToIndexedDB(id, data);

            alert(`${file.name} 데이터를 성공적으로 업로드했습니다.`);
        } catch (error) {
            alert("JSON 파일을 읽거나 처리하는 중 오류가 발생했습니다. 파일 형식을 확인하세요.");
            console.error(error);
            clearFileInput(event.target);
        }
    });
});

// 파일 입력 제거 함수
function clearFileInput(input) {
    input.value = ""; // 파일 입력값 초기화
    if (!input.value) {
        // 브라우저 호환성 확인
        input.type = ""; // 임시로 type 변경
        input.type = "file"; // 다시 파일 입력으로 설정
    }
}

// 스토어에 저장
async function restoreUploadedFiles() {
    try {
        const characterData = await loadFromIndexedDB("characterJson");
        const eventData = await loadFromIndexedDB("eventJson");
        const modifierData = await loadFromIndexedDB("modifierJson");

        if (characterData) {
            uploadedFiles.characterJson = characterData;
            document.getElementById("characterJson").previousElementSibling.textContent = "파일 업로드 완료";
        }

        if (eventData) {
            uploadedFiles.eventJson = eventData;
            document.getElementById("eventJson").previousElementSibling.textContent = "파일 업로드 완료";
        }

        if (modifierData) {
            uploadedFiles.modifierJson = modifierData;
            document.getElementById("modifierJson").previousElementSibling.textContent = "파일 업로드 완료";
        }

        console.log("IndexedDB에서 파일 데이터를 복원했습니다.");
    } catch (error) {
        console.error("IndexedDB에서 데이터를 복원하는 중 오류 발생:", error);
    }
}

// 페이지 로드 시 복원 호출
document.addEventListener("DOMContentLoaded", restoreUploadedFiles);


// 시작하기 버튼 클릭 시 데이터 검증 및 게임 화면으로 데이터 전달
document.getElementById("startGame").addEventListener("click", async () => {
    try {
        const characterData = uploadedFiles.characterJson;
        const eventData = uploadedFiles.eventJson;
        const modifierData = uploadedFiles.modifierJson;

        // JSON 데이터가 모두 로드되었는지 확인
        if (!characterData) {
            alert("캐릭터 JSON 파일이 업로드되지 않았습니다. 게임을 시작할 수 없습니다.");
            return;
        }
        if (!eventData) {
            alert("이벤트 JSON 파일이 업로드되지 않았습니다. 게임을 시작할 수 없습니다.");
            return;
        }
        if (!modifierData) {
            alert("보정치 JSON 파일이 업로드되지 않았습니다. 게임을 시작할 수 없습니다.");
            return;
        }

        alert("모든 JSON 데이터를 성공적으로 저장했습니다. 게임을 시작합니다!");
        window.location.href = "헝거게임게임화면.html";
    } catch (error) {
        alert("데이터 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
        console.error(error);
    }
});


