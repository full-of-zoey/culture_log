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

// Performance: Enable Offline Persistence
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Multiple tabs open, persistence disabled.");
        } else if (err.code == 'unimplemented') {
            console.warn("Browser doesn't support persistence.");
        }
    });
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

// const emptyState = document.getElementById('emptyState'); // Removed duplicate
let isLoading = true; // Optimization: Prevent flash

// Skeleton Loading
function renderSkeleton() {
    isLoading = true; // Set loading state

    // CRITICAL: Hide emptyState while showing skeleton
    if (emptyState) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('show');
    }
    if (paginationControls) paginationControls.classList.add('hidden');

    contentArea.innerHTML = '';
    const skeletonCount = 5;
    for (let i = 0; i < skeletonCount; i++) {
        const el = document.createElement('div');
        el.className = 'skeleton-list-item';
        el.innerHTML = `
            <div class="skeleton-header">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-date"></div>
            </div>
            <div class="skeleton skeleton-meta"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 80%;"></div>
        `;
        contentArea.appendChild(el);
    }
}

// --- State ---
let user = null; // Current logged in user
let records = []; // Synced from Firestore
let currentView = 'list'; // list or gallery
let currentCategory = 'all'; // New
let currentPage = 1; // New

// --- Cache Configuration ---
const CACHE_KEY = 'culture_log_cache';
const CACHE_VERSION = 'v2';

// Load cached data from localStorage
function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (data.version === CACHE_VERSION && Array.isArray(data.records)) {
                console.log(`[Cache] Loaded ${data.records.length} records from cache`);
                return data.records;
            }
        }
    } catch (e) {
        console.warn('[Cache] Failed to load:', e);
    }
    return null;
}

