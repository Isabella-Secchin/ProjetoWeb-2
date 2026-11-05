package estoque.controller;

import estoque.dto.Credenciais;
import estoque.service.CadastroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
record CadastroController(CadastroService cadastro) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    void cadastrar(@Valid @RequestBody Credenciais dados) {
        cadastro.cadastrar(dados);
    }
}
