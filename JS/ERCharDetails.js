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
const DB_VERSION = 1; // 버전을 증가시켜 onupgradeneeded 트리거


// IndexedDB 초기화 함수
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 오브젝트 스토어가 없으면 생성
            if (!db.objectStoreNames.contains("characters")) {
                db.createObjectStore("characters", { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}


// IndexedDB 데이터 저장 함수
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

// IndexedDB에서 데이터 로드
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


const DB_DETAILS_NAME = "HungerGameCharDetailsData";
const DB_DETAILS_VERSION = 1;

// IndexedDB 초기화 함수
function initCharDetailsDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_DETAILS_NAME, DB_DETAILS_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 오브젝트 스토어가 없으면 생성
            if (!db.objectStoreNames.contains("charDetails")) {
                db.createObjectStore("charDetails", { keyPath: "id" }); // 키로 id 사용
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// IndexedDB 데이터 저장 함수
async function saveCharDetailsToDB(data) {
    const db = await initCharDetailsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("charDetails", "readwrite");
        const store = transaction.objectStore("charDetails");
        store.put(data);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

// IndexedDB 데이터 로드 함수
async function loadCharDetailsFromDB() {
    const db = await initCharDetailsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("charDetails", "readonly");
        const store = transaction.objectStore("charDetails");
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}


const saveButton = document.querySelector("#save h1");
const loadButton = document.querySelector("#load h1");


// 저장하기 버튼 이벤트
saveButton.addEventListener("click", async () => {
    const tableData = [];
    document.querySelectorAll("#characterTable tbody tr").forEach((row, index) => {
        const name = row.children[0].textContent;

        // 체격 select 값 읽기
        const physiqueSelect = row.children[3].querySelector("select");
        const physique = physiqueSelect ? physiqueSelect.value : "중간";

        // 나머지 능력치 select 값 읽기
        const attributes = Array.from(row.querySelectorAll("select"))
            .slice(1) // 체격 이후의 능력치만
            .map((select) => (select ? select.value : "중"));

        tableData.push({
            id: index, // 각 캐릭터의 고유 ID로 행 인덱스 사용
            name,
            physique,
            attributes,
        });
    });

    // IndexedDB에 저장
    for (const data of tableData) {
        await saveCharDetailsToDB(data);
    }

    // JSON으로 저장
    const jsonBlob = new Blob([JSON.stringify(tableData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(jsonBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "HungerGameCharDetails.json"; // 다운로드 파일 이름
    downloadLink.click();

    URL.revokeObjectURL(url); // URL 해제

    alert("테이블 데이터가 저장되고 JSON 파일로 다운로드되었습니다!");
});





// 불러오기 버튼 이벤트
loadButton.addEventListener("click", async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const charDetails = JSON.parse(e.target.result);

                // HungerGameCharacters 데이터 로드
                const characters = await loadFromIndexedDB("characters", "charactersData");

                const tbody = document.querySelector("#characterTable tbody");
                tbody.innerHTML = ""; // 기존 테이블 비우기

                charDetails.forEach((detail, index) => {
                    const character = characters ? characters[index] : null;

                    const row = document.createElement("tr");

                    // 이름
                    const nameCell = document.createElement("td");
                    nameCell.textContent = detail.name;
                    row.appendChild(nameCell);

                    // 성별
                    const genderCell = document.createElement("td");
                    genderCell.textContent = character && character.gender === "F" ? "여" : "남";
                    row.appendChild(genderCell);

                    // 이미지
                    const imageCell = document.createElement("td");
                    const img = document.createElement("img");
                    img.src = character ? character.imageSrc : "default_image.png"; // 기본 이미지 처리
                    img.alt = `${detail.name} 이미지`;
                    imageCell.appendChild(img);
                    row.appendChild(imageCell);

                    // 체격
                    const physiqueCell = createDropdownCell(["작음", "중간", "큼"], detail.physique || "중간");
                    row.appendChild(physiqueCell);

                    // 나머지 능력치
                    detail.attributes.forEach((attr) => {
                        const cell = createDropdownCell(["상", "중", "하"], attr || "중");
                        row.appendChild(cell);
                    });

                    // 초기화 버튼
                    const resetCell = document.createElement("td");
                    const resetButton = document.createElement("button");
                    resetButton.textContent = "초기화";
                    resetButton.addEventListener("click", () => {
                        // 드롭다운 초기화
                        row.querySelectorAll("select").forEach((select, idx) => {
                            if (idx === 0) {
                                select.value = "중간"; // 체격 초기화
                            } else {
                                select.value = "중"; // 나머지 능력치 초기화
                            }
                        });
                    });
                    resetCell.appendChild(resetButton);
                    row.appendChild(resetCell);

                    tbody.appendChild(row);

                    // IndexedDB에 저장
                    const charData = {
                        id: index,
                        name: detail.name,
                        physique: detail.physique || "중간",
                        attributes: detail.attributes || [],
                    };
                    saveCharDetailsToDB(charData);
                });

                alert("JSON 데이터를 불러오고 테이블을 갱신했습니다!");
            };
            reader.readAsText(file);
        }
    });

    fileInput.click();
});



// DOMContentLoaded 이벤트
document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.querySelector("#characterTable tbody");

    // IndexedDB에서 데이터 로드
    const characters = await loadFromIndexedDB("characters", "charactersData"); // HungerGameCharacterData에서 로드
    const charDetails = await loadCharDetailsFromDB(); // HungerGameCharDetailsData에서 로드

    if (characters && characters.length > 0) {
        characters.forEach((character, index) => {
            const row = document.createElement("tr");

            // 이름
            const nameCell = document.createElement("td");
            const detail = charDetails.find((detail) => detail.id === index);
            nameCell.textContent = detail ? detail.name : character.name;
            row.appendChild(nameCell);

            // 성별
            const genderCell = document.createElement("td");
            genderCell.textContent = character.gender === "F" ? "여" : "남";
            row.appendChild(genderCell);

            // 이미지
            const imageCell = document.createElement("td");
            const img = document.createElement("img");
            img.src = character.imageSrc;
            img.alt = `${character.name} 이미지`;
            imageCell.appendChild(img);
            row.appendChild(imageCell);

            // 체격
            const physiqueCell = createDropdownCell(
                ["작음", "중간", "큼"],
                detail ? detail.physique : "중간"
            );
            row.appendChild(physiqueCell);

            // 나머지 능력치
            ["힘", "민첩성", "손재주", "손놀림", "지략", "사격", "지구력"].forEach((attr, attrIndex) => {
                const cell = createDropdownCell(
                    ["상", "중", "하"],
                    detail && detail.attributes[attrIndex] ? detail.attributes[attrIndex] : "중"
                );
                row.appendChild(cell);
            });

            // 초기화 버튼
            const resetCell = document.createElement("td");
            const resetButton = document.createElement("button");
            resetButton.textContent = "초기화";
            resetButton.addEventListener("click", () => {
                // 드롭다운 초기화
                row.querySelectorAll("select").forEach((select, index) => {
                    if (index === 0) {
                        // 첫 번째 드롭다운 (체격) 초기화
                        select.value = "중간";
                    } else {
                        // 나머지 드롭다운 (능력치) 초기화
                        select.value = "중";
                    }
                });
            });
            resetCell.appendChild(resetButton);
            row.appendChild(resetCell);

            tbody.appendChild(row);
        });
    } else {
        console.warn("IndexedDB에서 데이터를 가져올 수 없습니다.");
    }
});


// 드롭다운 셀 생성 함수
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
