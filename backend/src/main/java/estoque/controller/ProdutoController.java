package estoque.controller;
import estoque.service.ProdutoService;
import estoque.dto.ProdutoEntrada;
import estoque.dto.ProdutoSaida;
import estoque.dto.QuantidadeEntrada;

import java.net.URI;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/produtos")
record ProdutoController(ProdutoService estoque) {
    @GetMapping List<ProdutoSaida> listar() { return estoque.listar(); }

    @GetMapping("/{id}") ProdutoSaida consultar(@PathVariable long id) {
        return estoque.consultar(id);
    }

    @PostMapping ResponseEntity<ProdutoSaida> criar(@Valid @RequestBody ProdutoEntrada dados) {
        var produto = estoque.salvar(null, dados);
        return ResponseEntity.created(URI.create("/api/produtos/" + produto.id())).body(produto);
    }

    @PutMapping("/{id}") ProdutoSaida editar(@PathVariable long id,
            @Valid @RequestBody ProdutoEntrada dados) {
        return estoque.salvar(id, dados);
    }

    @PatchMapping("/{id}/quantidade")
    ProdutoSaida atualizarQuantidade(@PathVariable long id, @Valid @RequestBody QuantidadeEntrada dados) {
        return estoque.atualizarQuantidade(id, dados.quantidade());
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@PathVariable long id) { estoque.excluir(id); }
}
