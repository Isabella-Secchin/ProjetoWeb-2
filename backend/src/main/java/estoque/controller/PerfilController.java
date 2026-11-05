package estoque.controller;

import estoque.dto.Membro;
import estoque.service.PerfilService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/perfil")
record PerfilController(PerfilService perfis) {
    record LoginEntrada(@NotBlank @Size(max = 100) String login) {}
    record SenhaEntrada(@NotBlank @Size(max = 72) String senhaAtual,
                        @NotBlank @Size(min = 8, max = 72) String novaSenha) {}

    @GetMapping
    Membro consultar(Principal pessoa) {
        return perfis.consultar(pessoa.getName());
    }

    @PatchMapping("/login")
    Membro alterarLogin(Principal pessoa, @Valid @RequestBody LoginEntrada dados) {
        return perfis.alterarLogin(pessoa.getName(), dados.login());
    }

    @PatchMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void alterarSenha(Principal pessoa, @Valid @RequestBody SenhaEntrada dados) {
        perfis.alterarSenha(pessoa.getName(), dados.senhaAtual(), dados.novaSenha());
    }
}
