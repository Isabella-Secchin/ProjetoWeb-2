package estoque.config;
import estoque.model.Usuario;
import estoque.model.Cargo;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import estoque.repository.UsuarioRepository;

import java.security.SecureRandom;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class Seguranca {
    @Bean PasswordEncoder senhas() { return new BCryptPasswordEncoder(); }

    @Bean SecretKeySpec chave() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean JwtEncoder encoder(SecretKeySpec chave) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(chave));
    }

    @Bean JwtDecoder decoder(SecretKeySpec chave) {
        return NimbusJwtDecoder.withSecretKey(chave).build();
    }

    @Bean SecurityFilterChain filtro(HttpSecurity http, UsuarioRepository usuarios) throws Exception {
        return http.csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/login", "/api/usuarios").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/equipe", "/api/produtos", "/api/produtos/*").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/produtos/*/quantidade").hasAnyRole("GERENTE", "ALMOXARIFE")
                .requestMatchers("/api/equipe", "/api/produtos", "/api/produtos/**").hasRole("GERENTE")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(token -> {
                var conta = usuarios.findById(token.getSubject())
                    .filter(usuario -> Objects.equals(usuario.getVersaoConta(), token.getClaimAsString("conta")))
                    .orElseThrow(() -> new InvalidBearerTokenException("Conta indisponível."));
                return new JwtAuthenticationToken(token,
                    List.of(new SimpleGrantedAuthority("ROLE_" + conta.getCargo().name())));
            })))
            .build();
    }

    @Bean CommandLineRunner usuarioInicial(UsuarioRepository usuarios, PasswordEncoder senhas,
            @Value("${ESTOQUE_SENHA_INICIAL:}") String senha,
            @Value("${ESTOQUE_REDEFINIR_SENHA_ADMIN:}") String novaSenhaAdmin) {
        return args -> {
            var gerente = usuarios.findAll().stream()
                .filter(usuario -> usuario.getCargo() == Cargo.GERENTE)
                .findFirst();
            if (!novaSenhaAdmin.isBlank()) {
                String hash = senhas.encode(novaSenhaAdmin);
                var admin = gerente
                    .orElseGet(() -> new Usuario("admin", hash, Cargo.GERENTE));
                admin.redefinirSenha(hash);
                usuarios.save(admin);
            } else if (!senha.isBlank() && gerente.isEmpty()) {
                usuarios.save(new Usuario("admin", senhas.encode(senha), Cargo.GERENTE));
            }
        };
    }
}
