# 날개 면적비 계산기

정적 웹앱입니다. `index.html`을 브라우저로 열면 바로 실행됩니다.
숫자 입력칸과 슬라이더가 서로 연결되어 있어 둘 중 어느 쪽으로 입력해도 계산됩니다.

## 수정 위치

- `calculator.js`: 날개별 기준값, 면적 공식, 점수 계산 로직
- `app.js`: 화면 입력값 연결, 결과 렌더링, 날개 미리보기
- `styles.css`: 화면 디자인

날개 미리보기는 SVG 좌표를 직접 보간해서 날개 종류나 치수 변경 시 부드럽게 변형됩니다.

## 기준값 바꾸기

날개별 속도, 기동성, 연료 효율, 안정성 기준값은 `calculator.js`의 `wingProfiles`에서 수정합니다.

```js
baseScores: { speed: 76, maneuverability: 64, fuel: 58, stability: 70 }
```

면적비 기준점은 `idealAspectRatio`를 바꾸면 됩니다.

```js
idealAspectRatio: 5.5
```

현재 점수는 실제 항공 설계 해석이 아니라 비교용 간이 추정값입니다.

## GitHub Pages 배포

이 프로젝트는 별도 빌드 과정이 없는 정적 웹앱입니다. GitHub 저장소의 루트에 아래 파일들이 있으면 GitHub Pages로 바로 배포할 수 있습니다.

- `index.html`
- `styles.css`
- `app.js`
- `calculator.js`
- `.nojekyll`

배포 흐름:

1. GitHub에 새 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소 루트에 올립니다.
3. 저장소 Settings에서 Pages로 이동합니다.
4. Source를 `Deploy from a branch`로 설정합니다.
5. Branch는 `main`, folder는 `/root`를 선택합니다.

배포 후 주소는 보통 `https://사용자명.github.io/저장소명/` 형태입니다.
