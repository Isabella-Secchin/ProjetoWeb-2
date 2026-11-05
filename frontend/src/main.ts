import { Component, Injectable, computed, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet, provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, throwError } from 'rxjs';

interface Entrada { nome: string; categoria: string; quantidade: number | null; transportadora: string | null; rastreio: string | null }
interface Produto extends Entrada { id: number }
type Cargo = 'GERENTE' | 'ALMOXARIFE' | 'ESTOQUISTA';
interface Membro { login: string; cargo: Cargo }
interface Sessao { token: string; expiraEm: string; cargo: Cargo }

@Injectable({providedIn:'root'})
class Api {
  private http = inject(HttpClient);
  private sessao = signal<Sessao | null>(JSON.parse(sessionStorage.getItem('estoque') ?? 'null'));
  aviso = signal('');
  token() {
    const sessao = this.sessao();
    return sessao?.cargo && Date.parse(sessao.expiraEm) > Date.now() ? sessao.token : null;
  }
  login(login: string, senha: string) { return this.http.post<Sessao>('/api/login', {login, senha}); }
  cadastrar(login: string, senha: string) { return this.http.post<void>('/api/usuarios', {login, senha}); }
  entrar(sessao: Sessao) {
    sessionStorage.setItem('estoque', JSON.stringify(sessao));
    this.sessao.set(sessao);
  }
  sair() {
    sessionStorage.removeItem('estoque');
    this.sessao.set(null);
    this.aviso.set('');
  }
  gerente() { return this.sessao()?.cargo === 'GERENTE'; }
  podeEditarQuantidade() { return this.gerente() || this.sessao()?.cargo === 'ALMOXARIFE'; }
  perfil() { return this.http.get<Membro>('/api/perfil'); }
  alterarLogin(login: string) { return this.http.patch<Membro>('/api/perfil/login', {login}); }
  alterarSenha(senhaAtual: string, novaSenha: string) {
    return this.http.patch<void>('/api/perfil/senha', {senhaAtual, novaSenha});
  }
  listarEquipe() { return this.http.get<Membro[]>('/api/equipe'); }
  cadastrarMembro(login: string, senha: string, cargo: Exclude<Cargo, 'GERENTE'>) {
    return this.http.post<Membro>('/api/equipe', {credenciais: {login, senha}, cargo});
  }
  excluirMembro(login: string) { return this.http.delete('/api/equipe', {params: {login}}); }
  atualizarQuantidade(id: string, quantidade: number) {
    return this.http.patch<Produto>('/api/produtos/' + id + '/quantidade', {quantidade});
  }
  listar() { return this.http.get<Produto[]>('/api/produtos'); }
  buscar(id: string) { return this.http.get<Produto>('/api/produtos/' + id); }
  salvar(id: string | null, dados: Entrada) {
    return id ? this.http.put<Produto>('/api/produtos/' + id, dados)
              : this.http.post<Produto>('/api/produtos', dados);
  }
  excluir(id: number) { return this.http.delete('/api/produtos/' + id); }
}

const autenticacao: HttpInterceptorFn = (req, next) => {
  const api = inject(Api);
  const router = inject(Router);
  if (!req.url.startsWith('/api/produtos') && req.url !== '/api/equipe' && !req.url.startsWith('/api/perfil')) return next(req);
  const token = api.token();
  return next(token ? req.clone({setHeaders:{Authorization:'Bearer ' + token}}) : req).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401) {
        api.sair();
        api.aviso.set('Sua sessão terminou. Entre novamente.');
        void router.navigateByUrl('/login');
      }
      return throwError(() => erro);
    })
  );
};

function mensagem(erro: HttpErrorResponse): string {
  if (erro.status === 403) return 'Seu cargo não permite essa operação.';
  return erro.error?.mensagem ?? (erro.status === 0
    ? 'Não foi possível conectar ao servidor.' : 'A operação falhou. Tente novamente.');
}

