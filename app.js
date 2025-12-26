// --- Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCfUbKtJ1FjrJpz23NVl7eHwkGKEOltZ_M",
    authDomain: "full-of-zoey.firebaseapp.com",
    projectId: "full-of-zoey",
    storageBucket: "full-of-zoey.firebasestorage.app",
    messagingSenderId: "931073525138",
    appId: "1:931073525138:web:1491a28dc5f8b80385ad4b",
    measurementId: "G-ZZ8G837F8G"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
const appContainer = document.querySelector('.app-container');
const contentArea = document.getElementById('contentArea');
const authBtn = document.getElementById('authBtn');
const addBtn = document.getElementById('addBtn');

// Modals
const loginModal = document.getElementById('loginModal');
const writeModal = document.getElementById('writeModal');
const detailModal = document.getElementById('detailModal');
// Removed password input references since we use Google Auth now
const confirmLoginBtn = document.getElementById('confirmLogin');
const cancelLoginBtn = document.getElementById('cancelLogin');
const closeWriteBtn = document.getElementById('closeWrite');
const closeDetailBtn = document.getElementById('closeDetail');
const closeDetailBottomBtn = document.getElementById('closeDetailBottom');

// Form
const recordForm = document.getElementById('recordForm');
const ratingInput = document.getElementById('inputRating');
const ratingValue = document.getElementById('ratingValue');
const dropZone = document.getElementById('dropZone');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statAvg = document.getElementById('statAvg');
const statGenre = document.getElementById('statGenre');
const statYear = document.getElementById('statYear');

// Toggle View
const toggleBtns = document.querySelectorAll('.toggle-btn');
const filterChips = document.querySelectorAll('.filter-chip'); // New
const prevPageBtn = document.getElementById('prevPageBtn'); // New
const nextPageBtn = document.getElementById('nextPageBtn'); // New
const pageIndicator = document.getElementById('pageIndicator'); // New
const paginationControls = document.getElementById('paginationControls'); // New (container)
const emptyState = document.getElementById('emptyState');

