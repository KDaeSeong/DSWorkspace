/* 아이디 : 값이 변했을 때 
영어 소문자로 시작하고, 
영어 대/소문자, 숫자, - , _ 로만 이루어진 6~14 글자 사이 문자열인지 검사
아이디 정규표현식 : (각자 작성)

- 형식이 일치할 경우
입력창의 배경색을 green 으로 변경

- 형식이 일치하지 않은 경우
입력창의 배경색을 red, 글자색을 white 로 변경*/


document.getElementById("id").addEventListener("keyup", function(){

    // const regExp = /^[a-z]([a-z]|[A-Z]|\d|-|_){5,13}$/;
    const regExp = /^[a-z]([a-z]|[A-Z]|\d|-|_]){5,13}$/;
    if(this.value == ''){
        this.style.backgroundColor = "white";
        this.style.color = "black";
        return;
    }
    if (regExp.test(this.value)){
        this.style.backgroundColor = "green";
        this.style.color = "white";
    } else {
        this.style.backgroundColor = "red";
        this.style.color = "white";
    }

});


document.getElementById("idDuplicate").addEventListener("click", function() {
    const id = document.getElementById("id");
    if (id.value === '') {
        alert("아이디를 입력해주세요.");
        return;
    }

    const transaction = db.transaction(["users"], "readonly");
    const store = transaction.objectStore("users");
    const request = store.get(id.value);

    request.onsuccess = function(event) {
        if (event.target.result) {
            alert("이미 존재하는 아이디입니다. 다른 아이디를 입력하세요.");
            id.style.backgroundColor = "white";
            id.style.color = "black";
            id.value = '';
        } else {
            alert("사용할 수 있는 아이디입니다.");
        }
    };

    request.onerror = function(event) {
        console.error("Error checking ID duplicate:", event.target.errorCode);
        alert("아이디 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.");
    };
});


// ------------------------------------------------------------------

/* 비밀번호, 비밀번호 확인 : 키보드가 올라올 때 
"비밀번호" 를 미입력한 상태에서 "비밀번호 확인"을 작성할 경우
"비밀번호 확인"에 작성된 내용을 모두 삭제하고
'비밀번호를 입력해주세요' 경고창 출력 후
focus 를 "비밀번호" 입력창으로 이동
*/


document.getElementById("pw2").addEventListener("keyup", function(){
    const pw = document.getElementById("pw");
    const checkPw = document.getElementById("checkPw");
    if(pw.value === ''){
        alert("비밀번호를 입력해주세요");
        this.value = "";
        pw.focus();
        checkPw.innerHTML = "";
        return;
    }
    if (pw.value == this.value && pw.value != ''){
        checkPw.innerHTML = "비밀번호 일치";
        checkPw.style.color = "green";
    } else if (pw.value != this.value && pw.value != ''){
        checkPw.innerHTML = "비밀번호 불일치";
        checkPw.style.color = "red";
    }
});

// ------------------------------------------------------------------

/*
- 비밀번호가 일치할 경우
"비밀번호" 입력창 오른쪽에 "비밀번호 일치" 글자를 초록색으로 출력.

- 비밀번호가 일치하지 않을 경우
"비밀번호" 입력창 오른쪽에 "비밀번호가 불일치" 글자를 빨간색으로 출력

- 비밀번호가 작성되지 않은경우 오른쪽에 출력되는 문구 삭제

*/

document.getElementById("pw").addEventListener("keyup", function(){
    const pw2 = document.getElementById("pw2");
    const checkPw = document.getElementById("checkPw");
    if(pw2.value == '' && this.value == ''){
        checkPw.innerHTML = "";
    }
    if(this.value == '' && pw2.value != ''){
        alert("비밀번호를 입력해주세요");
        pw2.value = "";
        this.focus();
        checkPw.innerHTML = "";
        return;
    }
    if (pw2.value == this.value && this.value != ''){
        checkPw.innerHTML = "비밀번호 일치";
        checkPw.style.color = "green";
    } else if (pw2.value != this.value && this.value != '' && pw2.value != ''){
        checkPw.innerHTML = "비밀번호 불일치";
        checkPw.style.color = "red";
    }
});

// -------------------------------------------------------------

/* 이름 : 값이 변화했을 때 
한글 2~5 글자 사이 문자열인지 검사.
- 형식이 일치할 경우
"이름" 입력창 오른쪽에 "정상입력" 글자를 초록색으로 출력.
- 형식이 불일치할 경우
"이름" 입력창 오른쪽에 "한글만 입력하세요" 글자를 빨간색으로 출력.
*/

document.getElementById("userName").addEventListener("keyup", function(){
    const checkName = document.getElementById("checkName");
    const regExp = /^[가-힣]{2,5}$/;
    if(this.value == ''){
        checkName.innerText = "";
        return;
    }
    if (regExp.test(this.value)){
        checkName.innerText = "정상입력";
        checkName.style.color = "green";
    } else {
        checkName.innerText = "한글만 입력하세요";
        checkName.style.color = "red";
    }
});