@Component({imports:[RouterLink, RouterLinkActive, RouterOutlet], selector:'app-root', template:`
  <header><div><a class="marca" routerLink="/"><span class="marca-icone" aria-hidden="true">▦</span><span>Estoque<span class="marca-local"> Local</span><small>GESTÃO DE PRODUTOS</small></span></a>
    @if (api.token()) { <nav aria-label="Menu principal"><a class="acao" routerLinkActive="menu-ativo" ariaCurrentWhenActive="page" routerLink="/produtos">Produtos</a><a class="acao" routerLinkActive="menu-ativo" ariaCurrentWhenActive="page" routerLink="/equipe">Equipe</a><a class="acao" routerLinkActive="menu-ativo" ariaCurrentWhenActive="page" routerLink="/perfil">Perfil</a><button class="acao menu-sair" (click)="sair()">Sair</button></nav> }
  </div></header>
  <main [class.area-acesso]="!api.token()">@if (api.aviso()) { <p class="aviso" role="status">{{api.aviso()}}</p> }<router-outlet /></main>`})
class App {
  api = inject(Api);
  router = inject(Router);
  sair() { this.api.sair(); void this.router.navigateByUrl('/login'); }
}

@Component({imports:[FormsModule, RouterLink], template:`
  <div class="acesso"><aside class="apresentacao"><span class="rotulo">ESTOQUE LOCAL</span><h2>Seu estoque em um só lugar.</h2><p>Cadastre produtos, consulte quantidades e mantenha seus registros atualizados.</p></aside><section class="painel login"><span class="rotulo">ACESSO AO SISTEMA</span><h1>Entrar</h1><p>Acesse o estoque da sua loja.</p>
  <form #form="ngForm" (ngSubmit)="entrar()">
    <label>Usuário<input name="login" [(ngModel)]="login" required maxlength="100" autocomplete="username"></label>
    <label>Senha<input name="senha" [(ngModel)]="senha" required maxlength="72" type="password" autocomplete="current-password"></label>
    @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
    <button [disabled]="form.invalid || enviando">Entrar</button>
  </form><div class="login-alternativa"><span>Primeiro acesso?</span><a class="acao" routerLink="/cadastro">Criar conta</a></div></section></div>`})
class Login {
  private api = inject(Api);
  private router = inject(Router);
  login = '';
  senha = '';
  enviando = false;
  erro = signal('');
  entrar() {
    if (this.enviando) return;
    this.enviando = true;
    this.erro.set('');
    this.api.login(this.login.trim(), this.senha).subscribe({
      next: sessao => {
        this.api.entrar(sessao);
        this.api.aviso.set('');
        void this.router.navigateByUrl('/produtos');
      },
      error: erro => { this.enviando = false; this.erro.set(mensagem(erro)); }
    });
  }
}

@Component({imports:[RouterLink], template:`
  <div class="titulo faixa"><div><span class="rotulo">INVENTÁRIO</span><h1>Produtos</h1><p>{{api.podeEditarQuantidade() ? 'Consulte os registros e atualize as quantidades do estoque.' : 'Consulte os produtos e as quantidades em estoque.'}}</p></div>
  @if (api.gerente()) { <a class="botao" routerLink="/produtos/novo">＋ Cadastrar produto</a> }</div>
  @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
  @if (!carregando() && !erro()) {
    <div class="indicadores">
      <article class="painel indicador">
        <span class="indicador-icone catalogo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8M8 6l8 4"/></svg>
        </span>
        <div><span class="indicador-rotulo">Produtos cadastrados</span><strong>{{produtos().length}}</strong></div>
      </article>
      <article class="painel indicador">
        <span class="indicador-icone unidades" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>
        </span>
        <div><span class="indicador-rotulo">Unidades em estoque</span><strong>{{unidades()}}</strong></div>
      </article>
      <article class="painel indicador">
        <span class="indicador-icone alerta" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v5m0 3h.01"/></svg>
        </span>
        <div><span class="indicador-rotulo">Produtos sem estoque</span><strong>{{semEstoque()}}</strong></div>
      </article>
    </div>
  }
  <section class="painel inventario">
    <div class="inventario-cabecalho"><h2>Registros de produtos</h2><p>Consulte quantidades, transportadoras e ações de cada item.</p></div>
    @if (carregando()) { <p>Carregando produtos…</p> }
    @else if (!erro() && produtos().length === 0) { <div class="vazio"><strong>Nenhum produto cadastrado</strong><p>Os produtos cadastrados aparecerão aqui.</p></div> }
    @if (produtos().length) {
      <div class="tabela"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Quantidade</th><th>Transportadora</th><th>Ações</th></tr></thead>
      <tbody>@for (produto of produtos(); track produto.id) {
        <tr><td><strong>{{produto.nome}}</strong></td><td><span class="categoria">{{produto.categoria}}</span></td><td><span class="quantidade" [class.zerada]="produto.quantidade === 0">{{produto.quantidade}} un.</span></td>
        <td>{{produto.transportadora || "—"}}</td>
        <td><div class="acoes"><a class="acao" [routerLink]="['/produtos', produto.id]">Detalhes</a>
        @if (api.podeEditarQuantidade()) {
          <a class="acao" [routerLink]="['/produtos', produto.id, 'editar']">{{api.gerente() ? 'Editar' : 'Alterar quantidade'}}</a>
        }
        @if (api.gerente()) {
          <button class="acao perigo" [disabled]="excluindo()" (click)="excluir(produto)">Excluir</button>
        }</div></td></tr>
      }</tbody></table></div>
    }
  </section>`})
