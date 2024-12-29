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


const DB_NAME = "HungerGameCharacterData";
const DB_DETAILS_NAME = "HungerGameCharDetailsData";
const DB_VERSION = 1;

// IndexedDB 초기화 함수
function initIndexedDB(dbName, storeName, keyPath = "id") {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}


async function initializeIndexedDB(dbName, storeName, initialData) {
    const db = await initIndexedDB(dbName, storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        initialData.forEach(data => {
            store.put(data); // 데이터를 저장
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

async function saveToIndexedDB(dbName, storeName, data) {
    const db = await initIndexedDB(dbName, storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        // 데이터를 저장
        data.forEach(item => store.put(item));

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

async function loadCharacterDetails() {
    try {
        // IndexedDB에서 데이터 로드
        const loadedData = await loadFromIndexedDB(DB_DETAILS_NAME, "charDetails");
        console.log("IndexedDB에서 로드된 데이터:", loadedData);

        const tbody = document.querySelector("#characterTable tbody");
        tbody.innerHTML = ""; // 기존 테이블 초기화

        // 데이터를 순회하며 테이블에 추가
        loadedData.forEach(({ physique, attributes, hasResetButton }) => {
            const row = document.createElement("tr");

            // 체격
            const physiqueCell = createDropdownCell(["작음", "중간", "큼"], physique || "중간");
            row.appendChild(physiqueCell);

            // 능력치
            attributes.forEach(attr => {
                const attrCell = createDropdownCell(["상", "중", "하"], attr || "중");
                row.appendChild(attrCell);
            });

            // 초기화 버튼
            if (hasResetButton) {
                const resetCell = document.createElement("td");
                const resetButton = document.createElement("button");
                resetButton.textContent = "초기화";
                resetButton.addEventListener("click", () => {
                    row.querySelectorAll("select").forEach((select, idx) => {
                        if (idx === 0) {
                            select.value = "중간"; // 체격 초기화
                        } else {
                            select.value = "중"; // 능력치 초기화
                        }
                    });
                });
                resetCell.appendChild(resetButton);
                row.appendChild(resetCell);
            }

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}



async function loadCharactersFromIndexedDB(dbName = "HungerGameCharacterData", storeName = "characters") {
    const db = await initIndexedDB(dbName, storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const data = request.result || [];
            console.log("IndexedDB 데이터 로드 성공:", data); // 디버깅용
            resolve(data);
        };

        request.onerror = (event) => {
            console.error("IndexedDB 데이터 로드 오류:", event.target.error);
            reject(event.target.error);
        };
    });
}



async function loadFromIndexedDB(dbName, storeName) {
    const db = await initIndexedDB(dbName, storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll(); // 모든 데이터를 가져옴

        request.onsuccess = (event) => resolve(request.result || []);
        request.onerror = (event) => reject(request.error);
    });
}



// IndexedDB 데이터 저장 함수
async function saveCharactersToIndexedDB() {
    const characters = [];
    document.querySelectorAll(".characterRowContainer2").forEach((container, index) => {
        const name = container.querySelector(".textChar").value;
        const gender = container.querySelector(".gender").value;
        const imageSrc = container.querySelector(".previewImage").src || "";

        characters.push({ id: index, name, gender, imageSrc });
    });

    try {
        const db = await initIndexedDB();
        const transaction = db.transaction("characters", "readwrite");
        const store = transaction.objectStore("characters");

        characters.forEach(character => {
            store.put(character);
        });

        transaction.oncomplete = () => console.log("IndexedDB에 캐릭터 데이터 저장 완료!");
        transaction.onerror = (event) => console.error("IndexedDB 저장 오류:", event.target.error);
    } catch (error) {
        console.error("IndexedDB 저장 중 오류 발생:", error);
    }
}



const saveButton = document.querySelector("#save h1");
const loadButton = document.querySelector("#load h1");


// 저장하기 버튼 이벤트
saveButton.addEventListener("click", async () => {
    const tableData = [];

    document.querySelectorAll("#characterTable tbody tr").forEach((row, index) => {
        const physique = row.querySelector("select").value; // 체격 정보
        const attributes = Array.from(row.querySelectorAll("select"))
            .slice(1) // 체격 제외
            .map(select => select.value); // 능력치 정보

        tableData.push({
            id: index, // 고유 ID 추가
            physique, // 체격 정보
            attributes, // 능력치 배열
            hasResetButton: true // 초기화 버튼 포함 여부
        });
    });

    console.log("저장될 데이터:", tableData); // 디버깅용

    try {
        await saveToIndexedDB(DB_DETAILS_NAME, "charDetails", tableData);

        const blob = new Blob([JSON.stringify(tableData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "HungerGameCharDetails.json";
        downloadLink.click();

        URL.revokeObjectURL(url);
        alert("데이터가 IndexedDB와 JSON 파일로 저장되었습니다!");
    } catch (error) {
        console.error("데이터 저장 중 오류 발생:", error);
    }
});

async function loadTableData() {
    try {
        const characterData = await loadFromIndexedDB("HungerGameCharacterData", "characters");
        const charDetails = await loadFromIndexedDB("HungerGameCharDetailsData", "charDetails");

        console.log("HungerGameCharacterData:", characterData);
        console.log("HungerGameCharDetailsData:", charDetails);

        if (!characterData || characterData.length === 0) {
            console.error("HungerGameCharacterData가 비어 있습니다.");
            return;
        }

        if (!charDetails || charDetails.length === 0) {
            console.error("HungerGameCharDetailsData가 비어 있습니다.");
            return;
        }

        // characterData의 'data' 필드에서 실제 데이터를 추출
        const characterArray = characterData[0]?.data || [];
        console.log("Character Array:", characterArray);

        const tbody = document.querySelector("#characterTable tbody");
        tbody.innerHTML = ""; // 기존 테이블 초기화

        characterArray.forEach((character) => {
            // charDetails에서 해당 ID의 상세 데이터를 찾기
            const detail = charDetails.find(detail => detail.id === character.id);

            const row = document.createElement("tr");

            // 이름
            const nameCell = document.createElement("td");
            nameCell.textContent = character.name || "이름 없음";
            row.appendChild(nameCell);

            // 성별
            const genderCell = document.createElement("td");
            const gender = character.gender === "여" ? "여"
                          : character.gender === "남" ? "남"
                          : "무성";
            genderCell.textContent = gender || "무성";
            row.appendChild(genderCell);

            // 이미지
            const imageCell = document.createElement("td");
            const img = document.createElement("img");
            img.src = character.imageSrc || "default_image.png";
            img.alt = `${character.name || "이미지 없음"} 이미지`;
            img.style.width = "100px";
            img.style.height = "100px";
            img.style.objectFit = "cover";
            imageCell.appendChild(img);
            row.appendChild(imageCell);

            // 체격
            const physiqueCell = createDropdownCell(["작음", "중간", "큼"], detail?.physique || "중간");
            row.appendChild(physiqueCell);

            // 능력치
            (detail?.attributes || ["중", "중", "중", "중", "중", "중", "중"]).forEach(attr => {
                const attrCell = createDropdownCell(["상", "중", "하"], attr || "중");
                row.appendChild(attrCell);
            });

            // 초기화 버튼
            const resetCell = document.createElement("td");
            const resetButton = document.createElement("button");
            resetButton.textContent = "초기화";
            resetButton.addEventListener("click", () => {
                row.querySelectorAll("select").forEach((select, idx) => {
                    if (idx === 0) {
                        select.value = "중간"; // 체격 초기화
                    } else {
                        select.value = "중"; // 능력치 초기화
                    }
                });
            });
            resetCell.appendChild(resetButton);
            row.appendChild(resetCell);

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}




loadButton.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const charDetails = JSON.parse(e.target.result);
                console.log("로드된 JSON 데이터:", charDetails);

                try {
                    const tbody = document.querySelector("#characterTable tbody");
                    tbody.innerHTML = ""; // 기존 테이블 초기화

                    // JSON 데이터를 순회하며 테이블 업데이트
                    charDetails.forEach(({ physique, attributes, hasResetButton }, index) => {
                        const row = document.createElement("tr");

                        // 체격
                        const physiqueCell = createDropdownCell(["작음", "중간", "큼"], physique || "중간");
                        row.appendChild(physiqueCell);

                        // 능력치
                        attributes.forEach(attr => {
                            const attrCell = createDropdownCell(["상", "중", "하"], attr || "중");
                            row.appendChild(attrCell);
                        });

                        // 초기화 버튼
                        if (hasResetButton) {
                            const resetCell = document.createElement("td");
                            const resetButton = document.createElement("button");
                            resetButton.textContent = "초기화";
                            resetButton.addEventListener("click", () => {
                                row.querySelectorAll("select").forEach((select, idx) => {
                                    if (idx === 0) {
                                        select.value = "중간"; // 체격 초기화
                                    } else {
                                        select.value = "중"; // 능력치 초기화
                                    }
                                });
                            });
                            resetCell.appendChild(resetButton);
                            row.appendChild(resetCell);
                        }

                        tbody.appendChild(row);
                    });

                } catch (error) {
                    console.error("JSON 데이터 처리 중 오류 발생:", error);
                }
            };

            reader.readAsText(file);
        }
    });

    fileInput.click();
});


document.addEventListener("DOMContentLoaded", () => {
    loadCharacterDetails();
    loadTableData();
});



// 드롭다운 셀 생성 함수 (기존 코드 활용)
function createDropdownCell(options, defaultValue) {
    const cell = document.createElement("td");
    const select = document.createElement("select");

    options.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        if (option === defaultValue) {
            opt.selected = true; // 기본값 설정
        }
        select.appendChild(opt);
    });

    cell.appendChild(select);
    return cell;
}
