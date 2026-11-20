# Pixel Express

A Sprint 1 reúne login, check-in diário, extrato e um menu 3×3 em uma interface arcade. Os módulos de agenda, tarefas, avisos, equipe e relatórios abrem telas marcadas como “Em breve”.

## Execução local

Use Node.js 22 ou superior e npm. A Sprint 1 usa Next.js 14, versão que saiu do ciclo regular de suporte. [Política de suporte do Next.js](https://nextjs.org/support-policy#unsupported-versions)

Copie o arquivo de exemplo e configure os valores do projeto Supabase em `.env.local`.

```sh
cp .env.example .env.local
openssl rand -hex 32
```

Use o valor gerado em `PIXEL_SESSION_SECRET` e gere um segredo separado para cada ambiente.

| Variável | Finalidade |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do mesmo projeto. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada usada exclusivamente no servidor. |
| `PIXEL_SESSION_SECRET` | Segredo exclusivo do ambiente, com pelo menos 32 bytes. |
| `PIXEL_DEMO_ENABLED` | Defina como `true` somente em projeto isolado com o seed de demonstração OP-408. |

No Vercel, configure as mesmas variáveis para o ambiente correspondente. Mantenha `PIXEL_DEMO_ENABLED` desativada no ambiente de produção e guarde as chaves privadas no ambiente do servidor.

```sh
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Supabase

Os tipos refletem o esquema do Supabase Pixel Express. A migração em `supabase/migrations/` adiciona o vínculo com Supabase Auth e o RPC de check-in. Em outro projeto, confira o esquema e as políticas RLS antes de executar a migração uma vez pelo SQL Editor. O RPC usa a restrição existente `unique_daily_checkin` e registra o bônus como `DAILY_LOGIN` no extrato.

O login usa Supabase Auth. Um administrador deve associar o UUID do usuário em `auth.users` ao colaborador pelo campo `employees.auth_user_id`. Para a demonstração, o seed deve ter `employees.employee_code = 'OP-408'` e `auth_user_id IS NULL`. Quem tem acesso ao ambiente com a demo habilitada pode usar essa conta compartilhada. Sessões assinadas expiram em até uma hora. Sair limpa o cookie do navegador.

## Verificação

```sh
npm run typecheck
npm run build
```

1. Tente entrar com credenciais inválidas e confirme que o erro aparece na tela de login.
2. Entre com um usuário do Supabase Auth associado a um colaborador. Escolha o humor, selecione o motivo e registre o check-in.
3. No Menu Iniciar 3×3, abra o Extrato e confirme o lançamento de `+50 PTS`. Confira o mesmo lançamento na tabela `point_transactions` e o saldo em `employees`. Recarregue a página e confirme que a sessão continua válida e que o mesmo dia não rende outro bônus.
4. Saia e confirme que a navegação volta para o login.
5. Em um projeto isolado com o seed OP-408, repita o fluxo pelo acesso de demonstração.

## Primeiro commit e publicação

Com o projeto Vercel vinculado ao repositório Git e configurado para publicar a partir de `main`, o push inicia o deploy.

```sh
git add .
git diff --cached --stat
git commit -m "Entrega Sprint 1 do Pixel Express"
git push -u origin main
```
