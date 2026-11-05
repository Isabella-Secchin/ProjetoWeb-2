package estoque.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record QuantidadeEntrada(@NotNull @Min(0) Integer quantidade) {}
