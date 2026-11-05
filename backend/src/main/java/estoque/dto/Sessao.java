package estoque.dto;

import java.time.Instant;
import estoque.model.Cargo;

public record Sessao(String token, Instant expiraEm, Cargo cargo) {}
