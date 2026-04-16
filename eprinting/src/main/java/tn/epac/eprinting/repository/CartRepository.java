package tn.epac.eprinting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.epac.eprinting.model.entities.Cart;
import tn.epac.eprinting.model.entities.User;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    // Trouver le panier d'un utilisateur
    Optional<Cart> findByUser(User user);

    Optional<Cart> findByUserUserId(Integer userId);

    // Vérifier si un utilisateur a déjà un panier
    boolean existsByUserUserId(Integer userId);

    // Trouver le panier actif (sans commande associée)
    @Query("SELECT c FROM Cart c WHERE c.user.userId = :userId AND c.order IS NULL")
    Optional<Cart> findActiveCartByUserId(@Param("userId") Integer userId);

    @Query("SELECT c FROM Cart c WHERE c.cartId = :cartId AND c.order IS NULL")
    Optional<Cart> findActiveCartById(@Param("cartId") Long cartId);

    // Supprimer le panier d'un utilisateur
    void deleteByUser(User user);
}
