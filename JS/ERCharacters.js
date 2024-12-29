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
const DB_NAME = "HungerGameCharacterData";
const DB_VERSION = 1;

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
    try {
        const db = await initIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = (event) => {
                console.log("IndexedDB 데이터 불러오기 성공:", request.result);
                resolve(request.result?.data || []);
            };
            request.onerror = (event) => {
                console.error("IndexedDB 데이터 불러오기 오류:", request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error("loadFromIndexedDB 함수 오류:", error);
        throw error;
    }
}


async function saveCharactersToIndexedDB() {
    const characters = [];
    document.querySelectorAll(".characterRowContainer2").forEach((container, index) => {
        const name = container.querySelector(".textChar").value;
        const gender = container.querySelector(".gender").value;
        const imageSrc = container.querySelector(".previewImage").src || "";

        characters.push({ id: index, name, gender, imageSrc });
    });

    try {
        // 1. 캐릭터 데이터를 저장
        await saveToIndexedDB("characters", "charactersData", characters);
        console.log("IndexedDB에 캐릭터 데이터 저장 완료!");

        // 2. CharDetails에 기본 데이터 추가
        const defaultDetails = characters.map(character => ({
            id: character.id, // 동일한 ID로 매핑
            physique: "중간", // 기본 체격
            attributes: Array(7).fill("중"), // 7개의 능력치 기본값
            hasResetButton: true // 초기화 버튼 포함 여부
        }));

        await saveToIndexedDB("charDetails", "charDetailsData", defaultDetails);
        console.log("HungerGameCharDetailsData에 기본 데이터 추가 완료!");

    } catch (error) {
        console.error("데이터 저장 중 오류 발생:", error);
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
        addCharacter("", "남", "");
        saveCharactersToIndexedDB(); // 캐릭터 추가 후 즉시 IndexedDB에 저장
    });
    
    // 캐릭터 추가 함수
    

        

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
                    try {
                        const characters = JSON.parse(e.target.result);
    
                        if (Array.isArray(characters)) {
                            // IndexedDB에 데이터 저장
                            await saveToIndexedDB("characters", "charactersData", characters);
    
                            // UI 업데이트
                            const addCharContainer = document.getElementById("characterRowContainer");
                            addCharContainer.innerHTML = "";
    
                            characters.forEach(({ id, name, gender, imageSrc }) => {
                                addCharacter(name, gender, imageSrc);
                            });
    
                            alert("JSON 데이터를 불러오고 IndexedDB에 저장했습니다!");
                        } else {
                            alert("잘못된 JSON 데이터 형식입니다.");
                        }
                    } catch (error) {
                        console.error("JSON 파일 불러오기 중 오류 발생:", error);
                    }
                };
                reader.readAsText(file);
            }
        });
    
        fileInput.click();
    });
    

    // IndexedDB에서 캐릭터 데이터를 JSON 파일로 저장
    saveButton.addEventListener("click", async () => {
        try {
            const characters = await loadFromIndexedDB("characters", "charactersData");
            if (characters) {
                const blob = new Blob([JSON.stringify(characters, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
    
                const downloadLink = document.createElement("a");
                downloadLink.href = url;
                downloadLink.download = "characters.json"; // 저장 파일 이름
                downloadLink.click();
    
                URL.revokeObjectURL(url);
                alert("IndexedDB 데이터를 JSON 파일로 저장했습니다!");
            } else {
                alert("저장할 데이터가 없습니다.");
            }
        } catch (error) {
            console.error("JSON 파일 저장 중 오류 발생:", error);
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // IndexedDB에서 데이터 로드
        const characters = await loadFromIndexedDB("characters", "charactersData");
        console.log("로드된 데이터:", characters);

        const characterRowContainer = document.getElementById("characterRowContainer");

        if (!characterRowContainer) {
            console.error("#characterRowContainer 요소를 찾을 수 없습니다.");
            return;
        }

        if (characters && characters.length > 0) {
            characterRowContainer.innerHTML = ""; // 기존 콘텐츠 초기화

            characters.forEach(({ name, gender, imageSrc }) => {
                // HTML 양식에 맞게 캐릭터 데이터 추가
                const contentDiv = document.createElement("div");
                contentDiv.classList.add("characterRowContainer2");

                contentDiv.innerHTML = `
                    <div class="characterRow">
                        <button type="button" class="deleteChar">캐릭터 삭제</button>
                        <button type="button" class="addImage">이미지 추가</button>
                        <button type="button" class="deleteImage">이미지 삭제</button>
                        이름: <input type="text" class="textChar" value="${name || ''}">
                        성별: <select name="genderCheck" class="gender">
                            <option value="남" ${gender === "남" ? "selected" : ""}>남</option>
                            <option value="여" ${gender === "여" ? "selected" : ""}>여</option>
                            <option value="무성" ${gender === "무성" ? "selected" : ""}>무성</option>
                        </select>
                    </div>
                    <img class="previewImage" src="${imageSrc || 'default_image.png'}" alt="${name || '이미지 없음'}" style="display:block; width:220px; height:220px; margin-left:10px;">
                `;

                characterRowContainer.appendChild(contentDiv);
            });

            console.log("IndexedDB 데이터를 성공적으로 로드하고 출력했습니다.");
        } else {
            console.log("IndexedDB에 저장된 데이터가 없습니다.");
        }
    } catch (error) {
        console.error("데이터 로드 및 출력 중 오류 발생:", error);
    }
});





function addCharacter(name = "", gender = "남", imageSrc = "") {
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
                    <option value="남" ${gender === "남" ? "selected" : ""}>남</option>
                    <option value="여" ${gender === "여" ? "selected" : ""}>여</option>
                    <option value="무성" ${gender === "무성" ? "selected" : ""}>무성</option>
                </select>
            </label>
        </div>
        <img class="previewImage" src="${imageSrc}" alt="이미지 미리보기" style="display:${imageSrc ? "block" : "none"};">
    `;

    document.getElementById("characterRowContainer").appendChild(contentDiv);
}