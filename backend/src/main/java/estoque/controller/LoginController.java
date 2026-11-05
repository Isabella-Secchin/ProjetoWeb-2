package estoque.controller;

import estoque.dto.Credenciais;
import estoque.dto.Sessao;
import estoque.service.AutenticacaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/login")
record LoginController(AutenticacaoService autenticacao) {
    @PostMapping
    Sessao autenticar(@Valid @RequestBody Credenciais dados) {
        return autenticacao.autenticar(dados);
    }
}