// Save data to localStorage cache
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            version: CACHE_VERSION,
            records: data,
            timestamp: Date.now()
        }));
        console.log(`[Cache] Saved ${data.length} records to cache`);
    } catch (e) {
        console.warn('[Cache] Failed to save:', e);
    }
}
// --- Bulk Import Data ---
const INITIAL_DATA = [
    {
        "id": "5JifBZFfCgIkyz6Piimd",
        "date": "2025-12-24",
        "venue": "예술의전당 오페라극장",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766891090731_IMG_1328%202.jpg?alt=media&token=f89c6db2-bef9-4e37-b08f-573618b53781",
        "cast": "국립발레단, 국립심포니오케스트라",
        "category": "classic",
        "review": "with 이나. 로맨틱 크리스마스 이브였다. 아름다운 움직임과 우아하고도 좀 슬픈 음악. 레코딩을 아무리 많이 들어도 라이브로 듣는 오케스트라 사운드를 이길 수는 없는 것 같다.",
        "rating": 5,
        "program": "차이코프스키 '호두까기인형'",
        "title": "국립발레단 <호두까기 인형>"
    },
    {
        "id": "OcDQHzn8n7PRE6duxXA1",
        "title": "2025 서울시향 얍 판 츠베덴의 베토벤 '합창' ①",
        "venue": "예술의전당",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766910187716_KakaoTalk_Photo_2025-12-28-17-20-36.png?alt=media&token=55d42dd6-512d-4918-b252-035a40732ded",
        "program": "베토벤, 9번 교향곡 <합창>",
        "cast": "얍 판 츠베덴, 서울시향",
        "category": "classic",
        "date": "2025-12-18",
        "rating": 3.5,
        "review": "with 은선. 이렇게 숨찬 환희의 송가는 처음 들어본다."
    },
    {
        "id": "2PCcgIeRI2oD8xDa9nm2",
        "venue": "예술의전당",
        "review": "조성진 입덕한 날. 내년에 조성진 보려면 일 열심히 하자, 나여로 끝나는 공연 감상 :)",
        "date": "2025-12-14",
        "rating": 5,
        "title": "빈체로 창립30주년 기념음악회",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766919952523_IMG_1207%202.jpg?alt=media&token=3092993f-fb76-411f-9227-70abc14575f3",
        "program": "차이콥스키 '로미오와 줄리엣' 환상 서곡, 시벨리우스 바이올린 협주곡, 차이콥스키 피아노 협주곡",
        "category": "classic",
        "cast": "조성진, 클라라 주미 강, 김선욱, 경기필"
    },
    {
        "id": "R2WOQebnixlcCoLFYBYy",
        "title": "오페라 〈트리스탄과 이졸데〉",
        "category": "classic",
        "review": "총 300분짜리 바그너의 오페라를 서울에서 볼 수 있다면 가야지, 하며 갔는데...",
        "cast": "얍 판 츠베덴, 서울시향, 국립오페라단",
        "date": "2025-12-06",
        "venue": "예술의전당",
        "rating": 3.5,
        "program": "바그너의 오페라 <트리스탄과 이졸데>",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766910364384_IMG_1044%202.jpg?alt=media&token=8526b98a-09e7-43b2-89e4-415b6ef18e3b"
    },
    {
        "id": "h7JVzRVK48yKV5N52CdS",
        "program": "모차르트, 바이올린 소나타 e단조 K.304\\n베토벤, 피아노 삼중주 <유령>\\n브람스, 피아노 사중주 3번 <베르테르>",
        "date": "2025-11-25",
        "venue": "예술의전당",
        "rating": 4.5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766910568181_IMG_0865%202.jpg?alt=media&token=19f2a258-00b2-4db5-ae02-6958c28e9304",
        "title": "정명훈 실내악 콘서트",
        "cast": "정명훈, 양인모, 지안 왕, 디미트리 무라스",
        "category": "classic",
        "review": "지안 왕의 첼로가 정말 일품이었다."
    },
    {
        "id": "12XPja0woaYrSTkhiQ8n",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766910716372_IMG_0709%202.jpg?alt=media&token=9f6f6b40-4854-4800-a23f-314d266655c4",
        "review": "with 무옥님. 대림절을 앞두고 바흐칸타타 듣고 싶어서 무옥님이랑 같이 갔다.",
        "category": "classic",
        "venue": "예술의전당",
        "title": "2025 서울바흐축제 - 칸타타시리즈",
        "program": "바흐 칸타타",
        "rating": 4,
        "date": "2025-11-18",
        "cast": "콜레기움 보칼레 서울, 김선아"
    },
    {
        "id": "PrNnjPR7EmCvbpde5hz1",
        "title": "키릴 페트렌코&베를린 필하모닉",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766911255171_IMG_0538%202.jpg?alt=media&token=175b84b9-b988-4e01-a0ea-6d436db6aa07",
        "cast": "키릴 페트렌코, 베를린 필하모닉",
        "program": "야나체크, <라치안 춤곡>\\n버르토크, <중국의 이상한 관리> 모음곡\\n스트라빈스키, <페트루슈카> (1947년 버전)",
        "date": "2025-11-08",
        "rating": 5,
        "category": "classic",
        "review": "올해의 공연 중 하나. 베를린필의 실력을 칭찬하는지 경험한 시간이었다.",
        "venue": "예술의전당"
    },
    {
        "id": "p3vDY6wKy6XcEOYvphNp",
        "review": "with 은선. 금요일 엄청 막히는 대로에서 첫 곡은 듣지 못하는 줄 알았지만, 버스에서 내려서 음악당까지 도착하는데 5분이 걸리지 않았다.",
        "venue": "예술의전당",
        "category": "classic",
        "cast": "키릴 페트렌코, 베를린 필하모닉, 김선욱",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766915867848_%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA%202025-12-28%20%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE%206.55.08.png?alt=media&token=903a2466-6475-4777-bafd-28f8feb1ebf2",
        "program": "바그너, <지그프리트 목가>\\n슈만, 피아노 협주곡 a단조 (협연: 김선욱)\\n브람스, 교향곡 제1번",
        "title": "키릴 페트렌코&베를린 필하모닉",
        "date": "2025-11-07",
        "rating": 4.5
    },
    {
        "id": "FPAjFe8SmDtVhGKQmYOC",
        "cast": "클라우스 메켈레, 로열 콘세트르헤바우, 키릴 게르스타인",
        "title": "클라우스 메켈레 & 로열 콘세르트헤바우 오케스트라",
        "category": "classic",
        "review": "with 은선. 키릴 게르스타인의 브람스 약간 신기했다.",
        "program": "브람스, 피아노 협주곡 1번\\n버르토크, 관현악을 위한 협주곡",
        "date": "2025-11-05",
        "rating": 4.5,
        "venue": "예술의전당",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766916188804_IMG_0459%202.jpg?alt=media&token=25be209a-5158-484a-960f-4fc91cb1739e"
    },
    {
        "id": "HnmcyrO8J7JHjBxI7bb0",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766916484560_IMG_0171%202.jpg?alt=media&token=319903db-59d8-4b8c-94be-16b6afe5cb0a",
        "rating": 5,
        "review": "with 은선. 첫 날 공연 너무 좋았고, 근데 두다멜 얼굴을 보고 싶어서 합창석 취소표를 주웠다.",
        "cast": "구스타보 두다멜, LA필하모닉",
        "category": "classic",
        "title": "구스타보 두다멜&로스앤젤레스 필하모닉 ll",
        "date": "2025-10-22",
        "venue": "예술의전당",
        "program": "스트라빈스키, <봄의 제전> <불새>"
    },
    {
        "id": "KBVGoN1OjUhQpRgZuBOP",
        "rating": 5,
        "program": "말러, 교향곡 제2번 <부활>",
        "title": "구스타보 두다멜&로스앤젤레스 필하모닉 I",
        "date": "2025-10-21",
        "review": "with 은선. 오래 기다렸던 공연이다. 말러2번 라이브로 첨 들었지만, 최고였다.",
        "category": "classic",
        "venue": "예술의전당",
        "cast": "구스타보 두다멜, LA필하모닉",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766916812384_IMG_0149%202.jpg?alt=media&token=c8021b16-f1b0-4d60-8575-fed8655aabf4"
    },
    {
        "id": "nhklfSynaRxnPvpcD2N1",
        "date": "2025-10-19",
        "venue": "예술의전당",
        "category": "classic",
        "review": "with 보름. 한국인이 좋아하는 피아노협주곡 1위가 차피협 1번이라던데.",
        "program": "진은숙, <수비토 콘 포르차(Subito con forza)\\n찰스쾅, <페스티나 렌테 질여풍>\\n차이코프스키, 피아노협주곡 1번\\n차이코프스키, 교향곡 5번",
        "title": "리오 쿠오크만, 선우예권&홍콩필하모닉오케스트라",
        "rating": 5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766917026879_IMG_0129%202.jpg?alt=media&token=a54d946c-c9fa-4a9f-a01f-966229ae53c0",
        "cast": "리오 쿠오크만, 선우예권, 홍콩필하모닉오케스트라"
    },
    {
        "id": "tf3xS8WFrH6sVPPylTCQ",
        "cast": "이자람",
        "review": "with 키, 헤이븐. 두번째 프리마파시. 김신록의 극과는 완전히 다른 극이어서 놀랐다.",
        "category": "play",
        "rating": 4.5,
        "program": "성폭력 사건의 피해자가 된 변호사 '테사'의 이야기를 다룬 1인극",
        "title": "프리마파시",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766917352059_%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA%202025-12-28%20%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE%207.18.58.png?alt=media&token=f01c5c2f-f9eb-4c88-a165-f411ef32703f",
        "date": "2025-10-17",
        "venue": "충무아트홀"
    },
    {
        "id": "nX5DMUbbA76IBl44uRv1",
        "date": "2025-10-04",
        "rating": 5,
        "title": "위키드 내한 공연",
        "venue": "블루스퀘어",
        "category": "musical",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766917464992_IMG_9754%202.jpg?alt=media&token=7c3e0f25-5fd0-49b7-81df-4943aff66d14",
        "review": "명절을 맞아 <위키드>를 보러 나온 가족들, 외국인들의 모습이 인상적이었다.",
        "cast": "셰리든 아담스(엘파바), 코트니 몬스마(글린다)",
        "program": "<오즈의 마법사>를 뒤집은 이야기로, 초록 마녀 엘파바와 금발 마녀 글린다의 우정을 다룬 뮤지컬"
    },
    {
        "id": "VqByentvfnrxxhvN3p7R",
        "venue": "예술의전당",
        "review": "김봄소리는 더 잘해. 멘델스존 바이올린협주곡 너무 좋아서 공연 끝나고도 계속 들었다.",
        "rating": 5,
        "date": "2025-10-01",
        "title": "2025 서울시향 얍 판 츠베덴과 김봄소리",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766919248928_%E1%84%8E%E1%85%AC%E1%84%80%E1%85%B3%E1%86%AB%20%E1%84%89%E1%85%A1%E1%84%8C%E1%85%B5%E1%86%AB%20%E1%84%87%E1%85%A9%E1%84%80%E1%85%B5.png?alt=media&token=59b1ebd4-6dde-4d57-ae29-e0674f2b38c0",
        "program": "신동훈, '그의 유령같은 고독 위에서'\\n멘델스존, 바이올린 협주곡\\n라흐마니노프, 교향곡 제2번",
        "category": "classic",
        "cast": "서울시향, 얍 판 츠베덴, 김봄소리"
    },
    {
        "id": "OrtMMvqwmabHSJnhtMmI",
        "category": "play",
        "rating": 5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766919033671_%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA%202025-12-28%20%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE%207.48.20.png?alt=media&token=203c1cc2-8535-42c7-bc23-06a121b1fb2b",
        "date": "2025-09-20",
        "cast": "김신록",
        "venue": "충무아트홀",
        "title": "프리마파시",
        "review": "with 유정. 김신록의 연극은 다 1인극으로만 봤다.",
        "program": "성폭력 사건의 피해자가 된 변호사 '테사'의 이야기를 다룬 1인극"
    },
    {
        "id": "EcWskEz1Qlkddc20LM7V",
        "rating": 4,
        "venue": "예술의전당",
        "date": "2025-09-13",
        "title": "예술의전당 회원음악회",
        "category": "classic",
        "program": "멘델스존, 바이올린협주곡 1번 \\n 차이코프스키 교향곡 4번",
        "cast": "여자경, 이지윤, 경기필하모닉 오케스트라",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766919633356_%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA%202025-12-28%20%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE%207.56.13.png?alt=media&token=119493a6-8bb0-4175-900d-5a109e3604e7",
        "review": "with 은선. 멘델스존 바이올린협주곡 처음엔 좀 불안했는데, 끝날 때쯤 음악이 끝나지 않았으면 싶었다."
    },
    {
        "id": "OGrVi7xmZlI0PYmp8uUj",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918804515_IMG_9153%202.jpg?alt=media&token=f9ae471e-12e2-4c86-af21-1d9f21751c53",
        "rating": 4.5,
        "venue": "롯데콘서트홀",
        "date": "2025-08-31",
        "title": "클래식 레볼루션 2025 : 체임버 뮤직콘서트 III",
        "review": "with 이나. 양인모와 바흐라고 해서 보러 갔다.",
        "category": "classic",
        "cast": "레오니다스 카바코스, 양인모, 아폴론 앙상블",
        "program": "바흐, 바이올린 협주곡"
    },
    {
        "id": "U7qRdpbPiZoTbP8aLYpB",
        "venue": "대한극장",
        "rating": 5,
        "title": "슬립노모어",
        "cast": "김도현, 김수정, 김태양, 노바 발켄호프 등",
        "program": "셰익스피어의 <맥베스>를 모티브로 한 이머시브(관객 참여형) 연극",
        "date": "2025-08-09",
        "review": "with 보름, 은선, 다애. 두번째 슬립노모어인데 첫번째 보다 더 재밌었다.",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918690204_IMG_8859%202.jpg?alt=media&token=3da2159f-6a02-48af-b1b4-e0e6161a92a4",
        "category": "play"
    },
    {
        "id": "kTYiAZK2roUQr4Vk0BXy",
        "date": "2025-08-01",
        "venue": "송도",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918543812_IMG_8710%202.jpg?alt=media&token=29880ba1-62c0-4d35-95e7-bc5fda90349a",
        "cast": "펄프(Pulp), 비바두비(Beabadoobee), 혁오 & 선셋 롤러코스터",
        "category": "concert",
        "review": "with 은선, 보름. 사실은 2박 3일 다감. 땀 흘리고, 레몬 하이볼 마시고, 노래하고, 떠들려고 가는 락페.",
        "program": "돼지떼 여름방학 공식프로그램",
        "rating": 4.5,
        "title": "펜타포트 락페스티벌"
    },
    {
        "id": "2d1gJDNCe7pMRcxaA7dp",
        "cast": "김유빈, 이사벨 모레티, 루벤 두브로프스키",
        "review": "with 윤미님, 혜원님. 음악 축제엔 축제만의 흥겨움과 따뜻함이 있다.",
        "title": "평창페스티벌체임버 오케스트라-섬, 제국 그리고 우아함",
        "rating": 4,
        "date": "2025-07-27",
        "category": "classic",
        "program": "하이든, 무인도 서곡\\n모차르트. 플루트와 하프를 위한 협주곡\\n하이든, 교향곡 제104번 D장조",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918326583_IMG_8530%202.jpg?alt=media&token=ddac5c20-562a-4b23-8295-cbe636594993",
        "venue": "평창 알펜시아리조트"
    },
    {
        "id": "ZBC1rX9RAwqwf6n7YEk6",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918203775_IMG_8005%202.jpg?alt=media&token=445243aa-f83e-467f-90b8-119b059a64d2",
        "rating": 5,
        "venue": "후쿠오카 심포니홀",
        "date": "2025-07-04",
        "title": "버밍엄 시립교향악단 & 임윤찬",
        "review": "with 은선. 공연 일주일 전에 충동적으로 표 사서 1박2일로 여행을 다녀왔다.",
        "category": "classic",
        "cast": "야마다 카즈키, 버밍엄시립교향악단, 임윤찬",
        "program": "라벨, <라 발스>\\n라흐마니노프, 피아노 협주곡 제4번 G단조 Op.40 \\n차이콥스키, 교향곡 제5번 E단조 Op.64"
    },
    {
        "id": "pKPL1m34ahX0y0yFf8h8",
        "venue": "예술의전당",
        "title": "에사페카 살로넨 & 뉴욕 필하모닉 I",
        "cast": "에사페카 살로넨, 뉴욕필하모닉, 크리스티안 짐머만",
        "date": "2025-06-27",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766918032754_IMG_7862%202.jpg?alt=media&token=d9c33fc6-12ea-4dcd-96c6-4c8ee06b2768",
        "program": "베토벤, 피아노협주곡 4번\\n베토벤, 교향곡 제3번 '영웅'",
        "category": "classic",
        "review": "with 은선. 세련되고 스마트한 느낌의 뉴욕필.",
        "rating": 5
    },
    {
        "id": "lbu5QFujQy6mmE9aPwUb",
        "rating": 5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766917796429_IMG_7537%202.jpg?alt=media&token=6892e481-4d24-4761-b3ce-167014cf08f3",
        "program": "바그너, 오페라 <요정들> 서곡\\n부르흐, 바이올린 협주곡 1번\\n베토벤, 교향곡 7번",
        "review": "내겐 올해의 공연. 빅오케를 많이 봤지만, 야쿠프 후르샤와 밤베르크 심포니가 만들어낸 베토벤 교향곡 7번의 도입부를 들었을 때의 감동을 이길 순 없었다.",
        "venue": "예술의전당",
        "date": "2025-06-01",
        "title": "야쿠프 흐루샤 & 밤베르크 심포니",
        "cast": "야쿠프 흐루샤, 밤베르크 심포니, 김봄소리",
        "category": "classic"
    },
    {
        "id": "nuiZwp02PoW0U1AejAwR",
        "date": "2025-05-03",
        "review": "브람스 바이올린 협주곡이 제일 좋았다.",
        "title": "블라디미르 유롭스키 & 베를린 방송교향악단",
        "rating": 4.5,
        "cast": "블라디미르 유롭스키, 베를린 방송교향악단, 레이 첸",
        "category": "classic",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766895396516_%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA%202025-12-28%20%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE%201.12.48.png?alt=media&token=b812cfe3-be33-489d-9b7d-ba883cbfa618",
        "venue": "예술의전당",
        "program": "브람스, 하이든 주제에 의한 변주곡\\n브람스, 바이올린 협주곡\\n브람스, 교향곡1번"
    },
    {
        "id": "193BErDQH7WocIz6hYcS",
        "title": "원스",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766894001093_IMG_7069%202.jpg?alt=media&token=13566564-9edb-4845-82ef-e63fcf6a760a",
        "venue": "코엑스 신한카드 아티움",
        "rating": 4,
        "date": "2025-05-01",
        "category": "musical",
        "program": "뮤지컬 원스",
        "cast": "이충주, 박지연, 박지일, 김진수 등",
        "review": "with 이나. 민영님이 초대해줘서 5월 첫 날을 뮤지컬을 보면서 보냈다."
    },
    {
        "id": "RvkZjTkxdbRGKG9SLfCY",
        "category": "exhibition",
        "cast": "필립 파레노",
        "rating": 5,
        "program": "귀머거리의 집(2021), 마키 시리즈",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766740431853_IMG_6877.JPG?alt=media&token=7cf1d018-bf99-470c-ae21-dc417d487b9e",
        "title": "필립 파레노 개인전",
        "venue": "조현화랑",
        "date": "2025-04-26",
        "review": "with 이나. 고야가 말년에 '검은 회화'를 그렸던 '귀머거리의 집'을 소재로 한 동명 영화가 인상적이었다."
    },
    {
        "id": "JArTQblI33pzmTOD5Ty0",
        "rating": 5,
        "title": "2025 예술의전당 교향악축제 - 경기필하모닉오케스트라",
        "venue": "예술의전당",
        "cast": "경기필, 김선욱",
        "category": "classic",
        "program": "모차르트 피아노협주곡 제26번 D장조 '대관식'\\n말러 교향곡 제5번 C단조",
        "date": "2025-04-20",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766719769262_IMG_6731.jpg?alt=media&token=d6ef7ba1-48c0-4bf2-8a72-2ba7f897bceb",
        "review": "모차르트의 '대관식'의 피아노 솔로를 연주하면서 지휘도 하는 김선욱 멋있었다."
    },
    {
        "id": "94ukCpI3Np7ba5tDClqJ",
        "venue": "예술의전당",
        "date": "2025-04-18",
        "cast": "서울시향, 최수열, 이상 엔더스",
        "title": "예술의전당 교향악축제 2025 - 서울시향",
        "review": "영웅의 생애가 특히 좋아서 돌아오며 CD를 사가지고 왔다.",
        "category": "classic",
        "program": "슈만 첼로협주곡 a단조\\nR.슈트라우스 영웅의 생애 Op.40",
        "rating": 4,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766719573271_IMG_6621.jpg?alt=media&token=2fadacf2-d60b-4414-a1fc-539a347262d0"
    },
    {
        "id": "yvUgWMIQmRYa363HAI7G",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766718922698_IMG_6403.jpg?alt=media&token=e71dd486-8d14-495a-9ecb-f0320b24b6a2",
        "venue": "통영국제음악당",
        "program": "브리튼, 전쟁 레퀴엠",
        "cast": "성시연, 통영페스티벌 오케스트라 ",
        "title": "2025 통영국제음악제 - 통영페스티벌오케스트라 III",
        "date": "2025-04-06",
        "rating": 5,
        "review": "with 은선, 보름. 전쟁으로 무너진 코번트리 성당 재건 기념식을 위해 만든, 반전과 평화와 이로의 노래.",
        "category": "classic"
    },
    {
        "id": "ymHZS2fUMxlFTIf5KVz3",
        "venue": "통영국제음악당",
        "title": "2025 통영국제음악제 - 피에르 불레즈를 기리며",
        "rating": 5,
        "cast": "앙상블 앵테르콩탕포랭, 피에르 블뢰즈",
        "program": "피에르 불레즈 : 삽입절 \\n 버르토크 : 두 대의 피아노와 타악기를 위한 소나타 \\n 피에르 불레즈 : 앙템 \\n 피에르 불레즈 : 삽입절에",
        "date": "2025-04-05",
        "review": "with 은선, 보름. 현대음악...뭘까?",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766718315886_IMG_6325.jpg?alt=media&token=c1ce07d5-bb98-49a3-b548-7670cfea3c77",
        "category": "classic"
    },
    {
        "id": "xg1XaOwqibA1WMJos8yt",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766718443294_IMG_6333.jpg?alt=media&token=689cb93f-6a8a-4418-8ca5-1bf840aeb39a",
        "category": "classic",
        "review": "with 은선, 보름. 원숙함 보다는 자신감이 넘쳐흐르던 무대.",
        "title": "2025 통영국제음악제 - K'ARTS 신포니에타 with 황수미",
        "cast": "황수미, K'ARTS 신포니에타, 윤한결",
        "rating": 4,
        "date": "2025-04-05",
        "program": "힌데미트 : 실내악 1번 \\n 쇤베르크(한스 아브라함센 편곡) : 4개의 가곡 \\n 한스 아브라함센 : 그림 동화 \\n 코른골트 : 헛소동 모음곡 \\n 말러 : 어린이의 이상한 뿔피리(발췌)",
        "venue": "통영국제음악당"
    },
    {
        "id": "RHqkT0qX9IFtY44ZbcW7",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766718103333_IMG_6267.jpg?alt=media&token=82adaf0a-5cee-4e53-9d31-7f5ddcb4425e",
        "rating": 5,
        "venue": "통영국제음악당",
        "date": "2025-04-04",
        "title": "2025 통영국제음악제 - KBS교향악단 with 일란 볼코프",
        "review": "with 은선, 보름. 너무 흥미로운 연주였고, 통영에서만 볼 수 있는 경험이라 좋았다.",
        "category": "classic",
        "cast": "선우예권, 일란 볼코프, 일리야 그린골츠, KBS교향악단",
        "program": "드뷔시 : 어린이차지(아시아 초연/한스 아브라함센 편곡) / 한스 아브라함센 : 왼손을 위한 피아노 협주곡 '레프트, 얼론' / 시벨리우스 : 바이올린 협주곡 d단조"
    },
    {
        "id": "F8Na7BQET1NHWZlcCiwu",
        "date": "2025-03-29",
        "cast": "양손프로젝트",
        "venue": "피크닉",
        "category": "play",
        "title": "피크닉 희곡극장",
        "review": "햇살이 잘 드는 공간에서 모두가 숨 죽이고 낭독극으로 펼쳐지는 극을 보았다.",
        "program": "사무엘베케트 '행복한 날들'",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766717626878_IMG_6187.jpg?alt=media&token=c3d5fea3-1e7e-41eb-8c6a-a4282a63e45a",
        "rating": 5
    },
    {
        "id": "6OUQ1APpqjCC6q75H9p7",
        "date": "2025-03-14",
        "review": "다들 너무 좋았다고 하지만, 나에게는 너무 어려웠다.",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766737927944_IMG_5908.jpg?alt=media&token=57a926e5-e28e-42e9-846b-361ff426c31f",
        "rating": 4,
        "title": "피에르 위그 <리미널>",
        "program": "피에르 위그 아시아 최초 개인전",
        "venue": "리움",
        "category": "exhibition",
        "cast": "피에르 위그"
    },
    {
        "id": "to60CXxRpm8uXmbM73J4",
        "category": "classic",
        "venue": "롯데콘서트홀",
        "review": "정명훈 말러 들으러 간건데, 두 연주자의 모짜르트의 두대의 피아노를 위한 피아노협주곡도 너무 좋았다.",
        "cast": "정명훈, 선우예권, 이가라시 카오루코, KBS교향악단",
        "rating": 5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766717230595_IMG_5804.jpg?alt=media&token=ddf35fb0-7ca8-4dd3-8c7a-81dc8ba03576",
        "program": "모짜르트 피아노협주곡 제 10번, 말러 1번 교향곡",
        "date": "2025-03-03",
        "title": "한·일 국교정상화 60주년 기념 합동연주회"
    },
    {
        "id": "pwIqcw9F2JrnDha2fLFm",
        "review": "리움 프렌즈이고, 요가원이 근처라서 끝나고 종종 갔다.",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766737463992_IMG_5746.jpg?alt=media&token=7c741d94-2304-47f8-9ea9-858d5192590c",
        "category": "exhibition",
        "program": "소장품 중 새로운 작품들을 선보임",
        "title": "리움미술관 현대미술 상설전",
        "venue": "리움",
        "rating": 3.5,
        "date": "2025-03-02",
        "cast": "온 카와라, 도널드 저드 등"
    },
    {
        "id": "R1LTUXjEjnFv2l8YoiLZ",
        "date": "2025-02-28",
        "cast": "윤태호, 효정, 강해인",
        "venue": "국립극장",
        "category": "musical",
        "review": "with 성은. 소설보다 아쉬운 부분도 있었지만, 또 로봇과 인간의 마주침이나 표정을 눈으로 볼 때만 느껴지는 감동과 슬픔이 있었다.",
        "title": "천개의 파랑",
        "program": "천선란의 소설 <천개의 파랑>을 원작으로 한 뮤지컬",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766461608234_IMG_5710.jpg?alt=media&token=df86ac8a-544a-4afe-98f1-d994aeeb9411",
        "rating": 4
    },
    {
        "id": "qmuhID7eHrllcyX417da",
        "review": "제2차 세계대전 이후 호황기부터 2011년 월가 점령 시위에 이르기까지 미국 사회에서 '노동'의 이미지가 어떻게 변했는지 보여준 전시.",
        "venue": "ICP",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766737069307_IMG_5482.jpg?alt=media&token=ba9cbadc-737b-4b36-80ea-45e8588e2c1d",
        "program": "미국의 일자리와 노동의 역사에 관한 사진전",
        "rating": 5,
        "cast": "로버트 프랭크, 수잔 메이젤라스, 베티 레인, 바바라 노플릿 등",
        "date": "2025-02-06",
        "category": "exhibition",
        "title": "American Job : 1940-2011"
    },
    {
        "id": "QSzvex2eMzazpsT9VUEN",
        "date": "2025-02-05",
        "review": "3시간에 걸친 연주에 하나도 지치지 않는 조성진이 너무 신기하고 또 대단했다.",
        "venue": "카네기홀(뉴욕)",
        "rating": 5,
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766390531990_KakaoTalk_Photo_2025-12-22-16-59-04.jpeg?alt=media&token=bf93c0a3-a7be-4ffa-8997-9dc9bb16db94",
        "category": "classic",
        "title": "조성진 피아노리사이틀",
        "program": "라벨 피아노 독주곡 전곡",
        "cast": "조성진"
    },
    {
        "id": "LbbISqqrZy5MU7mCT8bm",
        "rating": 5,
        "title": "상설전 ActivistNY",
        "venue": "뉴욕시립박물관",
        "program": "지난 400년 동안 뉴욕이 어떤 방식으로 싸워왔는지 보여주는 전시",
        "cast": "뉴욕의 다양한 액티비스트들",
        "date": "2025-02-05",
        "review": "셜리 치점 전시처럼 아카이브와 스토리텔링 넘 잘했놓은 전시.",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766736677200_IMG_5356.jpg?alt=media&token=1e3dd7f5-9292-453d-98c7-914cdfcad4c8",
        "category": "exhibition"
    },
    {
        "id": "CGjGjCx3VHlqh4OL6DVZ",
        "date": "2025-02-05",
        "venue": "뉴욕시립박물관",
        "cast": "셜리 치점",
        "title": "Changing the Face of Democracy: Shirley Chisholm at 100",
        "rating": 5,
        "program": "미 의회 최초의 흑인 여상 하원의원이자 대통령 후보 셜리 치점의 일대기",
        "category": "exhibition",
        "review": "미국인들은 타고난 이야기꾼이라고 생각한다.",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766736430512_IMG_5349.jpg?alt=media&token=da310c8c-0c0e-4d53-bb4f-f213a18bce16"
    },
    {
        "id": "qTQTzr14XK9fChMA4hJq",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766736000362_IMG_5222.jpg?alt=media&token=090a94fa-c8a5-4140-8b57-3d03739d8c4a",
        "category": "exhibition",
        "review": "오토봉 캉가의 작품을 꼭 보라고 선문님이 추천해줘서 모마에 보러 갔다.",
        "cast": "오토봉 캉가, 프리다 칼로, 루이스 부르주아, 아나 멘디에타 등",
        "title": "케이던스,  바이탈 사인 : 예술가와 신체",
        "rating": 4.5,
        "date": "2025-02-04",
        "program": "모마 아트리움의 대형 태피스트리, 여성 작가들의 작품을 주제로한 몸에 대한 이야기",
        "venue": "MoMA"
    },
    {
        "id": "GBPMDT7bcUVkWrm1JCba",
        "rating": 5,
        "date": "2025-02-03",
        "title": "Edges of Ailey",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766734567038_IMG_5165.jpg?alt=media&token=2fa7771c-4147-4b1f-a6be-5e596d32dbc6",
        "program": "전설적인 안무가 앨빈 에일리의 삶과 예술 세계에 대한 특별전",
        "review": "이번 뉴욕 여행 중 가장 좋았던 전시.",
        "cast": "장 미셸 바스키아, 로메어 비어든, 페이스링골드, 카라워커 등",
        "category": "exhibition",
        "venue": "휘트니뮤지엄"
    },
    {
        "id": "YEjx11GUXhTQjjq2LkMc",
        "review": "사진으로만 보던 리처드 세라의 조각, 펠릭스 곤잘레스 토레스의 설치 미술을 볼 수 있어 좋았다.",
        "cast": "펠릭스 곤잘레스 토레스, 루이스 부르주아, 도날드 저드, 온 카와라",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766733533321_IMG_5074.jpg?alt=media&token=d50766c2-ca97-4fcc-9f61-886624e55b0d",
        "date": "2025-02-02",
        "category": "exhibition",
        "title": "디아비콘 상설전",
        "program": "1960년대 이후 현대미술 상설전",
        "rating": 5,
        "venue": "디아비콘"
    },
    {
        "id": "CfGjAZI1RvO5sVwuKAMr",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/full-of-zoey.firebasestorage.app/o/posters%2F1766729015404_IMG_4988.jpg?alt=media&token=cdb2c8e5-5dd3-4940-aefb-23bef71f0462",
        "venue": "메트로폴리탄 뮤지엄",
        "program": "MET이 소장한 현대미술 위주로 관람",
        "date": "2025-02-01",
        "review": "뉴욕에 도착하자마자 숙소에 짐을 풀고, 메트로폴리탄 뮤지엄에 갔다.",
        "cast": "잭슨 폴락, Kahil El'Zabar, 벨라스케스, 폴 고갱, 모네",
        "category": "exhibition",
        "title": "메트로폴리탄 뮤지엄 상설전",
        "rating": 4.5
    }
];

