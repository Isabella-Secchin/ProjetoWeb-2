package estoque.dto;

import estoque.model.Cargo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record MembroEntrada(@NotNull @Valid Credenciais credenciais, @NotNull Cargo cargo) {}
