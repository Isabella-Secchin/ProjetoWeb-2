package estoque.service;
import estoque.model.Produto;
import estoque.repository.ProdutoRepository;
import estoque.dto.ProdutoEntrada;
import estoque.dto.ProdutoSaida;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProdutoService {

    private final ProdutoRepository produtos;

    ProdutoService(ProdutoRepository produtos) { this.produtos = produtos; }

    public List<ProdutoSaida> listar() {
        return produtos.findAll(Sort.by("nome", "id")).stream().map(this::saida).toList();
    }

    public ProdutoSaida consultar(long id) { return saida(buscar(id)); }

    public ProdutoSaida salvar(Long id, ProdutoEntrada dados) {
        var produto = id == null ? new Produto() : buscar(id);
        produto.atualizar(dados.nome().strip(), dados.categoria().strip(), dados.quantidade(),
                normalizarOpcional(dados.transportadora()), normalizarOpcional(dados.rastreio()));
        return saida(produtos.save(produto));
    }

    public ProdutoSaida atualizarQuantidade(long id, int quantidade) {
        if (produtos.atualizarQuantidade(id, quantidade) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado.");
        }
        return consultar(id);
    }

    public void excluir(long id) { produtos.delete(buscar(id)); }

    private Produto buscar(long id) {
        return produtos.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    private ProdutoSaida saida(Produto produto) {
        return new ProdutoSaida(produto.getId(), produto.getNome(), produto.getCategoria(), produto.getQuantidade(),
                produto.getTransportadora(), produto.getRastreio());
    }
}
