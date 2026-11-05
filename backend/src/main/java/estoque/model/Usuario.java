package estoque.model;

import jakarta.persistence.*;

@Entity
public class Usuario {
    @Id private String login;
    @Column(nullable = false) private String hash;

    @Enumerated(EnumType.STRING) private Cargo cargo;
    private String versaoConta;

    protected Usuario() {}
    public Usuario(String login, String hash, Cargo cargo) {
        this.login = login;
        this.hash = hash;
        this.cargo = cargo;
        this.versaoConta = java.util.UUID.randomUUID().toString();
    }

    public void redefinirSenha(String novoHash) {
        this.hash = novoHash;
        this.versaoConta = java.util.UUID.randomUUID().toString();
    }

    public String getLogin() { return login; }
    public String getHash() { return hash; }
    public String getVersaoConta() { return versaoConta; }

    public Cargo getCargo() {
        if (cargo != null) return cargo;
        return "admin".equals(login) ? Cargo.GERENTE : Cargo.ESTOQUISTA;
    }
}