// --- State ---
let user = null; // Current logged in user
let records = []; // Synced from Firestore
let currentView = 'list'; // list or gallery
let currentCategory = 'all'; // New
let currentPage = 1; // New
// itemsPerPage is dynamic now
// --- Bulk Import Data ---
const INITIAL_DATA = [
    {
        "title": "조성진 리사이틀",
        "date": "2025-02-05",
        "category": "classic",
        "cast": "조성진",
        "program": "라벨 피아노소나타 전곡",
        "venue": "카네기홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "천개의 파랑",
        "date": "2025-02-28",
        "category": "musical",
        "cast": "윤태호, 효정, 강해인",
        "program": "천선란의 소설 <천개의 파랑>을 원작으로 한 뮤지컬",
        "venue": "국립극장",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?musical,concert"
    },
    {
        "title": "한·일 국교정상화 60주년 기념 합동연주회",
        "date": "2025-03-03",
        "category": "classic",
        "cast": "정명훈, 선우예권, 이가라시 카오루코, KBS교향악단",
        "program": "모짜르트 피아노협주곡 제 10번\\n말러 1번 교향곡",
        "venue": "롯데콘서트홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "피크닉 희곡극장",
        "date": "2025-03-29",
        "category": "play",
        "cast": "양손프로젝트",
        "program": "사무엘베케트 '행복한 날들'",
        "venue": "피크닉",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?play,concert"
    },
    {
        "title": "2025 통영국제음악제 - KBS교향악단 with 일란 볼코프",
        "date": "2025-04-04",
        "category": "classic",
        "cast": "선우예권, 일란 볼코프, 일리야 그린골츠, KBS교향악단",
        "program": "드뷔시 : 어린이차지(아시아 초연/한스 아브라함센 편곡)\\n한스 아브라함센 : 왼손을 위한 피아노 협주곡 '레프트, 얼론'\\n시벨리우스 : 바이올린 협주곡 d단조",
        "venue": "통영국제음악당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 통영국제음악제 - 피에르 불레즈를 기리며",
        "date": "2025-04-05",
        "category": "classic",
        "cast": "앙상블 앵테르콩탕포랭, 피에르 블뢰즈",
        "program": "비에르 불레즈 : 삽입절\\n버르토크 : 두 대의 피아노와 타악기를 위한 소나타\\n피에르 불레즈 : 앙템\\n피에르 불레즈 : 삽입절에",
        "venue": "통영국제음악당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 통영국제음악제 - K’ARTS 신포니에타 with 황수미",
        "date": "2025-04-05",
        "category": "classic",
        "cast": "황수미, K'ARTS 신포니에타, 윤한결",
        "program": "힌데미트 : 실내악 1번\\n쇤베르크(한스 아브라함센 편곡) : 4개의 가곡\\n한스 아브라함센 : 그림 동화\\n코른골트 : 헛소동 모음곡\\n말러 : 어린이의 이상한 뿔피리(발췌)",
        "venue": "통영국제음악당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 통영국제음악제 - 통영페스티벌오케스트라 III",
        "date": "2025-04-06",
        "category": "classic",
        "cast": "조지아 자먼, 소프라노\\n마일스 뮈카넨, 테너\\n김기훈, 바리톤\\n전주시립합창단\\n원주시립합창단\\n성남시립합창단\\n서울시소년소녀합창단\\n통영페스티벌 오케스트라, 성시연",
        "program": "브리튼, 전쟁 레퀴엠",
        "venue": "통영국제음악당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "예술의전당 교향악축제 2025 - 서울시향",
        "date": "2025-04-18",
        "category": "classic",
        "cast": "서울시향, 최수열, 이상 엔더스",
        "program": "슈만 첼로협주곡 a단조\\nR.슈트라우스 영웅의 생애 Op.40",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 예술의전당 교향악축제 - 경기필하모닉오케스트라",
        "date": "2025-04-20",
        "category": "classic",
        "cast": "경기필, 김선욱",
        "program": "모차르트 피아노협주곡 제26번 D장조 '대관식'\\n말러 교향곡 제5번 C단조",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "블라디미르 유롭스키 & 베를린 방송교향악단",
        "date": "2025-05-03",
        "category": "classic",
        "cast": "블라디미르 유롭스키, 베를린 방송교향악단, 레이 첸",
        "program": "브람스, 하이든 주제에 의한 변주곡\\n브람스, 바이올린 협주곡\\n브람스, 교향곡1번",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "야쿠프 흐루샤 & 밤베르크 심포니",
        "date": "2025-06-01",
        "category": "classic",
        "cast": "야쿠프 흐루샤, 밤베르크 심포니, 김봄소리",
        "program": "바그너, 오페라 <요정들> 서곡\\n부르흐, 바이올린 협주곡 1번\\n베토벤, 교향곡 7번",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "에사페카 살로넨 & 뉴욕 필하모닉 I",
        "date": "2025-06-27",
        "category": "classic",
        "cast": "에사페카 살로넨, 뉴욕필하모닉, 크리스티안 짐머만",
        "program": "베토벤, 피아노협주곡 4번\\n베토벤, 교향곡 제3번 '영웅'",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "버밍엄 시립교향악단 & 임윤찬",
        "date": "2025-07-04",
        "category": "classic",
        "cast": "야마다 카즈키, 버밍엄시립교향악단, 임윤찬",
        "program": "라벨, <라 발스>\\n라흐마니노프, 피아노 협주곡 제4번 G단조 Op.40 \\n차이콥스키, 교향곡 제5번 E단조 Op.64",
        "venue": "후쿠오카 심포니홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "평창페스티벌체임버 오케스트라-섬, 제국 그리고 우아함",
        "date": "2025-07-27",
        "category": "classic",
        "cast": "김유빈, 이사벨 모레티, 루벤 두브로프스키, 평창페스티벌체임버오케스트라",
        "program": "하이든, 무인도 서곡\\n모차르트. 플루트와 하프를 위한 협주곡\\n하이든, 교향곡 제104번 D장조",
        "venue": "평창 알펜시아리조트",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "펜타포트 락페스티벌",
        "date": "2025-08-01",
        "category": "concert",
        "cast": "펄프(Pulp), 비바두비(Beabadoobee), 혁오 & 선셋 롤러코스터",
        "program": "",
        "venue": "송도",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?concert,concert"
    },
    {
        "title": "슬립노모어",
        "date": "2025-08-09",
        "category": "play",
        "cast": "김도현, 김수정, 김영은, 김태양, 노바 발켄호프",
        "program": "셰익스피어의 <맥베스>를 모티브로 한 이머시브(관객 참여형) 연극",
        "venue": "대한극장",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?play,concert"
    },
    {
        "title": "클래식 레볼루션 2025 : 체임버 뮤직콘서트 III",
        "date": "2025-08-31",
        "category": "classic",
        "cast": "레오니다스 카바코스, 양인모, 아폴론 앙상블",
        "program": "바흐, 바이올린 협주곡",
        "venue": "롯데콘서트홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "프리마파시",
        "date": "2025-09-20",
        "category": "play",
        "cast": "김신록",
        "program": "성폭력 사건의 피해자가 된 변호사 '테사'의 이야기를 다룬 1인극",
        "venue": "충무아트홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?play,concert"
    },
    {
        "title": "2025 서울시향 얍 판 츠베덴과 김봄소리",
        "date": "2025-10-01",
        "category": "classic",
        "cast": "서울시향, 얍 판 츠베덴, 김봄소리",
        "program": "신동훈, '그의 유령같은 고독 위에서'\\n멘델스존, 바이올린 협주곡\\n라흐마니노프, 교향곡 제2번",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "위키드 내한 공연",
        "date": "2025-10-04",
        "category": "musical",
        "cast": "셰리든 아담스(엘파바), 코트니 몬스마(글린다)",
        "program": "<오즈의 마법사>를 뒤집은 이야기로, 초록 마녀 엘파바와 금발 마녀 글린다의 우정을 다룬 뮤지컬",
        "venue": "블루스퀘어",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?musical,concert"
    },
    {
        "title": "프리마파시",
        "date": "2025-10-17",
        "category": "play",
        "cast": "이자람",
        "program": "성폭력 사건의 피해자가 된 변호사 '테사'의 이야기를 다룬 1인극",
        "venue": "충무아트홀",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?play,concert"
    },
    {
        "title": "리오 쿠오크만, 선우예권&홍콩필하모닉오케스트라",
        "date": "2025-10-19",
        "category": "classic",
        "cast": "리오 쿠오크만, 선우예권, 홍콩필하모닉오케스트라",
        "program": "진은숙, <수비토 콘 포르차(Subito con forza)\\n찰스쾅, <페스티나 렌테 질여풍>\\n차이코프스키, 피아노협주곡 1번\\n차이코프스키, 교향곡 5번",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "구스타보 두다멜&로스앤젤레스 필하모닉 I",
        "date": "2025-10-21",
        "category": "classic",
        "cast": "구스타보 두다멜, LA필하모닉",
        "program": "말러, 교향곡 제2번 <부활>",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "구스타보 두다멜&로스앤젤레스 필하모닉 ll",
        "date": "2025-10-22",
        "category": "classic",
        "cast": "구스타보 두다멜, LA필하모닉",
        "program": "스트라빈스키, <봄의 제전> <불새>",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "클라우스 메켈레 & 로열 콘세르트헤바우 오케스트라",
        "date": "2025-11-05",
        "category": "classic",
        "cast": "클라우스 메켈레, 로열 콘세트르헤바우, 키릴게르스타인",
        "program": "브람스, 피아노 협주곡 1번\\n버르토크, 관현악을 위한 협주곡",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "키릴 페트렌코&베를린 필하모닉",
        "date": "2025-11-07",
        "category": "classic",
        "cast": "키릴 페트렌코, 베를린 필하모닉, 김선욱",
        "program": "바그너, <지그프리트 목가>\\n슈만, 피아노 협주곡 a단조 (협연: 김선욱)\\n브람스, 교향곡 제1번",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "키릴 페트렌코&베를린 필하모닉",
        "date": "2025-11-08",
        "category": "classic",
        "cast": "키릴 페트렌코, 베를린 필하모닉",
        "program": "야나체크, <라치안 춤곡>\\n버르토크, <중국의 이상한 관리> 모음곡\\n스트라빈스키, <페트루슈카> (1947년 버전)",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 서울바흐축제 - 칸타타시리즈",
        "date": "2025-11-18",
        "category": "classic",
        "cast": "콜레기움 보칼레 서울, 김선아",
        "program": "바흐 칸타타",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "정명훈 실내악 콘서트",
        "date": "2025-11-25",
        "category": "classic",
        "cast": "정명훈, 양인모, 지안 왕, 디미트리 무라스",
        "program": "모차르트, 바이올린 소나타 e단조 K.304\\n베토벤, 피아노 삼중주 <유령>\\n브람스, 피아노 사중주 3번 <베르테르>",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "국립오페라단 x 서울시립교향악단 오페라 〈트리스탄과 이졸데〉",
        "date": "2025-12-06",
        "category": "classic",
        "cast": "얍 판 츠베덴, 서울시향, 국립오페라단",
        "program": "오페라 <트리스탄과 이졸데>",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    },
    {
        "title": "2025 서울시향 얍 판 츠베덴의 베토벤 ‘합창’ ①",
        "date": "2025-12-18",
        "category": "classic",
        "cast": "얍 판 츠베덴, 서울시향",
        "program": "베토벤, 9번 교향곡 <합창>",
        "venue": "예술의전당",
        "rating": 5.0,
        "review": "",
        "imageUrl": "https://source.unsplash.com/random/300x450/?classic,concert"
    }
];

