import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

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
const headerDeleteBtn = document.getElementById('headerDeleteBtn');

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

// --- State ---
let user = null; // Current logged in user
let records = []; // Synced from Firestore
let currentView = 'list'; // list or gallery
const ADMIN_EMAIL = "honggiina@gmail.com";

// --- Initialization ---
function init() {
    // Auth Listener
    onAuthStateChanged(auth, (currentUser) => {
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
    const q = query(collection(db, "records"), orderBy("date", "desc"));
    onSnapshot(q, (snapshot) => {
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
        signOut(auth).then(() => {
            alert('로그아웃 되었습니다.');
        });
    } else {
        // Login with Google
        signInWithPopup(auth, provider)
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
    if (user) {
        authBtn.textContent = 'Logout';
        if (user.email === ADMIN_EMAIL) {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }
    } else {
        authBtn.textContent = 'Login';
        addBtn.classList.add('hidden');
    }
}

// --- View Toggle Logic ---
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        currentView = view;
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contentArea.className = `view-${view}`;
        renderRecords();
    });
});

// --- CRUD Logic ---
addBtn.addEventListener('click', () => {
    writeModal.classList.remove('hidden');
});

closeWriteBtn.addEventListener('click', () => {
    writeModal.classList.add('hidden');
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

recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button to prevent double submit
    const submitBtn = recordForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "저장 중...";

    try {
        let imageUrl = `https://source.unsplash.com/random/300x450/?${document.getElementById('inputCategory').value},concert`; // Fallback

        // 1. Upload Image if exists
        if (selectedFile) {
            const storageRef = ref(storage, 'posters/' + Date.now() + '_' + selectedFile.name);
            const snapshot = await uploadBytes(storageRef, selectedFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        // 2. Save Data to Firestore
        await addDoc(collection(db, "records"), {
            title: document.getElementById('inputTitle').value,
            date: document.getElementById('inputDate').value,
            category: document.getElementById('inputCategory').value,
            cast: document.getElementById('inputCast').value,
            program: document.getElementById('inputProgram').value,
            rating: parseFloat(document.getElementById('inputRating').value),
            venue: document.getElementById('inputVenue').value,
            review: document.getElementById('inputReview').value,
            imageUrl: imageUrl,
            createdAt: serverTimestamp(),
            userId: user.uid // Track who created it
        });

        // 3. Cleanup
        writeModal.classList.add('hidden');
        recordForm.reset();
        ratingValue.textContent = "5.0";
        selectedFile = null;
        dropZone.innerHTML = `
            <i class="ph ph-camera"></i>
            <p>이미지 업로드 또는 붙여넣기<br><span class="sub-text">(자동 분석 시뮬레이션)</span></p>
        `;

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "저장하기";
    }
});

// Detail View Logic
closeDetailBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

closeDetailBottomBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
});

let currentDetailId = null;

function showDetail(record) {
    currentDetailId = record.id;
    document.getElementById('detailImage').src = record.imageUrl;
    document.getElementById('detailCategory').textContent = formatCategory(record.category);
    document.getElementById('detailTitle').textContent = record.title;
    document.getElementById('detailDate').textContent = formatDate(record.date);
    document.getElementById('detailVenue').textContent = record.venue || '-';
    document.getElementById('detailCast').textContent = record.cast || '-';
    document.getElementById('detailProgram').textContent = record.program || '-';
    document.getElementById('detailRating').textContent = `★ ${record.rating}`;
    document.getElementById('detailReview').textContent = record.review;

    // Only show delete if user is logged in AND is admin
    if (user && user.email === ADMIN_EMAIL) {
        headerDeleteBtn.classList.remove('hidden');
    } else {
        headerDeleteBtn.classList.add('hidden');
    }

    detailModal.classList.remove('hidden');
}

headerDeleteBtn.addEventListener('click', async () => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    if (confirm('정말 삭제하시겠습니까? (복구할 수 없습니다)')) {
        try {
            await deleteDoc(doc(db, "records", currentDetailId));
            detailModal.classList.add('hidden');
            // No need to call renderRecords(), onSnapshot will trigger automatically!
        } catch (error) {
            console.error("Error removing document: ", error);
            alert("삭제 실패: " + error.message);
        }
    }
});

// --- Render Logic ---
function renderRecords() {
    contentArea.innerHTML = '';

    if (records.length === 0) {
        contentArea.innerHTML = '<div class="empty-state"><p>아직 기록이 없습니다.</p></div>';
        return;
    }

    records.forEach(record => {
        let el;
        if (currentView === 'list') {
            el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <div class="item-header">
                    <span class="item-title pointer" style="cursor:pointer; text-decoration:underline; text-decoration-color:transparent; transition: text-decoration-color 0.3s; ">${record.title}</span>
                    <span class="item-date">${formatDate(record.date)}</span>
                </div>
                <div class="item-meta">
                    <span class="item-category">${formatCategory(record.category)}</span>
                    ${record.cast ? `<span class="item-cast"> | ${record.cast}</span>` : ''}
                    <span class="item-venue">${record.venue ? ` | ${record.venue}` : ''}</span>
                    <span class="star-rating">★ ${record.rating}</span>
                </div>
                ${record.program ? `<div style="font-size:0.9rem; color:#555; margin-bottom:0.5rem;">🎵 ${record.program}</div>` : ''}
                <div class="item-review">${record.review}</div>
            `;

            el.querySelector('.item-title').addEventListener('click', (e) => {
                e.stopPropagation();
                showDetail(record);
            });
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

    // 3. Top Genre
    const counts = {};
    records.forEach(r => {
        counts[r.category] = (counts[r.category] || 0) + 1;
    });
    const topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    statGenre.textContent = formatCategory(topGenre);

    // 4. This Year
    const thisYear = new Date().getFullYear();
    const countYear = records.filter(r => new Date(r.date).getFullYear() === thisYear).length;
    statYear.textContent = countYear;
}

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
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

// Run
init();
