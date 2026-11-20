package com.bustrackr.specification;

import com.bustrackr.entity.RoutePattern;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class RoutePatternSpecification implements Specification<RoutePattern> {

    public static Specification<RoutePattern> hasId(Long id){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"),id);
    }
    public static Specification<RoutePattern> hasRouteId(Long routeId){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("route").get("id"),routeId);
    }
    public static  Specification<RoutePattern> hasNameLike(String name){
        return (root, query, cb) ->cb.like(cb.lower(root.get("name")),"%"+name.toLowerCase()+"%");
    }
    public static  Specification<RoutePattern> hasCodeLike(String code){
        return (root, query, cb) ->cb.like(cb.lower(root.get("code")),"%"+code.toLowerCase()+"%");
    }

    public static Specification<RoutePattern> isActive(boolean b) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("active"),b);
    }

    public static Specification<RoutePattern> hasDestionationStop(Long id) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("destinationStop").get("id"),id);
    }
    public static Specification<RoutePattern> hasOriginStop(Long id) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("originStop").get("id"),id);
    }

    public static Specification<RoutePattern> hasRouteIds(List<Long> routeIds) {
        return (root, query, criteriaBuilder) -> root.get("route").get("id").in(routeIds);
    }

    @Override
    public @Nullable Predicate toPredicate(Root<RoutePattern> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
