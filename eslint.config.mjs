import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * ESLint flat config
 *
 * 왜 `next lint` 가 아닌가:
 * - `next lint` 는 Next.js 16 에서 제거됩니다. 게다가 이 리포에는 설정 파일이 아예 없어서
 *   `npm run lint` 가 대화형 설치 안내로 빠지고 있었습니다 — 아무도 검사하지 않는 상태였습니다.
 * - `next lint` 는 정해진 디렉터리(app/components/lib 등)만 봅니다. flat config 는
 *   `eslint .` 로 저장소 전체를 보므로 사각지대가 생기지 않습니다.
 *
 * 규칙 세트는 다른 메이플랜드 유틸들과 맞춥니다(next/core-web-vitals + next/typescript).
 * eslint-config-next 15 에는 아직 subpath export 가 없어서 FlatCompat 으로 얹습니다.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  {
    // 빌드 산출물 / 의존성 / 자동 생성 파일은 검사하지 않습니다.
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', '.cursor/**']
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript')
];

export default eslintConfig;
