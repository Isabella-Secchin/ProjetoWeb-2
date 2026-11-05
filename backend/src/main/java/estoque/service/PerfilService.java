package estoque.service;

import estoque.dto.Membro;
import estoque.model.Cargo;
import jakarta.persistence.EntityManager;
import estoque.model.Usuario;
import estoque.repository.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PerfilService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;
    private final EntityManager banco;

    public PerfilService(UsuarioRepository usuarios, PasswordEncoder senhas, EntityManager banco) {
        this.usuarios = usuarios;
        this.senhas = senhas;
        this.banco = banco;
    }

    public Membro consultar(String login) {
        return perfil(usuarios.findById(login).orElseThrow(this::contaIndisponivel));
    }

    @Transactional
    public Membro alterarLogin(String login, String novoLogin) {
        var usuario = buscarParaAlteracao(login);
        String destino = novoLogin.strip();
        if (login.equals(destino)) return perfil(usuario);

        boolean reservado = destino.equalsIgnoreCase("operador")
            || (destino.equalsIgnoreCase("admin")
                && usuario.getCargo() != Cargo.GERENTE);
        if (reservado || usuarios.existsById(destino)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este usuário já está reservado ou cadastrado.");
        }

        var novaConta = new Usuario(destino, usuario.getHash(), usuario.getCargo());
        banco.persist(novaConta);
        usuarios.delete(usuario);
        return perfil(novaConta);
    }

    @Transactional
    public void alterarSenha(String login, String senhaAtual, String novaSenha) {
        var usuario = buscarParaAlteracao(login);
        if (senhaAtual.getBytes(StandardCharsets.UTF_8).length > 72 || !senhas.matches(senhaAtual, usuario.getHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha atual está incorreta.");
        }
        if (novaSenha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ter até 72 bytes.");
        }
        usuario.redefinirSenha(senhas.encode(novaSenha));
    }

    private Usuario buscarParaAlteracao(String login) {
        return usuarios.buscarParaAlteracao(login).orElseThrow(this::contaIndisponivel);
    }

    private ResponseStatusException contaIndisponivel() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Conta indisponível.");
    }

    private Membro perfil(Usuario usuario) {
        return new Membro(usuario.getLogin(), usuario.getCargo());
    }
}