const ADMIN_EMAIL = "honggiina@gmail.com";


// --- Initialization ---
let unsubscribe = null; // Store listener to detach later

function init() {
    console.log('[Init] Starting app...');

    // 0. Ensure emptyState is hidden
    if (emptyState) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('show');
    }

    // 1. INSTANT RENDER: Try cache first, then fallback to INITIAL_DATA
    const cachedRecords = loadFromCache();

    if (cachedRecords && cachedRecords.length > 0) {
        // Use cached data for instant display
        console.log('[Init] Using cached data for instant render');
        records = cachedRecords;
        isLoading = false;
        renderRecords();
        updateStats();
    } else if (INITIAL_DATA && INITIAL_DATA.length > 0) {
        // Fallback to INITIAL_DATA for first-time visitors
        console.log('[Init] Using INITIAL_DATA for instant render');
        records = INITIAL_DATA.map((item, index) => ({
            ...item,
            id: `initial_${index}` // Temporary ID
        }));
        isLoading = false;
        renderRecords();
        updateStats();
    } else {
        // No cache, no initial data - show skeleton
        renderSkeleton();
    }

    // 2. BACKGROUND SYNC: Start Firebase sync (will update data silently)
    if (!unsubscribe) {
        subscribeToData();
    }

    // 3. Auth Listener (For UI & Permissions only)
    auth.onAuthStateChanged((currentUser) => {
        user = currentUser;
        updateAuthUI();

        // Admin Button Logic
        const isAdmin = user && user.email === ADMIN_EMAIL;
        if (!detailModal.classList.contains('hidden')) {
            if (isAdmin) headerDeleteBtn.classList.remove('hidden');
            else headerDeleteBtn.classList.add('hidden');
        }

        // Admin-only: Add backup link to footer
        const footer = document.querySelector('footer');
        const existingBackupLink = document.getElementById('backupLink');
        if (isAdmin && footer && !existingBackupLink) {
            const backupLink = document.createElement('a');
            backupLink.id = 'backupLink';
            backupLink.innerText = "💾 데이터 백업 (Excel)";
            backupLink.style.cssText = "display:block; margin-top:10px; color:#888; font-size:0.8rem; cursor:pointer; text-decoration:underline;";
            backupLink.onclick = window.exportToCSV;
            footer.appendChild(backupLink);
        } else if (!isAdmin && existingBackupLink) {
            existingBackupLink.remove();
        }
    });
}

