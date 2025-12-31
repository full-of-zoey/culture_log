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
const CACHE_VERSION = 'v4';

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
// --- Data Configuration ---
// INITIAL_DATA removed - now using cache-based system
// First visitors: Show skeleton → Firebase load → Cache save
// Return visitors: Cache load (instant) → Firebase sync (background)
const INITIAL_DATA = [];
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

    // 1. INSTANT RENDER: Try cache first
    const cachedRecords = loadFromCache();

    if (cachedRecords && cachedRecords.length > 0) {
        // Return visitor: Use cached data for instant display
        console.log('[Init] Using cached data for instant render');
        records = cachedRecords;
        isLoading = false;
        renderRecords();
        updateStats();
    } else {
        // First visitor: Show skeleton while loading from Firebase
        console.log('[Init] No cache - showing skeleton');
        renderSkeleton();

        // Timeout for first-time visitors: Show helpful message if loading takes too long
        setTimeout(() => {
            if (isLoading && records.length === 0) {
                console.log('[Init] Loading timeout - showing retry message');
                contentArea.innerHTML = `
                    <div style="text-align:center; padding:3rem 1rem; color:#666;">
                        <p style="font-size:1.1rem; margin-bottom:0.5rem;">데이터를 불러오는 중입니다...</p>
                        <p style="font-size:0.85rem; color:#999;">네트워크 상태를 확인해주세요</p>
                        <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1rem; border:1px solid #ddd; border-radius:4px; background:#fff; cursor:pointer;">새로고침</button>
                    </div>
                `;
            }
        }, 10000); // 10 seconds timeout
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

            // Only update if we got data from Firebase
            if (newRecords.length > 0) {
                records = newRecords;
                saveToCache(records);
                isLoading = false;  // Set BEFORE render
                renderRecords();
                updateStats();
            } else if (records.length > 0) {
                // Firebase returned empty but we have existing data - keep it
                console.log('[Firebase] Empty result but keeping existing data');
                isLoading = false;
            } else {
                // No data anywhere - show empty state
                console.log('[Firebase] No data available');
                isLoading = false;  // Set BEFORE render
                renderRecords();
                updateStats();
            }

        }, (error) => {
            console.error("[Firebase] Data sync error:", error);
            isLoading = false;

            // If we already have data (from cache), keep showing it
            if (records.length > 0) {
                console.log('[Firebase] Error occurred but using cached data');
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
// Import button removed - INITIAL_DATA is now empty (cache-based system)

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
