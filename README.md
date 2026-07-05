# HANSOL PARK 포트폴리오 사이트

배경원화 경험을 바탕으로 Unity 기반 플레이어블 프로토타입을 직접 제작하는 1인 개발자
**박한솔(HANSOL PARK)**의 포트폴리오 사이트입니다. Unity Gameplay 프로그래밍 역량과
배경원화/일러스트 역량을 함께 보여주는 것을 목표로 제작되었습니다.

## 프로젝트 목표

- 1인 개발 / Unity Gameplay / Enemy AI / 아트 기반 테크니컬 기획 포지션 지원을 위한 포트폴리오
- 게임 개발 프로젝트(코드/시스템 관점)와 일러스트레이션(아트 관점)을 한 페이지에서 모두 보여주기
- Notion 이력서, GitHub, ArtStation 등 기존에 정리된 자료를 연결하는 허브 역할

## 현재 완료된 기능

- **Hero 섹션**: 이름, 포지션, 핵심 소개 문구, CTA 버튼
- **About 섹션**: 자기소개, 강점 4가지 카드(Scene/Prefab 개발, 아트+기획+구현, Enemy AI, 검증 가능한 기록), 기술 스택 태그
- **Game Development 섹션**: HorrorStealth(2D 스텔스 호러), Corridor Commander(3D 코리도 디펜스) 2개 프로젝트를
  역할/핵심기능/문제-판단/근거 구조로 상세 소개, GitHub·빌드·영상·발표자료 링크 연결
- **Illustration 섹션**: ArtStation에 게시된 작품 중 8점을 갤러리 형태로 소개, 클릭 시 라이트박스로 원본 확대,
  ArtStation 프로필 전체보기 링크
- **Career & Education 타임라인**: 2022~2025 경력 사항 및 남서울대학교 학력 사항
- **Contact 섹션**: Notion 이력서, GitHub, ArtStation 링크
- 반응형 디자인(모바일/태블릿/데스크톱), 스크롤 리빌 애니메이션, 모바일 햄버거 메뉴

## 파일 구조

```
index.html              메인 페이지 (전체 원페이지 구성)
css/style.css           커스텀 스타일 (Tailwind 보완)
js/main.js              스크롤 애니메이션, 라이트박스, 모바일 메뉴, 네비게이션 하이라이트
images/portfolio/       ArtStation 작품 이미지 및 프로필 사진
```

## 참고한 원본 자료 (외부 링크)

- GitHub: [Corridor_Commander](https://github.com/park12347789/Corridor_Commander)
- GitHub: [horrorescape (HorrorStealth)](https://github.com/park12347789/horrorescape)
- ArtStation: [clrool (HANSOL PARK)](https://www.artstation.com/clrool)
- Notion 이력서: [1인 개발 / Unity Gameplay](https://mighty-triangle-fae.notion.site/1-Unity-Gameplay-944b95131086836993ff016b8f7fdc50)

## 기능 진입 경로 (섹션 앵커)

| 경로 | 설명 |
|---|---|
| `index.html#hero` | 메인 히어로 |
| `index.html#about` | 소개 및 기술 스택 |
| `index.html#games` | 게임 개발 프로젝트 2종 |
| `index.html#illustration` | 일러스트 갤러리 |
| `index.html#career` | 경력/학력 타임라인 |
| `index.html#contact` | 연락처 및 외부 링크 |

## 데이터/저장소

- 별도의 백엔드 테이블(RESTful Table API)은 사용하지 않는 순수 정적 사이트입니다.
- 모든 콘텐츠는 `index.html` 내부에 하드코딩되어 있으며, 이미지 자산은 `images/portfolio/`에 저장되어 있습니다.

## 아직 구현되지 않은 기능 / 추후 개선 아이디어

- Notion 이력서를 PDF로 변환해 사이트 내에서 바로 다운로드/미리보기 제공
- 프로젝트별 상세 페이지 분리 (현재는 원페이지 내 상세 설명으로 대체)
- 다국어(영문) 버전 지원 (해외 채용 지원 시 유용)
- ArtStation 작품 43개 전체를 불러오는 자동 연동(현재는 대표 작품 8점만 선별 게시)
- 연락처 폼(이메일 전송)은 정적 사이트 한계상 별도의 폼 서비스(Formspree 등, 인증 불필요 API) 연동 필요 시 추가 가능

## 다음 단계 추천

1. 실제 이력서/포트폴리오 PDF 파일을 받아 사이트에 다운로드 버튼으로 연결
2. 대표작 8점 외에 추가로 강조하고 싶은 작품이 있다면 알려주시면 갤러리에 추가
3. 프로젝트 썸네일을 실제 게임 스크린샷으로 교체하고 싶다면 스크린샷 제공 요청
4. 컬러 톤(현재 앰버&틸 다크 테마)에 대한 피드백 반영

## 배포

퍼블리시(배포)가 필요하면 **Publish 탭**에서 원클릭으로 배포할 수 있습니다.
