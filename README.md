# Full of Zoey

개인 문화생활 기록 웹앱 - 보고, 듣고, 경험한 모든 것들의 기록

**Live Demo:** [https://full-of-zoey.github.io/culture_log/](https://full-of-zoey.github.io/culture_log/)

## Features

- **다양한 카테고리 지원** - 클래식, 뮤지컬, 연극, 전시, 영화, 콘서트
- **목록/갤러리 뷰** - 두 가지 보기 모드 전환
- **카테고리 필터** - 원하는 장르만 필터링
- **상세 기록** - 제목, 날짜, 장소, 출연진, 프로그램, 평점, 한줄평
- **이미지 업로드** - 공연/전시 포스터 및 사진 첨부
- **통계 대시보드** - 올해 관람 수, 평균 평점, 가장 많이 본 장르
- **오프라인 지원** - localStorage 캐싱으로 빠른 로딩
- **반응형 디자인** - 모바일/데스크톱 최적화

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Firebase (Firestore, Authentication, Storage)
- **Hosting:** GitHub Pages
- **Font:** Pretendard
- **Icons:** Phosphor Icons

## Architecture

```
culture_log/
├── index.html      # 메인 HTML (SPA)
├── app.js          # 애플리케이션 로직
├── style.css       # 스타일시트
└── 공연사진들/      # 로컬 이미지 저장소
```

### 주요 기능 구현

- **하이브리드 캐싱**: localStorage 우선 로드 + Firebase 백그라운드 동기화
- **REST API 폴백**: 인앱 브라우저(Instagram 등) 대응
- **Google OAuth**: 관리자 인증
- **이미지 압축**: 클라이언트 사이드 리사이즈 (최대 1200px, 70% 품질)

## Setup

1. Firebase 프로젝트 생성 후 `firebaseConfig` 수정
2. Firestore 보안 규칙 설정
3. GitHub Pages 또는 원하는 호스팅에 배포

## License

MIT License

---

Built with Firebase & GitHub Pages