class Lista {
  api = inject(Api);
  produtos = signal<Produto[]>([]);
  erro = signal('');
  carregando = signal(true);
  excluindo = signal(false);
  unidades = computed(() => this.produtos().reduce((total, item) => total + (item.quantidade ?? 0), 0));
  semEstoque = computed(() => this.produtos().filter(item => item.quantidade === 0).length);
  constructor() {
    this.api.listar().subscribe({
      next: produtos => { this.produtos.set(produtos); this.carregando.set(false); },
      error: erro => { this.erro.set(mensagem(erro)); this.carregando.set(false); }
    });
  }
  excluir(produto: Produto) {
    if (!confirm('Excluir o produto "' + produto.nome + '"?')) return;
    this.excluindo.set(true);
    this.erro.set('');
    this.api.aviso.set('');
    this.api.excluir(produto.id).subscribe({
      next: () => {
        this.produtos.update(lista => lista.filter(item => item.id !== produto.id));
        this.excluindo.set(false);
        this.api.aviso.set('Produto excluído.');
      },
      error: erro => { this.excluindo.set(false); this.erro.set(mensagem(erro)); }
    });
  }
}

@Component({imports:[RouterLink], template:`
  <a class="voltar" routerLink="/produtos">← Voltar aos produtos</a><h1>Detalhes do produto</h1>
  @if (produto(); as item) {
    <section class="painel detalhe"><span class="rotulo">REGISTRO #{{item.id}}</span><h2>{{item.nome}}</h2><dl><dt>Categoria</dt><dd>{{item.categoria}}</dd>
    <dt>Quantidade em estoque</dt><dd>{{item.quantidade}}</dd></dl>
    <section class="bloco-logistica"><h3>Logística</h3><dl>
      <dt>Transportadora</dt><dd>{{item.transportadora || "Não informada"}}</dd>
      <dt>Código de rastreio</dt><dd>{{item.rastreio || "Não informado"}}</dd>
    </dl></section>
    @if (api.podeEditarQuantidade()) {
      <a class="botao" [routerLink]="['/produtos', item.id, 'editar']">{{api.gerente() ? 'Editar produto' : 'Alterar quantidade'}}</a>
    }</section>
  } @else if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
    @else { <p>Carregando produto…</p> }`})
class Detalhes {
  api = inject(Api);
  produto = signal<Produto | null>(null);
  erro = signal('');
  constructor() {
    this.api.buscar(inject(ActivatedRoute).snapshot.paramMap.get('id')!).subscribe({
      next: produto => this.produto.set(produto),
      error: erro => this.erro.set(mensagem(erro))
    });
  }
}

