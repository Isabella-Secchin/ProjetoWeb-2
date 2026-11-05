# Estoque Local

Pequenos comércios que registram o estoque em papel ou em planilhas dispersas têm dificuldade para saber quais produtos estão disponíveis. O Estoque Local permite que lojistas e funcionários consultem e atualizem os registros em um único lugar.

## Executar no Windows

Pré-requisitos: JDK 17 ou superior, Maven 3.9, Node.js 22.12 ou superior compatível com Angular 20 e npm.

Em um terminal PowerShell, na raiz do projeto:

```powershell
cd backend
$env:ESTOQUE_SENHA_INICIAL = 'escolha-uma-senha-para-a-demo'
mvn spring-boot:run
```

A variável cria o usuário **admin** no primeiro início em que ela estiver definida. O BCrypt protege a senha persistida. Para manter os dados, inicie o backend sempre da pasta backend, onde fica o arquivo H2 em data/. O backend gera uma chave de assinatura a cada início, então faça login novamente após reiniciar.

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm install
npm start
```

Abra [http://localhost:4200](http://localhost:4200). O proxy do Angular encaminha /api para a porta 8080.

## API

| Método | Caminho | Resposta de sucesso |
| --- | --- | --- |
| POST | /api/login | 200 com token e expiração |
| GET | /api/produtos | 200 com a lista |
| GET | /api/produtos/{id} | 200 com o produto |
| POST | /api/produtos | 201 com o produto criado |
| PUT | /api/produtos/{id} | 200 com o produto atualizado |
| DELETE | /api/produtos/{id} | 204 |

Envie nome, categoria e quantidade inteira não negativa no cadastro e na edição. As rotas de produtos exigem Authorization: Bearer <token>. Dados inválidos retornam 400, credenciais ou token inválidos retornam 401 e um produto inexistente retorna 404.

## Roteiro de apresentação

1. Apresente o problema e o público-alvo descritos acima.
2. Tente acessar /produtos sem sessão. Demonstre a senha incorreta e depois entre com as credenciais válidas.
3. Na listagem, abra o cadastro, mostre a validação e salve um produto.
4. Confira os detalhes, abra a edição e altere a quantidade.
5. Reinicie o backend, entre novamente e confira a quantidade atualizada.
6. Volte à listagem, cancele uma exclusão e depois confirme. Mostre a mensagem de sucesso.
7. Saia do sistema e tente voltar à listagem.


## Arquitetura do backend

- `model` contém as entidades JPA e `repository` concentra o acesso ao banco.
- `service` contém as operações de produtos e a autenticação.
- `controller` recebe as requisições HTTP e usa `dto` para as entradas e respostas JSON.
- `config` configura o Spring Security, e `exception` trata erros da API.

O Angular é a camada de apresentação e consome as respostas JSON.

## Equipe e permissões

A aba Equipe lista os usuários por cargo. As permissões também são verificadas no backend.

| Cargo | Produtos | Equipe |
| --- | --- | --- |
| Gerente | Consultar, cadastrar, editar e excluir | Consultar, cadastrar e excluir almoxarifes e estoquistas |
| Almoxarife | Consultar e atualizar a quantidade | Consultar |
| Estoquista | Consultar | Consultar |

A conta inicial admin é gerente e pode alterar seu nome de usuário na aba Perfil. Contas existentes sem cargo, além de admin, e contas criadas pela página pública de cadastro têm acesso de estoquista. Entre como admin para criar uma conta de almoxarife na aba Equipe.

A edição de quantidade usa PATCH /api/produtos/{id}/quantidade. A listagem e o cadastro de membros usam GET e POST em /api/equipe. Para excluir, o gerente usa DELETE /api/equipe?login={login}.