document.getElementById("searchAddress").addEventListener("click", (event) => {
    // 기본 동작 막기
    event.preventDefault();

    // 카카오 주소 검색 팝업 열기
    new daum.Postcode({
        oncomplete: function (data) {
            // 선택한 주소의 정보 받아오기
            const fullAddress = data.address; // 사용자가 선택한 주소
            const extraAddress = data.bname || ""; // 법정동/행정동 정보 (있다면 추가)
            const resultAddress = fullAddress + (extraAddress ? ` (${extraAddress})` : "");

            // 주소를 결과 영역에 표시
            const addressResult = document.getElementById("addressResult");
            addressResult.textContent = resultAddress;
        }
    }).open();
});



// -----------------------------------------------------------

/* 회원가입 버튼 클릭 시 : validate() 함수를 호출하여 
성별이 선택 되었는지, 전화번호가 형식에 알맞게 작성되었는지 검사 */
// IndexedDB 설정

let db;
const request = indexedDB.open("HungerGameUserDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Database opened successfully");
};

request.onerror = function (event) {
    console.error("Database error:", event.target.errorCode);
};

document.getElementById("myForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!document.getElementById("male").checked && !document.getElementById("female").checked) {
        alert("성별을 선택해주세요.");
        return false;
    }

    const phoneCheck = document.getElementById("phone");
    const phoneRegExp = /^([010]|[02]|[0]\d\d)-\d{4}-\d{4}$/;
    if (phoneCheck.value === "") {
        alert("전화번호를 입력해주세요.");
        return false;
    }
    if (!phoneRegExp.test(phoneCheck.value)) {
        alert("전화번호의 형식이 올바르지 않습니다.");
        return false;
    }

    const emailCheck = document.getElementById("email");
    const emailRegExp = /^[a-z][a-z\d]{2,}@[a-z\d]{2,}.([a-z\d]{2,}|[a-z\d]{2,}.[a-z\d]{2,})$/;
    if (!emailRegExp.test(emailCheck.value)) {
        alert("이메일 형식이 올바르지 않습니다.");
        return false;
    }

    const id = document.getElementById("id").value;
    const name = document.getElementById("userName").value;
    const age = document.getElementById("age").value;
    const address = document.getElementById("addressResult").textContent;
    const phone = document.getElementById("phone").value;
    const email = document.getElementById("email").value;
    const gender = document.getElementById("male").checked ? "남" : "여";
    const hobbies = Array.from(document.querySelectorAll("input[name='hobby']:checked"))
        .map(hobby => hobby.nextSibling.textContent.trim());
    const jobSelect = document.getElementById("jobSelect");
    const job = jobSelect.options[jobSelect.selectedIndex].text;
    const pwValue = document.getElementById("pw").value;
    const extraAdd = document.getElementById("extraAdd").value;

    const resultAddress = extraAdd ? `${address} ${extraAdd}` : address;

    if (pwValue === "") {
        alert("비밀번호를 입력해주세요");
        document.getElementById("pw").focus();
        return false;
    }

    const hashedPw = hashPassword(pwValue);

    const checkName = document.getElementById("checkName");
    if (name === "") {
        alert("이름을 입력해주세요.");
        return false;
    }
    if (checkName.innerText === "한글만 입력하세요") {
        alert("이름을 한글로 입력해주세요.");
        return false;
    }

    // 사용자 정보 객체 생성
    const userData = {
        id,
        name,
        age,
        address: resultAddress,
        phone,
        email,
        gender,
        hobbies,
        job,
        password: hashedPw,
    };

    // IndexedDB에 데이터 추가
    const transaction = db.transaction(["users"], "readwrite");
    const store = transaction.objectStore("users");
    const request = store.get(id);

    request.onsuccess = function (event) {
        if (event.target.result) {
            alert("이미 존재하는 아이디입니다. 다른 아이디를 입력하세요.");
            document.getElementById("id").style.backgroundColor = "white";
            document.getElementById("id").style.color = "black";
            document.getElementById("id").value = '';
            return false;
        } else {
            const addRequest = store.add(userData);
            addRequest.onsuccess = function () {
                alert("회원가입이 완료되었습니다!");
                if (window.opener) {
                    opener.location.reload();
                }
                window.close();
            };

            addRequest.onerror = function (event) {
                console.error("Error adding user:", event.target.errorCode);
                alert("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
            };
        }
    };

    request.onerror = function (event) {
        console.error("Error fetching user:", event.target.errorCode);
        alert("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    };
});

function hashPassword(password) {
    return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

document.getElementById("resetBtn").addEventListener("click", function () {
    const checkName = document.getElementById("checkName");
    const checkPw = document.getElementById("checkPw");
    const idCheck = document.getElementById("id");
    const address = document.getElementById("addressResult");
    const hobbies = Array.from(document.querySelectorAll("input[name='hobby']:checked"));
    for (let hobby of hobbies) {
        hobby.checked = false;
    }
    address.innerText = "";
    checkName.innerText = "";
    checkName.style.color = "black";
    checkPw.innerText = "";
    checkPw.style.color = "black";
    idCheck.style.backgroundColor = "white";
});




