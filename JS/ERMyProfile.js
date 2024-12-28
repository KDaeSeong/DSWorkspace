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


function displayMyProfile() {
    const myProfileList = document.querySelector('.myProfileList');
    const loginId = localStorage.getItem("loginId"); // 로컬 스토리지에서 로그인 ID 가져오기

    // 디버깅 로그
    console.log('loginId:', loginId);

    if (!loginId) {
        myProfileList.innerHTML = '<p>로그인 ID가 없습니다. 다시 로그인 해주세요.</p>';
        return;
    }

    const request = indexedDB.open("HungerGameUserDB", 1);

    request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction(["users"], "readonly");
        const store = transaction.objectStore("users");
        const userRequest = store.get(loginId);

        userRequest.onsuccess = function (event) {
            const user = event.target.result;

            if (user) {
                // 이전 내용 제거
                myProfileList.innerHTML = '';

                const userDiv = document.createElement('div');
                userDiv.classList.add('user');

                const userInfo = `
                    <p><strong>이름:</strong> ${user.name}</p>
                    <p><strong>나이:</strong> ${user.age}</p>
                    <p><strong>성별:</strong> ${user.gender}</p>
                    <p><strong>주소:</strong> ${user.address}</p>
                    <p><strong>직업:</strong> ${user.job}</p>
                    <p><strong>취미:</strong> ${user.hobbies}</p>
                    <p><strong>전화번호:</strong> ${user.phone}</p>
                    <p><strong>이메일:</strong> ${user.email}</p>
                `;

                userDiv.innerHTML = userInfo;
                myProfileList.appendChild(userDiv);
            } else {
                myProfileList.innerHTML = '<p>로그인한 회원 정보를 찾을 수 없습니다.</p>'; // 사용자 정보 미발견
            }
        };

        userRequest.onerror = function (event) {
            console.error("Error fetching user data:", event.target.errorCode);
            myProfileList.innerHTML = '<p>회원 정보를 불러오는 중 오류가 발생했습니다.</p>';
        };
    };

    request.onerror = function (event) {
        console.error("Database error:", event.target.errorCode);
        myProfileList.innerHTML = '<p>데이터베이스를 열 수 없습니다.</p>';
    };
}

displayMyProfile();

