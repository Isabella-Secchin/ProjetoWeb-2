package estoque.dto;

import jakarta.validation.constraints.*;

public record ProdutoEntrada(@NotBlank @Size(max = 120) String nome,
                             @NotBlank @Size(max = 120) String categoria,
                             @NotNull @Min(0) Integer quantidade,
                             @Size(max = 120) String transportadora,
                             @Size(max = 80) String rastreio) {}