@Component({imports:[FormsModule, RouterLink], template:`
  <a class="voltar" routerLink="/produtos">← Voltar aos produtos</a>
  <span class="rotulo subtitulo">INVENTÁRIO</span><h1>{{somenteQuantidade ? 'Alterar quantidade' : id ? 'Editar produto' : 'Cadastrar produto'}}</h1>
  @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
  @if (carregando()) { <p>Carregando produto…</p> }
  @if (dados(); as produto) {
    <form class="painel formulario" #form="ngForm" (ngSubmit)="salvar(produto)">
      @if (somenteQuantidade) { <h2>{{produto.nome}}</h2> } @else {
      <label>Nome<input name="nome" [(ngModel)]="produto.nome" required maxlength="120" #nome="ngModel"></label>
      @if (nome.touched && !produto.nome.trim()) { <small>Informe o nome do produto.</small> }
      <label>Categoria<input name="categoria" [(ngModel)]="produto.categoria" required maxlength="120" #categoria="ngModel"></label>
      @if (categoria.touched && !produto.categoria.trim()) { <small>Informe a categoria.</small> }
      }
      <label>Quantidade<input name="quantidade" [(ngModel)]="produto.quantidade" type="number" required min="0" max="2147483647" step="1" #quantidade="ngModel"></label>
      @if (quantidade.touched && (quantidade.invalid || !inteiro(produto.quantidade))) {
        <small>Informe um número inteiro entre 0 e 2.147.483.647.</small>
      }
      @if (!somenteQuantidade) {
      <fieldset class="bloco-logistica"><legend>Logística <small class="dica">Opcional</small></legend>
        <label>Transportadora<input name="transportadora" [(ngModel)]="produto.transportadora" maxlength="120" placeholder="Ex.: Correios"></label>
        <label>Código de rastreio<input name="rastreio" [(ngModel)]="produto.rastreio" maxlength="80"></label>
      </fieldset>
      }
      <button [disabled]="form.invalid || !valido(produto) || enviando()">{{somenteQuantidade ? "Salvar quantidade" : "Salvar produto"}}</button>
    </form>
  }`})
class Formulario {
  private api = inject(Api);
  private router = inject(Router);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  somenteQuantidade = this.id !== null && !this.api.gerente();
  dados = signal<Entrada | null>(this.id ? null : {nome:'', categoria:'', quantidade:null, transportadora:null, rastreio:null});
  carregando = signal(Boolean(this.id));
  enviando = signal(false);
  erro = signal('');
  inteiro = Number.isInteger;
  constructor() {
    if (this.id) this.api.buscar(this.id).subscribe({
      next: produto => {
        this.dados.set({nome:produto.nome, categoria:produto.categoria, quantidade:produto.quantidade,
          transportadora:produto.transportadora, rastreio:produto.rastreio});
        this.carregando.set(false);
      },
      error: erro => { this.erro.set(mensagem(erro)); this.carregando.set(false); }
    });
  }
  valido(dados: Entrada) {
    return (this.somenteQuantidade || (!!dados.nome.trim() && !!dados.categoria.trim())) && dados.quantidade !== null &&
      Number.isInteger(dados.quantidade) && dados.quantidade >= 0 && dados.quantidade <= 2147483647;
  }
  salvar(dados: Entrada) {
    if (this.enviando() || !this.valido(dados)) return;
    this.enviando.set(true);
    this.erro.set('');
    const operacao = this.somenteQuantidade && this.id
      ? this.api.atualizarQuantidade(this.id, dados.quantidade!)
      : this.api.salvar(this.id, dados);
    operacao.subscribe({
      next: produto => {
        this.api.aviso.set(this.somenteQuantidade ? 'Quantidade atualizada.' : this.id ? 'Produto atualizado.' : 'Produto cadastrado.');
        void this.router.navigate(['/produtos', produto.id]);
      },
      error: erro => { this.enviando.set(false); this.erro.set(mensagem(erro)); }
    });
  }
}