const ADMIN_EMAIL = "honggiina@gmail.com";


// --- Initialization ---
function init() {
    // Auth Listener
    auth.onAuthStateChanged((currentUser) => {
        user = currentUser;
        updateAuthUI();
        // Reload detail view permissions if open
        const isAdmin = user && user.email === ADMIN_EMAIL;
        if (!detailModal.classList.contains('hidden')) {
            if (isAdmin) headerDeleteBtn.classList.remove('hidden');
            else headerDeleteBtn.classList.add('hidden');
        }
    });

    // Data Listener (Realtime!)
    db.collection("records").orderBy("date", "desc")
        .onSnapshot((snapshot) => {
            records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderRecords();
            updateStats();
        });
}

// --- Auth Logic ---
authBtn.addEventListener('click', () => {
    if (user) {
        // Logout
        auth.signOut().then(() => {
            alert('로그아웃 되었습니다.');
        });
    } else {
        // Login with Google
        auth.signInWithPopup(provider)
            .then((result) => {
                const loggedInEmail = result.user.email;
                if (loggedInEmail !== ADMIN_EMAIL) {
                    alert(`안녕하세요, ${result.user.displayName}님! 👋\n\n이곳은 저(Zoey)의 개인적인 문화 기록 공간입니다.\n기록 작성과 삭제는 주인장만 가능하지만,\n편안하게 구경하고 즐기다 가세요! 😊`);
                } else {
                    alert(`어서오세요, 주인님! 👸\n오늘도 멋진 기록을 남겨보세요.`);
                }
            }).catch((error) => {
                console.error("Login failed", error);
                alert("로그인 실패: " + error.message);
            });
    }
});

