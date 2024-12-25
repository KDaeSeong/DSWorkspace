// window.open
const openLogin = document.getElementById("openLogin");
const openSignIn = document.getElementById("openSignIn");

// 새 탭으로 열기
openLogin.addEventListener("click", function () {
    if (openLogin.innerText.trim() === "로그인") {
        window.open("헝거게임로그인.html", "_blank", "width=400, height=400, left=100, top=150");
    } else if (openLogin.innerText.trim() === "내 정보") {
        window.open("헝거게임내정보.html", "_self");
    }
});

openSignIn.addEventListener("click", function () {
    if (openSignIn.innerText.trim() === "회원가입") {
        window.open("헝거게임회원가입.html", "_blank", "width=1000, height=700, left=100, top=150");
    } else {
        localStorage.setItem("loginCheck", "false"); // 로그아웃 처리
        localStorage.setItem("loginID", "");
        window.open("헝거게임메인.html", "_self");
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
const DB_NAME = "HungerGameCharacterData";
const DB_VERSION = 4;

// IndexedDB 초기화
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("characters")) {
                db.createObjectStore("characters", { keyPath: "id" });
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

async function saveCharactersToIndexedDB() {
    const characters = [];
    document.querySelectorAll(".characterRowContainer2").forEach((container) => {
        const name = container.querySelector(".textChar").value;
        const gender = container.querySelector(".gender").value;
        const imageSrc = container.querySelector(".previewImage").src || "";

        characters.push({ name, gender, imageSrc });
    });

    try {
        await saveToIndexedDB("characters", "charactersData", characters);
        console.log("IndexedDB에 캐릭터 데이터 저장 완료!");
    } catch (error) {
        console.error("캐릭터 데이터를 IndexedDB에 저장하는 중 오류 발생:", error);
    }
}




document.addEventListener("DOMContentLoaded", () => {
    const loginCheck = localStorage.getItem('loginCheck') === "true";
    if (loginCheck) {
        document.getElementById("openLogin").innerHTML = "내 정보";
        document.getElementById("openSignIn").innerText = "로그아웃";
        document.getElementById("login").style.cursor = "pointer";
    } else {
        document.getElementById("openLogin").innerText = "로그인";
        document.getElementById("openSignIn").innerText = "회원가입";
        document.getElementById("login").style.cursor = "pointer";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const addCharButton = document.getElementById("addChar");
    const addCharContainer = document.getElementById("characterRowContainer");
    const saveButton = document.querySelector("#saveBtn #save a");
    const loadButton = document.querySelector("#saveBtn #load a");

    // 캐릭터 추가 버튼 클릭 이벤트
    addCharButton.addEventListener("click", () => {
        addCharacter("", "M", "");
        saveCharactersToIndexedDB(); // 캐릭터 추가 후 즉시 IndexedDB에 저장
    });
    
    // 캐릭터 추가 함수
    function addCharacter(name = "", gender = "M", imageSrc = "") {
        const contentDiv = document.createElement("div");
        contentDiv.classList.add("characterRowContainer2");
    
        contentDiv.innerHTML = `
            <div class="characterRow">
                <button type="button" class="deleteChar">캐릭터 삭제</button>
                <button type="button" class="addImage">이미지 추가</button>
                <button type="button" class="deleteImage">이미지 삭제</button>
                <label>이름: <input type="text" class="textChar" value="${name}"></label>
                <label>성별:
                    <select name="genderCheck" class="gender">
                        <option value="M" ${gender === "M" ? "selected" : ""}>남</option>
                        <option value="F" ${gender === "F" ? "selected" : ""}>여</option>
                        <option value="N" ${gender === "N" ? "selected" : ""}>무성</option>
                    </select>
                </label>
            </div>
            <img class="previewImage" src="${imageSrc}" alt="이미지 미리보기" style="display:${imageSrc ? "block" : "none"};">
        `;
    
        addCharContainer.appendChild(contentDiv);
    }

    // 이벤트 위임으로 이미지 추가 및 삭제, 캐릭터 삭제 관리
    addCharContainer.addEventListener("click", async (event) => {
        const target = event.target;
    
        if (target.classList.contains("addImage")) {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
    
            fileInput.addEventListener("change", () => {
                const file = fileInput.files[0];
                if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewImage = target.closest(".characterRowContainer2").querySelector(".previewImage");
                        previewImage.src = e.target.result;
                        previewImage.style.display = "block";
                        saveCharactersToIndexedDB(); // 변경 사항 저장
                    };
                    reader.readAsDataURL(file);
                }
            });
    
            fileInput.click();
        }
    
        if (target.classList.contains("deleteImage")) {
            const previewImage = target.closest(".characterRowContainer2").querySelector(".previewImage");
            previewImage.src = "";
            previewImage.style.display = "none";
            saveCharactersToIndexedDB(); // 변경 사항 저장
        }
    
        if (target.classList.contains("deleteChar")) {
            const charContainer = target.closest(".characterRowContainer2");
            if (charContainer) {
                charContainer.remove();
                saveCharactersToIndexedDB(); // 캐릭터 삭제 후 저장
            }
        }
    });
    
    // 캐릭터 이름 및 성별 변경 감지
    addCharContainer.addEventListener("input", (event) => {
        if (event.target.matches(".textChar") || event.target.matches(".gender")) {
            saveCharactersToIndexedDB(); // 변경 사항 저장
        }
    });
    

    // JSON 파일 불러오기 및 즉시 저장
    loadButton.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";

        fileInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const characters = JSON.parse(e.target.result);

                    addCharContainer.innerHTML = "";

                    characters.forEach((char) => {
                        addCharacter(char.name, char.gender, char.imageSrc);
                    });

                    await saveToIndexedDB("characters", "charactersData", characters);
                    alert("캐릭터를 불러오고 IndexedDB에 저장했습니다!");
                };
                reader.readAsText(file);
            }
        });

        fileInput.click();
    });

    // IndexedDB에서 캐릭터 데이터를 JSON 파일로 저장
    saveButton.addEventListener("click", async () => {
        const characters = [];
        document.querySelectorAll(".characterRowContainer2").forEach((container) => {
            const name = container.querySelector(".textChar").value;
            const gender = container.querySelector(".gender").value;
            const imageSrc = container.querySelector(".previewImage").src || "";
    
            characters.push({ name, gender, imageSrc });
        });
    
        const blob = new Blob([JSON.stringify(characters, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
    
        const a = document.createElement("a");
        a.href = url;
        a.download = "characters.json";
        a.click();
    
        URL.revokeObjectURL(url);
        alert("캐릭터 데이터를 JSON 파일로 저장했습니다!");
    });

    // 페이지 로드 시 IndexedDB에서 캐릭터 데이터 불러오기
    (async () => {
        const characters = await loadFromIndexedDB("characters", "charactersData");

        if (characters) {
            characters.forEach((char) => {
                addCharacter(char.name, char.gender, char.imageSrc);
            });
        }
    })();
});

