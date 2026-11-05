package estoque.service;

import estoque.dto.Credenciais;
import estoque.model.Usuario;
import estoque.model.Cargo;
import estoque.dto.Membro;
import estoque.repository.UsuarioRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@Service
public class CadastroService {
    private final EntityManager banco;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;

    public CadastroService(EntityManager banco, PasswordEncoder senhas, UsuarioRepository usuarios) {
        this.banco = banco;
        this.senhas = senhas;
        this.usuarios = usuarios;
    }

    @Transactional
    public void cadastrar(Credenciais dados) {
        criar(dados, Cargo.ESTOQUISTA);
    }

    public List<Membro> listar() {
        return usuarios.findAll(Sort.by("login")).stream()
            .map(usuario -> new Membro(usuario.getLogin(), usuario.getCargo())).toList();
    }

    @Transactional
    public Membro cadastrarMembro(Credenciais dados, Cargo cargo) {
        if (cargo == Cargo.GERENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione almoxarife ou estoquista.");
        }
        return criar(dados, cargo);
    }

    @Transactional
    public void excluirMembro(String login) {
        var usuario = usuarios.findById(login)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (usuario.getCargo() == Cargo.GERENTE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A conta de gerente é protegida.");
        }
        usuarios.delete(usuario);
    }

    private Membro criar(Credenciais dados, Cargo cargo) {
        String login = dados.login().strip();
        if (login.equalsIgnoreCase("admin") || login.equalsIgnoreCase("operador")
                || banco.find(Usuario.class, login) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este usuário já está reservado ou cadastrado.");
        }
        if (dados.senha().length() < 8 || dados.senha().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use uma senha de pelo menos 8 caracteres e até 72 bytes.");
        }
        banco.persist(new Usuario(login, senhas.encode(dados.senha()), cargo));
        return new Membro(login, cargo);
    }
}