function updateAuthUI() {
    const importBtn = document.getElementById('importBtn');
    if (user) {
        authBtn.textContent = '편집';
        if (user.email === ADMIN_EMAIL) {
            addBtn.classList.remove('hidden');
            if (importBtn) importBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
            if (importBtn) importBtn.classList.add('hidden');
        }
    } else {
        authBtn.textContent = 'Login';
        addBtn.classList.add('hidden');
        if (importBtn) importBtn.classList.add('hidden');
    }
}

const mainElement = document.querySelector('main'); // New reference

// --- View Toggle Logic ---
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        currentView = view;
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mainElement.className = `view-${view}`; // Apply class to main wrapper
        currentPage = 1;
        renderRecords();
    });
});

// --- Filter Logic ---
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        currentCategory = chip.dataset.category;

        // Update UI
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentPage = 1; // Reset to page 1
        renderRecords();
    });
});

// --- Pagination Logic ---
// Handled dynamically in renderPagination
// prevPageBtn and nextPageBtn are no longer static elements

// --- Import Logic ---
const importBtn = document.getElementById('importBtn');
if (importBtn) {
    importBtn.addEventListener('click', async () => {
        if (!confirm(`총 ${INITIAL_DATA.length}개의 데이터를 가져오시겠습니까?`)) return;

        importBtn.disabled = true;
        importBtn.textContent = "가져오는 중...";

        let count = 0;
        try {
            for (const record of INITIAL_DATA) {
                await addDoc(collection(db, "records"), {
                    ...record,
                    createdAt: serverTimestamp(),
                    userId: user.uid
                });
                count++;
            }
            alert(`${count}개의 기록이 성공적으로 추가되었습니다!`);
            importBtn.classList.add('hidden'); // Hide after success
        } catch (e) {
            console.error(e);
            alert("오류 발생: " + e.message);
        } finally {
            importBtn.disabled = false;
            importBtn.textContent = "Import 2025";
        }
    });
}

