---
name: git-workflow
description: Padrão de branch, commit e pull request do Mapbook (Conventional Commits, uma branch e uma PR por módulo, squash merge). Use ao criar branch, escrever mensagem de commit, abrir ou descrever PR, ou quando o usuário pedir para commitar, subir ou abrir PR.
---

# Fluxo de git do Mapbook

## Regras

- Nunca commitar direto na `main`. Todo trabalho entra por PR.
- Um módulo = uma branch = uma PR. Módulo é uma entrega que se revisa sozinha (ex.: setup do monorepo, auth na API, índice SQLite, telas Mundo/País/Cidade).
- PR que mistura dois módulos é dividida antes de abrir.
- Merge por squash. O título da PR vira o commit da `main`, então segue o mesmo formato de commit.
- Não fazer merge sem o usuário aprovar.

## Branch

Formato `<tipo>/<escopo>-<descricao-curta>`, kebab-case, sem acento.

```
chore/repo-setup-monorepo
feat/api-auth-jwt
feat/mobile-indice-galeria
fix/domain-quebra-trajeto
```

Sempre a partir da `main` atualizada:

```bash
git switch main && git pull --ff-only
git switch -c feat/api-auth-jwt
```

## Commit

[Conventional Commits](https://www.conventionalcommits.org/). Tipo e escopo em inglês, descrição em português, no imperativo, começando em minúscula, sem ponto final, cabeçalho até 72 caracteres. Siglas mantêm a caixa (`JWT`, `SQLite`).

```
<tipo>(<escopo>): <descrição>

<corpo opcional: o porquê, não o como>
```

**Tipos:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.

**Escopos:** `mobile`, `web`, `api`, `domain`, `contracts`, `infra` (docker, banco, deploy), `repo` (configuração da raiz, lint, tooling), `deps`, `skills`.

Exemplos:

```
feat(api): validar identity token da apple e emitir jwt
fix(domain): quebrar trajeto quando o salto passa de 300 km
chore(repo): configurar workspace pnpm e typescript base
build(deps): atualizar expo para o sdk mais recente
```

Mudança incompatível: `feat(api)!: ...` e rodapé `BREAKING CHANGE: <o que quebra>`.

Commits pequenos dentro da branch, cada um compilando. O `commitlint` no hook `commit-msg` rejeita mensagem fora do padrão; corrigir a mensagem, nunca usar `--no-verify`.

## Testes

Toda PR que adiciona ou muda comportamento traz teste unitário dele. PR sem teste só para configuração, documentação ou estilo.

| App          | Ferramenta                                        | Onde fica o teste                                                                                                           |
| ------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `mobile`     | Jest (`jest-expo`) + React Native Testing Library | `*-test.ts(x)` ao lado do código; telas de `src/app/` testadas em `__tests__/`, porque todo arquivo em `src/app/` vira rota |
| `web`        | Vitest + Testing Library                          | `*.test.ts(x)` ao lado do código                                                                                            |
| `api`        | Vitest                                            | `*.spec.ts` ao lado do código; e2e em `test/`                                                                               |
| `packages/*` | Vitest                                            | `*.test.ts` ao lado do código                                                                                               |

Regra de negócio (agrupamento em lugares, visitas, cidades, trajeto) é função pura em `packages/domain` e tem teste para cada limite: 3 dias, 25 km, 3 fotos, 6 horas, 300 km.

O hook `pre-push` roda `pnpm typecheck && pnpm test`.

## Pull request

Antes de abrir:

```bash
pnpm lint && pnpm typecheck && pnpm test
git push -u origin HEAD
```

Abrir com `gh`, título no formato de commit e corpo pelo template `.github/pull_request_template.md`:

```bash
gh pr create --base main --title "feat(api): validar identity token da apple e emitir jwt" --body-file <arquivo-com-o-corpo>
```

Corpo da PR, em português:

```markdown
## Resumo

<1 a 3 frases: o que a PR entrega e por quê>

## Mudanças

- <mudança relevante para quem revisa>

## Como testar

1. <passo reproduzível>

## Fora do escopo

- <o que ficou para outra PR, se houver>
```

Depois de abrir, informar o link da PR ao usuário. Se o `gh` não estiver autenticado (`gh auth status`), pedir ao usuário para rodar `gh auth login` e, enquanto isso, entregar o link de comparação `https://github.com/DionataBergmann/Mapbook/compare/main...<branch>`.

Após o merge:

```bash
git switch main && git pull --ff-only
git branch -d <branch>
```
