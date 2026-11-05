package estoque.dto;

public record ProdutoSaida(Long id, String nome, String categoria, int quantidade,
                           String transportadora, String rastreio) {}
