package estoque.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record Credenciais(@NotBlank @Size(max = 100) String login,
                          @NotBlank @Size(max = 72) String senha) {}
