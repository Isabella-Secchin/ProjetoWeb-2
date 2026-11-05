package estoque.model;

import jakarta.persistence.*;

@Entity
public class Produto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120) private String nome;
    @Column(nullable = false, length = 120) private String categoria;
    @Column(nullable = false) private int quantidade;

    @Column(length = 120) private String transportadora;
    @Column(length = 80) private String rastreio;

    public String getTransportadora() { return transportadora; }
    public String getRastreio() { return rastreio; }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getCategoria() { return categoria; }
    public int getQuantidade() { return quantidade; }

    public void atualizar(String nome, String categoria, int quantidade, String transportadora, String rastreio) {
        this.nome = nome;
        this.categoria = categoria;
        this.quantidade = quantidade;
        this.transportadora = transportadora;
        this.rastreio = rastreio;
    }
}
