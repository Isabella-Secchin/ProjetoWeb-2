package estoque.service;
import estoque.repository.UsuarioRepository;
import estoque.dto.Credenciais;
import estoque.dto.Sessao;

import java.time.Instant;


import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public record AutenticacaoService(UsuarioRepository usuarios, PasswordEncoder senhas, JwtEncoder tokens) {
    public Sessao autenticar(Credenciais dados) {
        var usuario = usuarios.findById(dados.login())
            .filter(u -> senhas.matches(dados.senha(), u.getHash()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário ou senha incorretos."));
        var agora = Instant.now();
        var expira = agora.plusSeconds(3600);
        var claims = JwtClaimsSet.builder().subject(usuario.getLogin()).issuedAt(agora).expiresAt(expira);
        if (usuario.getVersaoConta() != null) claims.claim("conta", usuario.getVersaoConta());
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new Sessao(tokens.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue(), expira, usuario.getCargo());
    }
}