@Component({imports:[FormsModule, RouterLink], template:`
  <section class="painel login cadastro"><span class="rotulo">NOVO ACESSO</span><h1>Criar conta</h1><p>Crie uma conta de estoquista para consultar os produtos.</p>
    <form #form="ngForm" (ngSubmit)="salvar()">
      <label>Usuário<input name="login" [(ngModel)]="login" required maxlength="100" autocomplete="username"></label>
      <label>Senha<input name="senha" [(ngModel)]="senha" required minlength="8" maxlength="72" type="password" autocomplete="new-password"></label>
      <small class="dica">Use pelo menos 8 caracteres.</small>
      <label>Confirme a senha<input name="confirmacao" [(ngModel)]="confirmacao" required type="password" autocomplete="new-password"></label>
      @if (confirmacao && senha !== confirmacao) { <small>As senhas devem ser iguais.</small> }
      @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
      <button [disabled]="form.invalid || !login.trim() || senha !== confirmacao || enviando()">Cadastrar</button>
    </form>
    <p><a routerLink="/login">Voltar ao login</a></p>
  </section>`})
class Cadastro {
  private api = inject(Api);
  private router = inject(Router);
  login = '';
  senha = '';
  confirmacao = '';
  erro = signal('');
  enviando = signal(false);

  salvar() {
    if (this.enviando() || !this.login.trim() || this.senha.length < 8 || this.senha !== this.confirmacao) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.cadastrar(this.login.trim(), this.senha).subscribe({
      next: () => {
        this.api.aviso.set('Conta criada. Entre com seu usuário e senha.');
        void this.router.navigateByUrl('/login');
      },
      error: erro => { this.enviando.set(false); this.erro.set(mensagem(erro)); }
    });
  }
}

@Component({imports:[FormsModule], template:`
  <div class="titulo faixa"><div><span class="rotulo">PESSOAS</span><h1>Equipe</h1>
    <p>Consulte os membros responsáveis pelo estoque.</p></div>
    @if (api.gerente()) {
      <button type="button" class="botao" [disabled]="carregando() || ocupado()" (click)="modal.showModal()">＋ Cadastrar membro</button>
    }
  </div>
  <dialog #modal class="painel equipe-modal" aria-labelledby="titulo-cadastro-membro"
          (close)="limparCadastro()" (cancel)="seOcupadoImpedirFechamento($event)">
    @if (api.gerente()) {
      <span class="rotulo">EQUIPE</span>
      <h2 id="titulo-cadastro-membro">Cadastrar membro</h2>
      <p>Crie uma conta de almoxarife ou estoquista.</p>
      <form #form="ngForm" (ngSubmit)="cadastrar(modal)">
        <label>Nome de usuário<input name="login" [(ngModel)]="login" required maxlength="100" autocomplete="off" autofocus></label>
        <label>Senha inicial<input name="senha" [(ngModel)]="senha" required minlength="8" maxlength="72" type="password" autocomplete="new-password"></label>
        <small class="dica">Use pelo menos 8 caracteres.</small>
        <label>Cargo<select name="cargo" [(ngModel)]="cargo">
          <option value="ALMOXARIFE">Almoxarife</option><option value="ESTOQUISTA">Estoquista</option>
        </select></label>
        @if (erroCadastro()) { <p class="erro" role="alert">{{erroCadastro()}}</p> }
        <div class="equipe-modal-acoes">
          <button type="button" class="acao" [disabled]="ocupado()" (click)="modal.close()">Cancelar</button>
          <button type="submit" [disabled]="form.invalid || !login.trim() || ocupado()">{{ocupado() ? 'Cadastrando…' : 'Cadastrar membro'}}</button>
        </div>
      </form>
    }
  </dialog>
  @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
  <section class="painel inventario">
    <div class="inventario-cabecalho"><h2>Membros da equipe</h2></div>
    @if (carregando()) { <p role="status">Carregando equipe…</p> }
    @else if (membros().length) {
      <div class="tabela"><table class="equipe-tabela">
        <thead><tr><th scope="col">Nome de usuário</th><th scope="col">Cargo</th>
          @if (api.gerente()) { <th scope="col">Ações</th> }
        </tr></thead>
        <tbody>
          @for (membro of membros(); track membro.login) {
            <tr>
              <td><strong>{{membro.login}}</strong></td>
              <td><span class="categoria">{{cargos[membro.cargo]}}</span></td>
              @if (api.gerente()) {
                <td>@if (membro.cargo !== 'GERENTE') {
                  <button type="button" class="acao perigo" [attr.aria-label]="'Excluir ' + membro.login"
                          [disabled]="ocupado()" (click)="excluir(membro)">Excluir</button>
                } @else { <span aria-label="Sem ações">—</span> }</td>
              }
            </tr>
          }
        </tbody>
      </table></div>
    } @else if (!erro()) {
      <div class="vazio"><strong>Nenhum membro cadastrado</strong></div>
    }
  </section>`})