// --- CRUD Logic ---
addBtn.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
});

// Helper to open Edit Modal
function openEditModal(record) {
    isEditing = true;
    editingId = record.id;

    document.querySelector('#writeModal h3').textContent = "기록 수정";

    document.getElementById('inputTitle').value = record.title;
    document.getElementById('inputDate').value = record.date;
    document.getElementById('inputCategory').value = record.category;
    document.getElementById('inputCast').value = record.cast || '';
    document.getElementById('inputProgram').value = record.program || '';
    document.getElementById('inputRating').value = record.rating;
    document.getElementById('inputVenue').value = record.venue || '';
    document.getElementById('inputReview').value = record.review || '';

    ratingValue.textContent = record.rating.toFixed(1);

    if (record.imageUrl) {
        dropZone.innerHTML = `<img src="${record.imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
    }

    detailModal.classList.add('hidden');
    writeModal.classList.remove('hidden');
}


closeWriteBtn.addEventListener('click', () => {
    writeModal.classList.add('hidden');
    resetForm();
});

// Rating Slider UI
ratingInput.addEventListener('input', (e) => {
    ratingValue.textContent = parseFloat(e.target.value).toFixed(1);
});

// Image Handling
const imageInput = document.getElementById('imageInput');
let selectedFile = null;

dropZone.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];

        // Show Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            dropZone.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        };
        reader.readAsDataURL(selectedFile);

        // Simulation Prompt
        setTimeout(() => {
            confirm("이미지를 분석하시겠습니까? (시뮬레이션: 정보를 자동으로 입력합니다)");
            // Note: In a real app we would call a Cloud Function here.
            // For now we keep the simulation text fill but allow real upload.
            document.getElementById('inputTitle').value = "새로운 문화 기록";
            document.getElementById('inputDate').value = new Date().toISOString().split('T')[0];
        }, 500);
    }
});

// State for Edit Mode
let isEditing = false;
let editingId = null;

recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = recordForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? "수정 중..." : "저장 중...";

    try {
        let imageUrl = `https://source.unsplash.com/random/300x450/?${document.getElementById('inputCategory').value},concert`;

        if (selectedFile) {
            const storageRef = storage.ref('posters/' + Date.now() + '_' + selectedFile.name);
            const snapshot = await storageRef.put(selectedFile);
            imageUrl = await snapshot.ref.getDownloadURL();
        } else if (isEditing) {
            const oldRecord = records.find(r => r.id === editingId);
            if (oldRecord) imageUrl = oldRecord.imageUrl;
        }

        const dataPayload = {
            title: document.getElementById('inputTitle').value,
            date: document.getElementById('inputDate').value,
            category: document.getElementById('inputCategory').value,
            cast: document.getElementById('inputCast').value,
            program: document.getElementById('inputProgram').value,
            rating: parseFloat(document.getElementById('inputRating').value),
            venue: document.getElementById('inputVenue').value,
            review: document.getElementById('inputReview').value,
            imageUrl: imageUrl
        };

        if (isEditing && editingId) {
            await db.collection("records").doc(editingId).update(dataPayload);
            alert("수정되었습니다.");
        } else {
            dataPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            dataPayload.userId = user.uid;
            await db.collection("records").add(dataPayload);
        }

        // Cleanup
        writeModal.classList.add('hidden');
        resetForm();

    } catch (error) {
        console.error("Error saving document: ", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "저장하기";
    }
});



function resetForm() {
    recordForm.reset();
    ratingValue.textContent = "5.0";
    selectedFile = null;
    dropZone.innerHTML = `
        <i class="ph ph-camera"></i>
        <p>이미지 업로드 또는 붙여넣기<br><span class="sub-text">(자동 분석 시뮬레이션)</span></p>
    `;
    isEditing = false;
    editingId = null;
    document.querySelector('#writeModal h3').textContent = "새로운 기록";
}

// ... Detail View Logic ...

// Detail View Logic
closeDetailBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

closeDetailBottomBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

