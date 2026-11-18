# Mapbook

Álbum de fotos por país e cidade. O app lê a galeria e organiza sozinho pela data e localização das fotos; o site mostra o álbum e publica uma página sem mapa.

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/), verificados pelo commitlint no hook `commit-msg`. Cada módulo entra por uma branch e uma PR próprias, com teste unitário; o hook `pre-push` roda `pnpm typecheck && pnpm test`.