class Equipe {
  api = inject(Api);
  cargos: Record<Cargo, string> = {GERENTE:'Gerente', ALMOXARIFE:'Almoxarife', ESTOQUISTA:'Estoquista'};
  membros = signal<Membro[]>([]);
  carregando = signal(true);
  ocupado = signal(false);
  erro = signal('');
  erroCadastro = signal('');
  login = '';
  senha = '';
  cargo: Exclude<Cargo, 'GERENTE'> = 'ALMOXARIFE';

  constructor() {
    this.api.listarEquipe().subscribe({
      next: membros => { this.membros.set(membros); this.carregando.set(false); },
      error: erro => { this.erro.set(mensagem(erro)); this.carregando.set(false); }
    });
  }
  cadastrar(modal: HTMLDialogElement) {
    if (this.ocupado() || !this.login.trim() || this.senha.length < 8) return;
    this.iniciarOperacao();
    this.erroCadastro.set('');
    this.api.cadastrarMembro(this.login.trim(), this.senha, this.cargo).subscribe({
      next: membro => {
        this.membros.update(lista => [...lista, membro].sort((a, b) => a.login.localeCompare(b.login)));
        this.ocupado.set(false);
        modal.close();
        this.api.aviso.set('Membro cadastrado.');
      },
      error: erro => {
        this.ocupado.set(false);
        this.erroCadastro.set(mensagem(erro));
      }
    });
  }
  limparCadastro() {
    this.login = '';
    this.senha = '';
    this.cargo = 'ALMOXARIFE';
    this.erroCadastro.set('');
  }
  seOcupadoImpedirFechamento(evento: Event) {
    if (this.ocupado()) evento.preventDefault();
  }
  excluir(membro: Membro) {
    if (this.ocupado() || !confirm('Excluir a conta de ' + membro.login + '?')) return;
    this.iniciarOperacao();
    this.api.excluirMembro(membro.login).subscribe({
      next: () => {
        this.membros.update(lista => lista.filter(item => item.login !== membro.login));
        this.ocupado.set(false);
        this.api.aviso.set('Membro excluído.');
      },
      error: erro => this.falha(erro)
    });
  }
  private iniciarOperacao() {
    this.ocupado.set(true);
    this.erro.set('');
    this.api.aviso.set('');
  }
  private falha(erro: HttpErrorResponse) {
    this.ocupado.set(false);
    this.erro.set(mensagem(erro));
  }
}

@Component({imports:[FormsModule], template:`
  <div class="titulo faixa"><div><span class="rotulo">CONTA</span><h1>Perfil</h1>
    <p>Atualize seu nome de usuário e sua senha.</p></div>
  </div>
  @if (erro()) { <p class="erro" role="alert">{{erro()}}</p> }
  @if (perfil(); as conta) {
    <div class="perfil-paineis">
      <section class="painel">
        <h2>Dados pessoais</h2>
        <dl><dt>Cargo</dt><dd>{{cargos[conta.cargo]}}</dd></dl>
        <form #dados="ngForm" (ngSubmit)="salvarLogin()">
          <label>Nome de usuário<input name="login" [(ngModel)]="login" required maxlength="100" autocomplete="username"></label>
          <small class="dica">Esse é o nome que aparece na Equipe e que você usa para entrar.</small>
          <button [disabled]="dados.invalid || !login.trim() || login.trim() === conta.login || ocupado()">Salvar nome de usuário</button>
        </form>
      </section>
      <section class="painel">
        <h2>Alterar senha</h2><p>Depois da alteração, entre novamente com a nova senha.</p>
        <form #seguranca="ngForm" (ngSubmit)="salvarSenha()">
          <label>Senha atual<input name="senhaAtual" [(ngModel)]="senhaAtual" required maxlength="72" type="password" autocomplete="current-password"></label>
          <label>Nova senha<input name="novaSenha" [(ngModel)]="novaSenha" required minlength="8" maxlength="72" type="password" autocomplete="new-password"></label>
          <small class="dica">Use pelo menos 8 caracteres.</small>
          <label>Confirme a nova senha<input name="confirmacao" [(ngModel)]="confirmacao" required maxlength="72" type="password" autocomplete="new-password"></label>
          @if (confirmacao && confirmacao !== novaSenha) { <small>As senhas devem ser iguais.</small> }
          <button [disabled]="seguranca.invalid || novaSenha !== confirmacao || ocupado()">Alterar senha</button>
        </form>
      </section>
    </div>
  } @else if (!erro()) { <p>Carregando perfil…</p> }`})
