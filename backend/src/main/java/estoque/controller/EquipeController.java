package estoque.controller;

import estoque.dto.Membro;
import estoque.dto.MembroEntrada;
import estoque.service.CadastroService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/equipe")
record EquipeController(CadastroService equipe) {
    @GetMapping List<Membro> listar() { return equipe.listar(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Membro cadastrar(@Valid @RequestBody MembroEntrada dados) {
        return equipe.cadastrarMembro(dados.credenciais(), dados.cargo());
    }

    @DeleteMapping(params = "login")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@RequestParam String login) { equipe.excluirMembro(login); }
}