let currentDetailId = null;

// headerDeleteBtn is dynamic now

// ... (previous code) ...

function showDetail(record) {
    currentDetailId = record.id;
    document.getElementById('detailImage').src = record.imageUrl;

    // Category with Emoji
    const categoryEmoji = getCategoryEmoji(record.category);
    document.getElementById('detailCategory').textContent = `${categoryEmoji} ${formatCategory(record.category)}`;

    document.getElementById('detailTitle').textContent = record.title;
    document.getElementById('detailRating').textContent = `★ ${record.rating.toFixed(1)}`;
    document.getElementById('detailDate').textContent = formatDate(record.date);
    document.getElementById('detailVenue').textContent = record.venue || '-';
    document.getElementById('detailCast').textContent = record.cast || '-';
    const formatText = (text) => text ? text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : '-';
    document.getElementById('detailProgram').innerHTML = formatText(record.program);
    document.getElementById('detailRating').textContent = `★ ${record.rating}`;
    document.getElementById('detailReview').textContent = record.review;

    // --- Dynamic Edit/Delete Button Logic ---
    const controlsContainer = document.querySelector('.modal-controls');
    const existingDeleteBtn = document.getElementById('dynamicDeleteBtn');
    const existingEditBtn = document.getElementById('dynamicEditBtn'); // New

    // 1. Check Admin
    const isAdmin = user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // 2. Clear existing
    if (existingDeleteBtn) existingDeleteBtn.remove();
    if (existingEditBtn) existingEditBtn.remove(); // New

    // 3. If Admin, Create & Append
    if (isAdmin) {
        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.id = 'dynamicEditBtn';
        editBtn.className = 'icon-btn';
        editBtn.innerHTML = '<i class="ph ph-pencil"></i>';
        editBtn.style.marginRight = '0.5rem';

        editBtn.addEventListener('click', () => {
            openEditModal(record);
        });

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.id = 'dynamicDeleteBtn';
        delBtn.className = 'icon-btn danger';
        delBtn.innerHTML = '<i class="ph ph-trash"></i>';

        // Add Listener
        delBtn.addEventListener('click', async () => {
            if (confirm('정말 삭제하시겠습니까? (복구할 수 없습니다)')) {
                try {
                    await db.collection("records").doc(currentDetailId).delete();
                    detailModal.classList.add('hidden');
                } catch (error) {
                    console.error("Error removing document: ", error);
                    alert("삭제 실패: " + error.message);
                }
            }
        });

        // Insert before Close button
        const closeBtn = document.getElementById('closeDetail');
        controlsContainer.insertBefore(editBtn, closeBtn); // Edit first
        controlsContainer.insertBefore(delBtn, closeBtn); // Then Delete
    }

    detailModal.classList.remove('hidden');
}

// Removed static headerDeleteBtn listener