class PerfilPage {
  private api = inject(Api);
  private router = inject(Router);
  cargos: Record<Cargo, string> = {GERENTE:'Gerente', ALMOXARIFE:'Almoxarife', ESTOQUISTA:'Estoquista'};
  perfil = signal<Membro | null>(null);
  erro = signal('');
  ocupado = signal(false);
  login = '';
  senhaAtual = '';
  novaSenha = '';
  confirmacao = '';

  constructor() {
    this.api.perfil().subscribe({
      next: perfil => { this.perfil.set(perfil); this.login = perfil.login; },
      error: erro => this.erro.set(mensagem(erro))
    });
  }

  salvarLogin() {
    const login = this.login.trim();
    if (this.ocupado() || !login || login.length > 100 || login === this.perfil()?.login) return;
    this.iniciar();
    this.api.alterarLogin(login).subscribe({
      next: () => this.entrarNovamente('Nome de usuário alterado. Entre com o novo nome.'),
      error: erro => this.falha(erro)
    });
  }

  salvarSenha() {
    if (this.ocupado() || !this.senhaAtual || this.novaSenha.length < 8 || this.novaSenha !== this.confirmacao) return;
    this.iniciar();
    this.api.alterarSenha(this.senhaAtual, this.novaSenha).subscribe({
      next: () => this.entrarNovamente('Senha alterada. Entre novamente com a nova senha.'),
      error: erro => this.falha(erro)
    });
  }

  private entrarNovamente(aviso: string) {
    this.api.sair();
    this.api.aviso.set(aviso);
    void this.router.navigateByUrl('/login');
  }

  private iniciar() {
    this.ocupado.set(true);
    this.erro.set('');
    this.api.aviso.set('');
  }

  private falha(erro: HttpErrorResponse) {
    this.ocupado.set(false);
    this.erro.set(mensagem(erro));
  }
}

const guard = () => {
  const api = inject(Api);
  if (api.token()) return true;
  api.sair();
  return inject(Router).parseUrl('/login');
};

const protegerEdicao = (somenteGerente: boolean) => () => {
  const acesso = guard();
  if (acesso !== true) return acesso;
  const api = inject(Api);
  if (somenteGerente ? api.gerente() : api.podeEditarQuantidade()) return true;
  api.aviso.set('Seu cargo não permite essa operação.');
  return inject(Router).parseUrl('/produtos');
};

bootstrapApplication(App, {providers:[
  provideHttpClient(withInterceptors([autenticacao])),
  provideRouter([
    {path:'login', component:Login},
    {path:'cadastro', component:Cadastro},
    {path:'produtos', component:Lista, canActivate:[guard]},
    {path:'equipe', component:Equipe, canActivate:[guard]},
    {path:'perfil', component:PerfilPage, canActivate:[guard]},
    {path:'produtos/novo', component:Formulario, canActivate:[protegerEdicao(true)]},
    {path:'produtos/:id/editar', component:Formulario, canActivate:[protegerEdicao(false)]},
    {path:'produtos/:id', component:Detalhes, canActivate:[guard]},
    {path:'', redirectTo:'produtos', pathMatch:'full'},
    {path:'**', redirectTo:'produtos'}
  ])
]});