function subscribeToData() {
    console.log('[Firebase] Starting background sync...');

    // Don't show loading state if we already have data rendered
    const hadPreviousData = records.length > 0;

    // Optimization: Limit to 50 items initially
    unsubscribe = db.collection("records").orderBy("date", "desc").limit(50)
        .onSnapshot((snapshot) => {
            const newRecords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`[Firebase] Received ${newRecords.length} records`);

            // Only update if we got data, OR if user is admin (admin can have 0 records)
            const isAdmin = user && user.email === ADMIN_EMAIL;
            if (newRecords.length > 0) {
                records = newRecords;
                saveToCache(records);
                renderRecords();
                updateStats();
            } else if (isAdmin) {
                // Admin with empty database - show actual empty state
                records = newRecords;
                renderRecords();
                updateStats();
            } else {
                // Anonymous user with 0 Firebase results - keep INITIAL_DATA
                console.log('[Firebase] Empty result for anonymous user, keeping initial data');
            }
            isLoading = false;

        }, (error) => {
            console.error("[Firebase] Data sync error:", error);
            isLoading = false;

            // If we already have data (from cache/INITIAL_DATA), keep showing it
            if (records.length > 0) {
                console.log('[Firebase] Error occurred but using cached/initial data');
                return; // Don't show error, keep current data
            }

            // Only show error if we have no data at all
            contentArea.innerHTML = `
                <div style="text-align:center; padding:3rem 1rem; color:#666;">
                    <p style="font-size:1.1rem; margin-bottom:0.5rem;">데이터를 불러오는 중 문제가 발생했습니다</p>
                    <p style="font-size:0.85rem; color:#999;">잠시 후 다시 시도해주세요</p>
                    <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1rem; border:1px solid #ddd; border-radius:4px; background:#fff; cursor:pointer;">새로고침</button>
                </div>
            `;
            if (paginationControls) paginationControls.classList.add('hidden');
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

// --- Import/Export Logic ---
const importBtn = document.getElementById('importBtn');
if (importBtn) {
    importBtn.addEventListener('click', async () => {
        if (!confirm(`총 ${INITIAL_DATA.length}개의 데모 데이터를 가져오시겠습니까?`)) return;
        // ... (Import logic remains same) ...
    });
}

// Global Export Function (Accessible from Console or Button)
window.exportToCSV = function () {
    if (!records || records.length === 0) {
        alert("다운로드할 데이터가 없습니다. (화면에 목록이 로딩된 후 시도해주세요)");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Korean Excel support
    csvContent += "Title,Date,Category,Rating,Venue,Cast,Review,ImageURL\n";

    records.forEach(r => {
        // Escape quotes
        const safe = (text) => text ? `"${String(text).replace(/"/g, '""')}"` : '""';

        const row = [
            safe(r.title),
            safe(r.date),
            safe(r.category),
            safe(r.rating),
            safe(r.venue),
            safe(r.cast),
            safe(r.review ? r.review.replace(/\n/g, ' ') : ''),
            safe(r.imageUrl)
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `culture_log_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Backup link is only shown for admin users (added in auth state listener)

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

// Helper: Compress Image
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const maxWidth = 1200;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.7); // 70% Quality
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

imageInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
        let file = e.target.files[0];

        // Compress if image (skip if SVG or GIF if desired, but general images are fine)
        if (file.type.startsWith('image/')) {
            try {
                // Show loading state if needed, or just wait
                file = await compressImage(file);
                console.log(`Compressed: ${(file.size / 1024).toFixed(2)} KB`);
            } catch (err) {
                console.error("Compression failed, using original", err);
            }
        }

        selectedFile = file;

        // Show Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            dropZone.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        };
        reader.readAsDataURL(selectedFile);

        // Simulation Prompt
        setTimeout(() => {
            // Only run simulation if NOT editing
            if (!isEditing) {
                if (confirm("이미지를 분석하시겠습니까? (시뮬레이션: 정보를 자동으로 입력합니다)")) {
                    document.getElementById('inputTitle').value = "새로운 문화 기록";
                    document.getElementById('inputDate').value = new Date().toISOString().split('T')[0];
                }
            }
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
    const imgElement = document.getElementById('detailImage');
    imgElement.src = record.imageUrl;
    imgElement.style.objectFit = "cover"; // Enforce via JS
    imgElement.style.width = "100%";
    imgElement.style.height = "100%";

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
    // Use .show class for emptyState (CSS hides by default)
    if (isLoading) {
        // Keep skeleton and hide emptyState during loading
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('show');
        }
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    if (totalItems === 0) {
        // Only show empty state AFTER loading is complete AND records is truly empty
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('show');
        }
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    } else {
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('show');
        }
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
                    <span class="item-title pointer">${record.title}</span>
                    <span class="item-date">${formatDate(record.date)}</span>
                </div>
                <div class="item-meta mobile-stack">
                    ${record.cast ? `<div class="item-cast"><i class="ph-bold ph-users"></i> ${record.cast}</div>` : ''}
                    ${record.venue ? `<div class="item-venue"><i class="ph-bold ph-map-pin"></i> ${record.venue}</div>` : ''}
                </div>
                ${record.program ? `<div class="item-program text-truncate" style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem; cursor:pointer;">${categoryEmoji} ${formatText(record.program)}</div>` : ''}
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
