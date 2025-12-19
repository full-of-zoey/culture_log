// DOM Elements
const appContainer = document.querySelector('.app-container');
const contentArea = document.getElementById('contentArea');
const authBtn = document.getElementById('authBtn');
const addBtn = document.getElementById('addBtn');

// Modals
const loginModal = document.getElementById('loginModal');
const writeModal = document.getElementById('writeModal');
const detailModal = document.getElementById('detailModal');
const adminPasswordInput = document.getElementById('adminPassword');
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

// State
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let records = JSON.parse(localStorage.getItem('culture_log_data')) || [];
let currentView = 'list'; // list or gallery

// --- Initialization ---
function init() {
    updateAuthUI();
    renderRecords();
    updateStats();
}

// --- Auth Logic ---
authBtn.addEventListener('click', () => {
    if (isAdmin) {
        // Logout
        isAdmin = false;
        localStorage.setItem('isAdmin', 'false');
        updateAuthUI();
    } else {
        // Open Login Modal
        loginModal.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
});

confirmLoginBtn.addEventListener('click', () => {
    const pwd = adminPasswordInput.value;
    if (pwd === '1234') { // Simple secret for tutorial
        isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        loginModal.classList.add('hidden');
        updateAuthUI();
    } else {
        alert('비밀번호가 틀렸습니다. (힌트: 1234)');
    }
});

cancelLoginBtn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

function updateAuthUI() {
    if (isAdmin) {
        authBtn.textContent = 'Logout';
        addBtn.classList.remove('hidden');
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

        // Update Buttons
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Content Class
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

// Image Simulation
const imageInput = document.getElementById('imageInput');
let uploadedImageData = null; // Store Data URI

// Image Simulation
dropZone.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        // 1. Show Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageData = e.target.result;
            dropZone.innerHTML = `<img src="${uploadedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        };
        reader.readAsDataURL(file);

        // 2. Simulate Analysis
        setTimeout(() => {
            const isConfirmed = confirm("이미지를 분석하시겠습니까? (시뮬레이션: '조성진 리사이틀' 정보를 자동으로 입력합니다)");

            if (isConfirmed) {
                document.getElementById('inputTitle').value = "조성진 피아노 리사이틀";
                document.getElementById('inputDate').value = new Date().toISOString().split('T')[0];
                document.getElementById('inputCategory').value = "classic";
                document.getElementById('inputCast').value = "조성진(Piano)";
                document.getElementById('inputProgram').value = "쇼팽: 스케르초 1-4번, 브람스: 헨델 변주곡";
                document.getElementById('inputVenue').value = "예술의전당 콘서트홀";
                document.getElementById('inputReview').value = "쇼팽의 선율이 영혼을 울렸다. 특히 앵콜로 연주한 영웅 폴로네이즈는 압권이었다.";
            }
        }, 300);
    }
});

recordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newRecord = {
        id: Date.now(),
        title: document.getElementById('inputTitle').value,
        date: document.getElementById('inputDate').value,
        category: document.getElementById('inputCategory').value,
        cast: document.getElementById('inputCast').value,
        program: document.getElementById('inputProgram').value,
        rating: parseFloat(document.getElementById('inputRating').value),
        venue: document.getElementById('inputVenue').value,
        review: document.getElementById('inputReview').value,
        // Use uploaded image if exists, else random fallback
        imageUrl: uploadedImageData || `https://source.unsplash.com/random/300x450/?${document.getElementById('inputCategory').value},concert`
    };

    records.unshift(newRecord); // Add to top
    localStorage.setItem('culture_log_data', JSON.stringify(records));

    writeModal.classList.add('hidden');
    recordForm.reset();
    ratingValue.textContent = "5.0";

    // Reset Upload Area
    uploadedImageData = null;
    dropZone.innerHTML = `
        <i class="ph ph-camera"></i>
        <p>이미지 업로드 또는 붙여넣기<br><span class="sub-text">(자동 분석 시뮬레이션)</span></p>
    `;

    renderRecords();
    updateStats();
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

    if (isAdmin) {
        headerDeleteBtn.classList.remove('hidden');
    } else {
        headerDeleteBtn.classList.add('hidden');
    }

    detailModal.classList.remove('hidden');
}

headerDeleteBtn.addEventListener('click', () => {
    if (confirm('정말 삭제하시겠습니까?')) {
        records = records.filter(r => r.id !== currentDetailId);
        localStorage.setItem('culture_log_data', JSON.stringify(records));
        renderRecords();
        updateStats();
        detailModal.classList.add('hidden');
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

            // In List view, make the title clickable
            el.querySelector('.item-title').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling if we added click to row later
                showDetail(record);
            });
        } else {
            // Gallery View
            el = document.createElement('div');
            el.className = 'gallery-item';
            // Placeholder color if image fails
            el.innerHTML = `
                <img src="${record.imageUrl}" alt="${record.title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="gallery-overlay">
                    <div class="gallery-title">${record.title}</div>
                    <div class="gallery-rating">★ ${record.rating}</div>
                    ${record.cast ? `<div style="font-size:0.75rem; opacity:0.8">${record.cast}</div>` : ''}
                </div>
            `;
            // Add click for detail (Gallery item)
            el.addEventListener('click', () => showDetail(record));
        }

        contentArea.appendChild(el);
    });
}

// --- Data Analysis Logic (Simple Stats) ---
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
