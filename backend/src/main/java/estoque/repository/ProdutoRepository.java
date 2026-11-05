package estoque.repository;
import estoque.model.Produto;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    @Modifying
    @Query("update Produto p set p.quantidade = :quantidade where p.id = :id")
    int atualizarQuantidade(@Param("id") long id, @Param("quantidade") int quantidade);
}