// --- Render Logic ---
function renderRecords() {
    contentArea.innerHTML = '';

    // 1. Filter
    let filteredRecords = records;
    if (currentCategory !== 'all') {
        filteredRecords = records.filter(r => r.category === currentCategory);
    }

    // 2. Pagination State
    // User requested 9 items for both views
    const ITEMS_PER_PAGE = 9;

    const totalItems = filteredRecords.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    // Safety check
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // 3. Slice
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = filteredRecords.slice(startIndex, endIndex);

    // 4. Empty Check & Controls Visibility
    if (totalItems === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        // ALWAYS show controls if data exists
        if (paginationControls) {
            paginationControls.classList.remove('hidden');
            paginationControls.style.display = 'flex'; // Force display
        }
    }

    // 5. Render Items
    pageItems.forEach(record => {
        let el;
        // Helper to fix newlines safely
        const formatText = (text) => {
            if (typeof text !== 'string') return '';
            return text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        };

        if (currentView === 'list') {
            const categoryEmoji = getCategoryEmoji(record.category);
            el = document.createElement('div');
            el.className = 'list-item';
            const reviewLimit = 80; // Slightly more generous limit
            const needsMore = record.review && record.review.length > reviewLimit;
            const displayReview = needsMore ? record.review.substring(0, reviewLimit) : (record.review || "");

            el.innerHTML = `
                <div class="item-header">
                    <span class="item-title pointer" style="cursor:pointer; text-decoration:underline; text-decoration-color:transparent; transition: text-decoration-color 0.3s; ">${record.title}</span>
                    <span class="item-date">${formatDate(record.date)}</span>
                </div>
                <div class="item-meta">
                    <span class="item-category">${formatCategory(record.category)}</span>
                    ${record.cast ? `<span class="item-cast">${record.cast}</span>` : ''}
                    ${record.venue ? `<span class="item-venue">${record.venue}</span>` : ''}
                    <span class="star-rating">★ ${record.rating}</span>
                </div>
                ${record.program ? `<div class="item-program text-truncate" style="font-size:0.9rem; color:#555; margin-bottom:0.5rem; cursor:pointer;">${categoryEmoji} ${formatText(record.program)}</div>` : ''}
                <div class="item-review">
                    ${displayReview}${needsMore ? `<span class="more-link">...더보기</span>` : ''}
                </div>
            `;

            el.querySelector('.item-title').addEventListener('click', (e) => {
                e.stopPropagation();
                showDetail(record);
            });

            if (needsMore) {
                el.querySelector('.more-link').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDetail(record);
                });
            }

            const programDiv = el.querySelector('.item-program');
            if (programDiv) {
                programDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDetail(record);
                });
            }

        } else {
            // Gallery View
            el = document.createElement('div');
            el.className = 'gallery-item';
            el.innerHTML = `
                <img src="${record.imageUrl}" alt="${record.title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="gallery-overlay">
                    <div class="gallery-title">${record.title}</div>
                    <div class="gallery-rating">★ ${record.rating}</div>
                    ${record.cast ? `<div style="font-size:0.75rem; opacity:0.8">${record.cast}</div>` : ''}
                </div>
            `;
            el.addEventListener('click', () => showDetail(record));
        }

        contentArea.appendChild(el);
    });

    // 6. Update Controls Logic
    renderPagination(currentPage, totalPages);
}

function renderPagination(current, total) {
    if (!paginationControls) return;
    paginationControls.innerHTML = '';

    if (total <= 1) {
        paginationControls.classList.add('hidden');
        return;
    }
    paginationControls.classList.remove('hidden');

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="ph ph-caret-left"></i>';
    prevBtn.disabled = (current === 1);
    prevBtn.onclick = () => { currentPage--; renderRecords(); window.scrollTo(0, 0); };
    paginationControls.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === current ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderRecords();
            window.scrollTo(0, 0);
        };
        paginationControls.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="ph ph-caret-right"></i>';
    nextBtn.disabled = (current === total);
    nextBtn.onclick = () => { currentPage++; renderRecords(); window.scrollTo(0, 0); };
    paginationControls.appendChild(nextBtn);
}

// --- Stats Logic ---
function updateStats() {
    if (records.length === 0) {
        statTotal.textContent = 0;
        statAvg.textContent = "0.0";
        statGenre.textContent = "-";
        statYear.textContent = 0;
        return;
    }

    // 1. Total
    statTotal.textContent = records.length;

    // 2. Avg
    const totalRating = records.reduce((acc, cur) => acc + cur.rating, 0);
    statAvg.textContent = (totalRating / records.length).toFixed(1);

    // 3. Most Viewed Category (Mode)
    const categoryCounts = records.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
    }, {});

    let mostViewedCategory = "-";
    let maxCount = 0;

    for (const cat in categoryCounts) {
        if (categoryCounts[cat] > maxCount) {
            maxCount = categoryCounts[cat];
            mostViewedCategory = formatCategory(cat);
        }
    }
    statGenre.textContent = mostViewedCategory;

    // 4. This Year
    const thisYear = new Date().getFullYear();
    const countYear = records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === thisYear;
    }).length;
    statYear.textContent = countYear;
}

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = String(d.getFullYear()).slice(-2);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function formatCategory(cat) {
    const map = {
        'classic': '클래식',
        'musical': '뮤지컬',
        'play': '연극',
        'exhibition': '전시',
        'movie': '영화',
        'concert': '콘서트'
    };
    return map[cat] || cat;
}

function getCategoryEmoji(cat) {
    const map = {
        'classic': '🎻',
        'musical': '🎭',
        'play': '🎬',
        'exhibition': '🖼️',
        'movie': '🍿',
        'concert': '🎤'
    };
    return map[cat] || '🎵';
}

// Run
init();
