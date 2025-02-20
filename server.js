const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'HTML')));

// 기본 라우트 설정
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', 'index.html'));
});

// 서버 실행
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
